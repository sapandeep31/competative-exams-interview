'use client';

import { create } from 'zustand';
import type {
  AudioState,
  Feedback,
  InterviewConfig,
  Phase,
  TranscriptEntry,
} from './types';

let transcriptSeq = 0;
const nextTranscriptId = () => `t-${Date.now()}-${++transcriptSeq}`;

interface InterviewState {
  // Phase machine.
  phase: Phase;
  config: InterviewConfig | null;

  // Live session state.
  audioState: AudioState;
  micLevel: number;
  aiLevel: number;
  isMuted: boolean;
  elapsedSeconds: number;

  // Data.
  transcript: TranscriptEntry[];
  feedback: Feedback | null;

  // Error surface.
  error: string | null;

  // Actions.
  setConfig: (config: InterviewConfig) => void;
  setPhase: (phase: Phase) => void;
  setAudioState: (state: AudioState) => void;
  setMicLevel: (level: number) => void;
  setAiLevel: (level: number) => void;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  addTranscript: (role: TranscriptEntry['role'], text: string) => void;
  appendTranscript: (role: TranscriptEntry['role'], text: string) => void;
  setFeedback: (fb: Feedback) => void;
  setError: (err: string | null) => void;
  tick: () => void;
  reset: () => void;
}

function combineTranscriptText(existing: string, incoming: string): string {
  const ex = existing.trim();
  const inc = incoming.trim();
  if (!ex) return inc;
  if (!inc) return ex;
  if (/^[.,!?;:]/.test(inc)) {
    return `${ex}${inc}`.replace(/\s+/g, ' ');
  }
  return `${ex} ${inc}`.replace(/\s+/g, ' ').replace(/\s+([.,!?;:])/g, '$1');
}

export const useInterviewStore = create<InterviewState>((set) => ({
  phase: 'setup',
  config: null,

  audioState: 'idle',
  micLevel: 0,
  aiLevel: 0,
  isMuted: false,
  elapsedSeconds: 0,

  transcript: [],
  feedback: null,

  error: null,

  setConfig: (config) => set({ config }),
  setPhase: (phase) => set({ phase }),
  setAudioState: (audioState) => set({ audioState }),
  setMicLevel: (micLevel) => set({ micLevel }),
  setAiLevel: (aiLevel) => set({ aiLevel }),
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  setMuted: (muted) => set({ isMuted: muted }),

  addTranscript: (role, text) =>
    set((s) => {
      const clean = text.trim();
      if (!clean) return s;
      return {
        transcript: [
          ...s.transcript,
          {
            id: nextTranscriptId(),
            role,
            text: clean,
            timestamp: Date.now(),
          },
        ],
      };
    }),

  appendTranscript: (role, text) =>
    set((s) => {
      const clean = text.trim();
      if (!clean) return s;
      const last = s.transcript[s.transcript.length - 1];
      if (last && last.role === role) {
        const updated = combineTranscriptText(last.text, clean);
        return {
          transcript: [
            ...s.transcript.slice(0, -1),
            {
              ...last,
              text: updated,
            },
          ],
        };
      }
      return {
        transcript: [
          ...s.transcript,
          {
            id: nextTranscriptId(),
            role,
            text: clean,
            timestamp: Date.now(),
          },
        ],
      };
    }),

  setFeedback: (feedback) => set({ feedback }),
  setError: (error) => set({ error }),
  tick: () => set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 })),

  reset: () =>
    set({
      phase: 'setup',
      config: null,
      audioState: 'idle',
      micLevel: 0,
      aiLevel: 0,
      isMuted: false,
      elapsedSeconds: 0,
      transcript: [],
      feedback: null,
      error: null,
    }),
}));
