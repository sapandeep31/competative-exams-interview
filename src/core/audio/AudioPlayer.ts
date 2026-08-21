/**
 * AudioPlayer — gapless 24kHz Mono Float32 PCM playback queue.
 *
 * Receives base64 Float32 PCM chunks (Gemini sends audio/pcm;rate=24000).
 * Decodes them and schedules each via AudioBufferSourceNode with precise
 * startTime based on AudioContext.currentTime + a nextPlayTime cursor.
 * Maintains a queue of scheduled sources so we can stopAndClear() on barge-in.
 */

export interface AudioPlayerOptions {
  /** PCM sample rate of incoming audio chunks. Default 24000. */
  sampleRate?: number;
  /** Called with RMS (0..1) per decoded chunk — used by the visualizer. */
  onLevel?: (rms: number) => void;
  /** Called when the playback queue drains naturally. */
  onPlaybackEnd?: () => void;
}

export class AudioPlayer {
  private readonly pcmSampleRate: number;
  private readonly onLevel?: (rms: number) => void;
  private readonly onPlaybackEnd?: () => void;

  private audioContext: AudioContext | null = null;
  private nextPlayTime = 0;
  private scheduledSources: AudioBufferSourceNode[] = [];
  private playing = false;
  private lastRms = 0;

  constructor(opts: AudioPlayerOptions) {
    this.pcmSampleRate = opts.sampleRate ?? 24000;
    this.onLevel = opts.onLevel;
    this.onPlaybackEnd = opts.onPlaybackEnd;
  }

  /** Lazily create the AudioContext (must be triggered by a user gesture). */
  private async ensureContext(): Promise<AudioContext> {
    if (!this.audioContext) {
      // Create the context at the browser's default sample rate — the
      // AudioBufferSourceNode will resample our 24kHz PCM during playback.
      try {
        this.audioContext = new AudioContext();
      } catch {
        // Safari prefixes
        this.audioContext = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext)();
      }
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    return this.audioContext;
  }

  /** Decode a base64 Int16 PCM chunk (24kHz mono) and schedule it for gapless playback. */
  async enqueueChunk(base64Pcm: string): Promise<void> {
    const ctx = await this.ensureContext();

    const bytes = this.base64ToUint8Array(base64Pcm);
    if (bytes.byteLength < 2) return;

    // Gemini Live API returns raw 16-bit PCM (Int16 LE) at 24kHz.
    // Convert Int16 (-32768..32767) to normalized Float32 (-1.0..1.0).
    const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const sampleCount = Math.floor(bytes.byteLength / 2);
    if (sampleCount <= 0) return;
    const float32 = new Float32Array(sampleCount);

    let sum = 0;
    for (let i = 0; i < sampleCount; i++) {
      const int16 = dataView.getInt16(i * 2, true); // little-endian
      const sample = int16 / 32768.0;
      float32[i] = sample;
      sum += sample * sample;
    }

    const audioBuffer = ctx.createBuffer(1, sampleCount, this.pcmSampleRate);
    audioBuffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    // If nothing is queued yet or cursor fell behind, schedule from now.
    if (!this.playing || this.nextPlayTime < now) {
      this.nextPlayTime = now;
    }

    source.start(this.nextPlayTime);
    this.nextPlayTime += audioBuffer.duration;

    this.scheduledSources.push(source);
    this.playing = true;

    source.onended = () => {
      this.scheduledSources = this.scheduledSources.filter((s) => s !== source);
      if (this.scheduledSources.length === 0) {
        this.playing = false;
        this.nextPlayTime = 0;
        this.onPlaybackEnd?.();
      }
    };

    // Safe RMS for the visualizer.
    const rawRms = Math.sqrt(sum / Math.max(1, sampleCount));
    const rms = Number.isFinite(rawRms) ? Math.min(1, Math.max(0, rawRms)) : 0;
    this.lastRms = rms;
    this.onLevel?.(rms);
  }

  /** Stop everything immediately (barge-in). */
  stopAndClear(): void {
    for (const s of this.scheduledSources) {
      try {
        s.onended = null;
        s.stop();
      } catch {
        /* already stopped */
      }
      try {
        s.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.scheduledSources = [];
    this.nextPlayTime = 0;
    this.playing = false;
    this.lastRms = 0;
    this.onLevel?.(0);
  }

  private base64ToUint8Array(b64: string): Uint8Array {
    const binary = atob(b64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  getRMS(): number {
    return this.lastRms;
  }

  /** Final teardown — closes the AudioContext. */
  dispose(): void {
    this.stopAndClear();
    if (this.audioContext) {
      this.audioContext.close().catch(() => {
        /* ignore */
      });
      this.audioContext = null;
    }
  }
}
