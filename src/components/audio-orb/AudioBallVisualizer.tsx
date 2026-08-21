'use client';

import { useEffect, useRef } from 'react';
import type { AudioState } from '@/core/state/types';
import { SmoothingBuffer } from '@/core/audio/AudioAnalyser';

interface AudioBallVisualizerProps {
  state: AudioState;
  micLevel: number;
  aiLevel: number;
  size?: number;
}

interface StatePalette {
  glow: string;
  glowAlpha: string;
  orb1: string;
  orb2: string;
  ring: string;
  bars: string;
}

const PALETTES: Record<AudioState, StatePalette> = {
  idle: {
    glow: 'rgba(113, 113, 122, 0.35)',
    glowAlpha: 'rgba(113, 113, 122, 0)',
    orb1: 'rgba(228, 228, 231, 0.95)',
    orb2: 'rgba(39, 39, 42, 0.9)',
    ring: 'rgba(113, 113, 122, 0.3)',
    bars: 'rgba(161, 161, 170, 0.65)',
  },
  listening: {
    glow: 'rgba(16, 185, 129, 0.45)',
    glowAlpha: 'rgba(16, 185, 129, 0)',
    orb1: 'rgba(52, 211, 153, 0.95)',
    orb2: 'rgba(6, 78, 59, 0.9)',
    ring: 'rgba(52, 211, 153, 0.45)',
    bars: 'rgba(52, 211, 153, 0.85)',
  },
  thinking: {
    glow: 'rgba(245, 158, 11, 0.45)',
    glowAlpha: 'rgba(245, 158, 11, 0)',
    orb1: 'rgba(251, 191, 36, 0.95)',
    orb2: 'rgba(120, 53, 15, 0.9)',
    ring: 'rgba(251, 191, 36, 0.45)',
    bars: 'rgba(251, 191, 36, 0.85)',
  },
  speaking: {
    glow: 'rgba(99, 102, 241, 0.55)',
    glowAlpha: 'rgba(99, 102, 241, 0)',
    orb1: 'rgba(165, 180, 252, 0.95)',
    orb2: 'rgba(49, 46, 129, 0.9)',
    ring: 'rgba(129, 140, 248, 0.5)',
    bars: 'rgba(129, 140, 248, 0.9)',
  },
};

/**
 * Canvas 2D audio-reactive glowing orb.
 *
 * Layers (drawn back-to-front):
 *   1. Outer radial glow (blurred halo)
 *   2. Mid ripple rings (2-3 expanding circles with fading alpha)
 *   3. Inner orb (radial gradient sphere + specular highlight)
 *   4. Frequency bars arranged around the orb (driven by micLevel / aiLevel)
 *
 * State-reactive color + animation:
 *   idle      → slow breathing (sine on radius)
 *   listening → ripples driven by mic RMS (emerald/cyan)
 *   thinking  → amber pulse (radius oscillates, independent of levels)
 *   speaking  → vibrant purple/indigo reactive bars driven by aiLevel
 */
