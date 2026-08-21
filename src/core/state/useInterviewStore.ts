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
  setFeedback: (fb: Feedback) => void;
  setError: (err: string | null) => void;
  tick: () => void;
  reset: () => void;
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
    set((s) => ({
      transcript: [
        ...s.transcript,
        {
          id: nextTranscriptId(),
          role,
          text,
          timestamp: Date.now(),
        },
      ],
    })),

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
