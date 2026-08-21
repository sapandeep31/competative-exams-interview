/**
 * AudioRecorder — 16kHz Mono Int16 PCM capture with base64 streaming.
 *
 * Uses getUserMedia + AudioContext + ScriptProcessorNode.
 * Downsamples the browser's native sample rate (typically 44.1/48 kHz) to 16 kHz.
 * Converts Float32 samples → Int16 PCM → base64.
 * Computes RMS per chunk for the visualizer / barge-in detection.
 */

export interface AudioRecorderOptions {
  /** Target sample rate for the output PCM stream. Default 16000. */
  sampleRate?: number;
  /** Called with each base64-encoded PCM chunk. */
  onChunk: (base64Pcm: string) => void;
  /** Called with the current RMS (0..1) of the captured audio. */
  onLevel: (rms: number) => void;
}

export class AudioRecorder {
  private readonly targetSampleRate: number;
  private readonly onChunk: (b64: string) => void;
  private readonly onLevel: (rms: number) => void;

  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;

  private muted = false;
  private lastRms = 0;
  private running = false;

  constructor(opts: AudioRecorderOptions) {
    this.targetSampleRate = opts.sampleRate ?? 16000;
    this.onChunk = opts.onChunk;
    this.onLevel = opts.onLevel;
  }

  /** Request mic access and start streaming chunks. */
  async start(): Promise<void> {
    if (this.running) return;
    try {
      this.audioContext = new AudioContext({ sampleRate: this.targetSampleRate });
    } catch {
      // Browsers that reject non-native rates fall back to the default.
      this.audioContext = new AudioContext();
    }
    // Some browsers ignore the requested sampleRate; we always downsample to be safe.
    await this.audioContext.resume();

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });

    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

    // 4096-sample buffer — works well at all common rates.
    this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.processorNode.onaudioprocess = (e) => this.handleAudioProcess(e);

    this.sourceNode.connect(this.processorNode);
    // ScriptProcessor requires a destination connection to fire onaudioprocess,
    // but we don't want mic audio echoing through the speakers. Route through
    // a zero-gain GainNode so the node fires without producing audible output.
    const muteGain = this.audioContext.createGain();
    muteGain.gain.value = 0;
    this.processorNode.connect(muteGain);
    muteGain.connect(this.audioContext.destination);

    this.running = true;
  }

  private handleAudioProcess(e: AudioProcessingEvent) {
    const input = e.inputBuffer.getChannelData(0);
    const ctxSampleRate = this.audioContext?.sampleRate ?? this.targetSampleRate;

    // Downsample from ctxSampleRate → targetSampleRate if needed.
    const ratio = ctxSampleRate / this.targetSampleRate;
    let downsampled: Float32Array;
    if (Math.abs(ratio - 1) < 1e-6) {
      downsampled = new Float32Array(input);
    } else {
      const outLen = Math.max(1, Math.floor(input.length / ratio));
      downsampled = new Float32Array(outLen);
      // Linear interpolation downsampling.
      for (let i = 0; i < outLen; i++) {
        const srcIdx = i * ratio;
        const i0 = Math.floor(srcIdx);
        const i1 = Math.min(i0 + 1, input.length - 1);
        const frac = srcIdx - i0;
        downsampled[i] = input[i0] * (1 - frac) + input[i1] * frac;
      }
    }

    // Compute RMS (skip if muted so visualizer goes to baseline).
    let sum = 0;
    for (let i = 0; i < downsampled.length; i++) {
      const s = downsampled[i];
      sum += s * s;
    }
    const rms = Math.sqrt(sum / downsampled.length);
    this.lastRms = this.muted ? 0 : Math.min(1, rms);
    this.onLevel(this.lastRms);

    // If muted, send silence (keeps Gemini's VAD warm but prevents user audio leaking).
    const buffer = this.muted ? new Float32Array(downsampled.length) : downsampled;
    const base64 = this.float32ToInt16Base64(buffer);
    this.onChunk(base64);
  }

  private float32ToInt16Base64(float32: Float32Array): string {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const clamped = Math.max(-1, Math.min(1, float32[i]));
      // Convert to signed 16-bit PCM.
      int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    }
    // Reinterpret as bytes for base64 encoding.
    const bytes = new Uint8Array(int16.buffer);
    // Chunk to avoid call-stack overflow on large arrays.
    let binary = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      const slice = bytes.subarray(i, Math.min(i + CHUNK, bytes.length));
      binary += String.fromCharCode.apply(null, slice as unknown as number[]);
    }
    return btoa(binary);
  }

  mute(): void {
    this.muted = true;
    this.lastRms = 0;
    this.onLevel(0);
  }

  unmute(): void {
    this.muted = false;
  }

  isMuted(): boolean {
    return this.muted;
  }

  getRMS(): number {
    return this.lastRms;
  }

  isRunning(): boolean {
    return this.running;
  }

  /** Tear down everything and release the mic. */
  stop(): void {
    this.running = false;
    try {
      this.processorNode?.disconnect();
    } catch {
      /* ignore */
    }
    try {
      this.sourceNode?.disconnect();
    } catch {
      /* ignore */
    }
    this.processorNode = null;
    this.sourceNode = null;

    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.mediaStream = null;

    if (this.audioContext) {
      this.audioContext.close().catch(() => {
        /* ignore */
      });
      this.audioContext = null;
    }
    this.lastRms = 0;
  }
}