export function AudioBallVisualizer({
  state,
  micLevel,
  aiLevel,
  size = 320,
}: AudioBallVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTsRef = useRef<number>(performance.now());

  // Smooth levels so the orb doesn't jitter on every chunk.
  const micSmoother = useRef(new SmoothingBuffer(6));
  const aiSmoother = useRef(new SmoothingBuffer(6));
  const levelRef = useRef(0); // smoothed active level

  // Keep latest props in refs so the animation loop never restarts.
  const stateRef = useRef<AudioState>(state);
  const micRef = useRef<number>(micLevel);
  const aiRef = useRef<number>(aiLevel);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    micRef.current = micLevel;
    micSmoother.current.push(micLevel);
  }, [micLevel]);
  useEffect(() => {
    aiRef.current = aiLevel;
    aiSmoother.current.push(aiLevel);
  }, [aiLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High-DPI scaling.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const center = size / 2;
    const baseRadius = size * 0.18;

    // Ring state — each ripple expands from 0 to ~1 then resets.
    const ripples: { progress: number; bornAt: number; alpha: number }[] = [];
    let lastRippleAt = 0;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const draw = (now: number) => {
      const elapsed = (now - startTsRef.current) / 1000;
      const palette = PALETTES[stateRef.current];

      // Smooth the active level toward the smoothed buffer average.
      const targetLevel =
        stateRef.current === 'speaking'
          ? aiSmoother.current.average()
          : stateRef.current === 'listening'
            ? micSmoother.current.average()
            : 0;
      levelRef.current = lerp(levelRef.current, targetLevel, 0.18);

      // Clear with subtle trail for motion-blur feel.
      ctx.clearRect(0, 0, size, size);

      // --- Layer 1: outer glow ---
      const glowRadius = baseRadius * (3.2 + Math.sin(elapsed * 1.2) * 0.15);
      const glow = ctx.createRadialGradient(
        center,
        center,
        baseRadius * 0.5,
        center,
        center,
        glowRadius,
      );
      glow.addColorStop(0, palette.glow);
      glow.addColorStop(0.6, palette.glow.replace(/[\d.]+\)$/, '0.2)'));
      glow.addColorStop(1, palette.glowAlpha);
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size, size);

      // --- Layer 2: ripple rings ---
      // Spawn ripples when there's enough level.
      const spawnThreshold =
        stateRef.current === 'listening' || stateRef.current === 'speaking'
          ? 0.04
          : stateRef.current === 'thinking'
            ? 0.02
            : -1;
      if (
        (stateRef.current !== 'idle' || Math.sin(elapsed * 0.9) > 0.985) &&
        levelRef.current > spawnThreshold &&
        now - lastRippleAt > 220
      ) {
        ripples.push({ progress: 0, bornAt: now, alpha: 0.6 });
        lastRippleAt = now;
      }
      // Idle: emit a slow ripple every ~1.5s for breathing.
      if (stateRef.current === 'idle' && now - lastRippleAt > 1500) {
        ripples.push({ progress: 0, bornAt: now, alpha: 0.35 });
        lastRippleAt = now;
      }

      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.progress = Math.min(1, (now - r.bornAt) / 1400);
        r.alpha = Math.max(0, 0.55 * (1 - r.progress));
        if (r.progress >= 1) {
          ripples.splice(i, 1);
          continue;
        }
        const radius = baseRadius + r.progress * (size * 0.32);
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.strokeStyle = palette.ring.replace(
          /[\d.]+\)$/,
          `${r.alpha.toFixed(3)})`,
        );
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // --- Layer 3: inner orb ---
      // Radius pulsing depends on state.
      const currentLevel = Number.isFinite(levelRef.current)
        ? Math.max(0, Math.min(1, levelRef.current))
        : 0;
      let pulse = 0;
      if (stateRef.current === 'idle') {
        pulse = Math.sin(elapsed * 1.1) * 0.06; // breathing
      } else if (stateRef.current === 'thinking') {
        pulse = Math.sin(elapsed * 4) * 0.08 + 0.04;
      } else if (stateRef.current === 'listening') {
        pulse = currentLevel * 0.35;
      } else if (stateRef.current === 'speaking') {
        pulse = currentLevel * 0.45 + Math.sin(elapsed * 8) * 0.04;
      }
      const safePulse = Number.isFinite(pulse) ? pulse : 0;
      const orbRadius = Math.max(8, baseRadius * (1 + safePulse + 0.05));

      // Outer orb shadow (radial gradient sphere).
      const orbGrad = ctx.createRadialGradient(
        center - orbRadius * 0.3,
        center - orbRadius * 0.3,
        Math.max(0.1, orbRadius * 0.1),
        center,
        center,
        Math.max(1, orbRadius),
      );
      orbGrad.addColorStop(0, palette.orb1);
      orbGrad.addColorStop(0.55, palette.orb2);
      orbGrad.addColorStop(1, palette.orb2.replace(/[\d.]+\)$/, '0.2)'));
      ctx.beginPath();
      ctx.arc(center, center, orbRadius, 0, Math.PI * 2);
      ctx.fillStyle = orbGrad;
      ctx.fill();

      // Specular highlight.
      const hi = ctx.createRadialGradient(
        center - orbRadius * 0.35,
        center - orbRadius * 0.4,
        0,
        center - orbRadius * 0.35,
        center - orbRadius * 0.4,
        Math.max(0.1, orbRadius * 0.7),
      );
      hi.addColorStop(0, 'rgba(255,255,255,0.45)');
      hi.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(center, center, orbRadius, 0, Math.PI * 2);
      ctx.fillStyle = hi;
      ctx.fill();

      // --- Layer 4: frequency bars around the orb ---
      const barCount = 48;
      const barInner = orbRadius + 8;
      const barMaxLen = size * 0.12;
      for (let i = 0; i < barCount; i++) {
        const angle = (i / barCount) * Math.PI * 2;
        // Pseudo-frequency: use sin combination for organic motion.
        const freq =
          stateRef.current === 'idle'
            ? 0.15 + 0.05 * Math.sin(elapsed * 1.5 + i * 0.4)
            : stateRef.current === 'thinking'
              ? 0.25 + 0.2 * Math.abs(Math.sin(elapsed * 3 + i * 0.5))
              : 0.15 +
                levelRef.current *
                  (0.6 + 0.4 * Math.abs(Math.sin(elapsed * 6 + i * 0.7)));
        const len = Math.max(2, freq * barMaxLen);
        const x1 = center + Math.cos(angle) * barInner;
        const y1 = center + Math.sin(angle) * barInner;
        const x2 = center + Math.cos(angle) * (barInner + len);
        const y2 = center + Math.sin(angle) * (barInner + len);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = palette.bars.replace(
          /[\d.]+\)$/,
          `${(0.35 + freq * 0.65).toFixed(3)})`,
        );
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [size]);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="block" />
      <span className="sr-only">
        Audio visualizer currently {state}
      </span>
    </div>
  );
}
