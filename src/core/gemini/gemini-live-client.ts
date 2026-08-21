import type {
  GeminiServerMessage,
  InterviewConfig,
} from '@/core/state/types';
import {
  DEFAULT_MODEL,
  GEMINI_LIVE_ENDPOINT,
  buildGenerationConfig,
  buildSystemInstruction,
} from './live-config';
import { END_INTERVIEW_TOOL } from './tools';

export interface GeminiLiveClientEvents {
  open: () => void;
  audio: (base64Pcm: string) => void;
  inputTranscript: (text: string) => void;
  outputTranscript: (text: string) => void;
  interrupted: () => void;
  toolCall: (name: string, args: Record<string, unknown>) => void;
  error: (message: string) => void;
  close: (code: number, reason: string) => void;
}

type Handler<K extends keyof GeminiLiveClientEvents> = GeminiLiveClientEvents[K];

/**
 * Thin WebSocket wrapper around the Gemini Live API.
 *
 * Lifecycle:
 *   1. `connect()` opens the WS, then sends the `setup` message.
 *   2. Once `setupComplete` arrives, the `open` event fires and audio can stream.
 *   3. `sendAudio(b64)` streams input chunks.
 *   4. `sendInterrupt()` signals a barge-in.
 *   5. `close()` terminates the session.
 */
export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private readonly apiKey: string;
  private readonly config: InterviewConfig;
  private readonly handlers: {
    [K in keyof GeminiLiveClientEvents]?: Handler<K>[];
  } = {};

  private setupAcknowledged = false;
  private closed = false;

  constructor(apiKey: string, config: InterviewConfig) {
    this.apiKey = apiKey;
    this.config = config;
  }

  on<K extends keyof GeminiLiveClientEvents>(
    event: K,
    handler: Handler<K>,
  ): void {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    (this.handlers[event] as Handler<K>[]).push(handler);
  }

  private emit<K extends keyof GeminiLiveClientEvents>(
    event: K,
    ...args: Parameters<Handler<K>>
  ): void {
    const list = this.handlers[event] as Handler<K>[] | undefined;
    if (!list) return;
    for (const h of list) {
      try {
        (h as (...a: Parameters<Handler<K>>) => void)(...args);
      } catch (err) {
        console.error(`[GeminiLiveClient] handler for "${String(event)}" threw`, err);
      }
    }
  }

  /** Open the WebSocket and send the setup message. */
  connect(): void {
    if (this.ws) return;
    const url = `${GEMINI_LIVE_ENDPOINT}?key=${encodeURIComponent(this.apiKey)}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.sendSetup();
    };

    this.ws.onmessage = (ev) => {
      void this.handleMessage(ev);
    };

    this.ws.onerror = () => {
      this.emit('error', 'WebSocket connection error.');
    };

    this.ws.onclose = (ev) => {
      if (!this.closed) {
        // If we never got setupComplete, surface an error so the UI can recover.
        if (!this.setupAcknowledged) {
          this.emit(
            'error',
            `Connection closed before setup completed (code ${ev.code}). Check your API key and network.`,
          );
        }
      }
      this.emit('close', ev.code, ev.reason || 'closed');
    };
  }

  private sendSetup(): void {
    const systemInstruction = buildSystemInstruction(
      this.config.candidateName,
      this.config.examCategory ?? this.config.role,
      this.config.simulationMode ?? this.config.level,
      this.config.background,
    );

    const setupMessage = {
      setup: {
        model: DEFAULT_MODEL,
        generation_config: buildGenerationConfig(
          this.config.examCategory ?? this.config.role,
        ),
        system_instruction: {
          parts: [{ text: systemInstruction }],
        },
        tools: [END_INTERVIEW_TOOL],
      },
    };
    this.sendRaw(setupMessage);
  }

  private async handleMessage(ev: MessageEvent): Promise<void> {
    let payload: string | ArrayBuffer;
    if (ev.data instanceof Blob) {
      payload = await ev.data.text();
    } else if (ev.data instanceof ArrayBuffer) {
      payload = new TextDecoder().decode(ev.data);
    } else {
      payload = String(ev.data);
    }

    let msg: GeminiServerMessage;
    try {
      msg = JSON.parse(payload) as GeminiServerMessage;
    } catch {
      // Some binary frames might arrive; ignore them.
      return;
    }

    if (msg.setupComplete) {
      this.setupAcknowledged = true;
      this.emit('open');
      return;
    }

    if (msg.error) {
      this.emit('error', msg.error.message ?? 'Unknown server error.');
      return;
    }

    if (msg.toolCall?.functionCalls?.length) {
      for (const fc of msg.toolCall.functionCalls) {
        if (fc.name) {
          this.emit('toolCall', fc.name, fc.args ?? {});
        }
      }
      return;
    }

    const sc = msg.serverContent;
    if (!sc) return;

    if (sc.interrupted) {
      this.emit('interrupted');
      return;
    }

    if (sc.inputTranscription?.text) {
      this.emit('inputTranscript', sc.inputTranscription.text);
    }
    if (sc.outputTranscription?.text) {
      this.emit('outputTranscript', sc.outputTranscription.text);
    }

    if (sc.modelTurn?.parts?.length) {
      for (const part of sc.modelTurn.parts) {
        const inline = part.inlineData;
        if (inline?.data) {
          this.emit('audio', inline.data);
        }
      }
    }
    // turnComplete is informational; the player's onPlaybackEnd handles state transitions.
  }

  /** Stream a base64 Int16 PCM chunk to the server. */
  sendAudio(base64Pcm: string): void {
    if (!this.setupAcknowledged || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    this.sendRaw({
      realtime_input: {
        audio: {
          mime_type: 'audio/pcm;rate=16000',
          data: base64Pcm,
        },
      },
    });
  }

  /** Stream a base64 JPEG video frame to the server (1 FPS vision context). */
  sendVideo(base64Jpeg: string): void {
    if (!this.setupAcknowledged || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    this.sendRaw({
      realtime_input: {
        video: {
          mime_type: 'image/jpeg',
          data: base64Jpeg,
        },
      },
    });
  }

  /** Signal a barge-in (user started speaking while AI was talking). */
  sendInterrupt(): void {
    // Gemini Live detects interruption organically from PCM audio chunks.
    this.emit('interrupted');
  }

  private sendRaw(obj: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify(obj));
    } catch (err) {
      console.error('[GeminiLiveClient] send failed', err);
    }
  }

  isReady(): boolean {
    return this.setupAcknowledged && this.ws?.readyState === WebSocket.OPEN;
  }

  close(): void {
    this.closed = true;
    if (this.ws) {
      try {
        // Try a graceful close — server may send final toolCall first.
        this.ws.close(1000, 'client closed');
      } catch {
        /* ignore */
      }
      this.ws = null;
    }
  }
}
