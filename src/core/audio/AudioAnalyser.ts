/**
 * AudioAnalyser — lightweight RMS / level smoothing helper.
 *
 * In this project, RMS is computed inline inside the recorder & player for
 * performance (avoids an extra AnalyserNode hop). This class provides a small
 * smoothing utility so the visualizer doesn't jitter on every chunk.
 */

export class SmoothingBuffer {
  private values: number[] = [];
  private readonly capacity: number;

  constructor(capacity = 8) {
    this.capacity = Math.max(1, capacity);
  }

  push(v: number): void {
    this.values.push(v);
    if (this.values.length > this.capacity) this.values.shift();
  }

  /** Linear average of the buffered values. */
  average(): number {
    if (this.values.length === 0) return 0;
    let sum = 0;
    for (const v of this.values) sum += v;
    return sum / this.values.length;
  }

  /** Lerp smoothing toward `target` by factor `alpha` (0..1). */
  static lerp(current: number, target: number, alpha: number): number {
    return current + (target - current) * alpha;
  }

  clear(): void {
    this.values = [];
  }
}

/**
 * Convenience: compute a smoothed 0..1 level using a leaky integrator.
 * Decay rate controls how fast the level falls back to baseline.
 */
export class LevelSmoother {
  private value = 0;
  constructor(private readonly attack = 0.4, private readonly decay = 0.08) {}

  push(instant: number): number {
    const a = instant > this.value ? this.attack : this.decay;
    this.value = this.value + (instant - this.value) * a;
    return this.value;
  }

  get(): number {
    return this.value;
  }

  reset(): void {
    this.value = 0;
  }
}
