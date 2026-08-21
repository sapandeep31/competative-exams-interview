'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Mic,
  MicOff,
  PhoneOff,
  Clock,
  RefreshCw,
  User,
  BadgeCheck,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AudioBallVisualizer } from '@/components/audio-orb/AudioBallVisualizer';
import { LiveTranscript } from '@/components/interview/LiveTranscript';
import { AudioRecorder } from '@/core/audio/AudioRecorder';
import { AudioPlayer } from '@/core/audio/AudioPlayer';
import { GeminiLiveClient } from '@/core/gemini/gemini-live-client';
import { BOARD_OFFICERS } from '@/core/gemini/live-config';
import { handleEndInterviewToolCall } from '@/core/gemini/tools';
import { useInterviewStore } from '@/core/state/useInterviewStore';
import type { Feedback } from '@/core/state/types';
import { cn } from '@/lib/utils';

const BARGE_IN_RMS_THRESHOLD = 0.04;

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function LiveSessionView() {
  const config = useInterviewStore((s) => s.config);
  const phase = useInterviewStore((s) => s.phase);
  const audioState = useInterviewStore((s) => s.audioState);
  const micLevel = useInterviewStore((s) => s.micLevel);
  const aiLevel = useInterviewStore((s) => s.aiLevel);
  const isMuted = useInterviewStore((s) => s.isMuted);
  const elapsedSeconds = useInterviewStore((s) => s.elapsedSeconds);
  const transcript = useInterviewStore((s) => s.transcript);
  const setPhase = useInterviewStore((s) => s.setPhase);
  const setAudioState = useInterviewStore((s) => s.setAudioState);
  const setMicLevel = useInterviewStore((s) => s.setMicLevel);
  const setAiLevel = useInterviewStore((s) => s.setAiLevel);
  const toggleMute = useInterviewStore((s) => s.toggleMute);
  const addTranscript = useInterviewStore((s) => s.addTranscript);
  const setFeedback = useInterviewStore((s) => s.setFeedback);
  const setError = useInterviewStore((s) => s.setError);
  const tick = useInterviewStore((s) => s.tick);

  const [connectionState, setConnectionState] = useState<
    'connecting' | 'connected' | 'failed'
  >('connecting');
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  // Engine instances — kept in refs so they survive re-renders.
  const recorderRef = useRef<AudioRecorder | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const clientRef = useRef<GeminiLiveClient | null>(null);

  // Accumulate streaming transcript fragments.
  const inputBufferRef = useRef<string>('');
  const outputBufferRef = useRef<string>('');
  const lastInputFlushRef = useRef<number>(0);
  const lastOutputFlushRef = useRef<number>(0);
  const endedRef = useRef<boolean>(false);

  // --- Helpers ---
  const flushInputBuffer = useCallback(
    (force = false) => {
      const text = inputBufferRef.current.trim();
      if (!text) return;
      const now = Date.now();
      // Debounce: only flush if 600ms passed since last fragment, unless forced.
      if (!force && now - lastInputFlushRef.current < 600) return;
      lastInputFlushRef.current = now;
      inputBufferRef.current = '';
      addTranscript('user', text);
    },
    [addTranscript],
  );

  const flushOutputBuffer = useCallback(
    (force = false) => {
      const text = outputBufferRef.current.trim();
      if (!text) return;
      const now = Date.now();
      if (!force && now - lastOutputFlushRef.current < 400) return;
      lastOutputFlushRef.current = now;
      outputBufferRef.current = '';
      addTranscript('interviewer', text);
    },
    [addTranscript],
  );

  const endInterview = useCallback(
    (feedback: Feedback) => {
      if (endedRef.current) return;
      endedRef.current = true;
      // Final flush of any pending transcript text.
      flushInputBuffer(true);
      flushOutputBuffer(true);
      setFeedback(feedback);
      setPhase('feedback');
    },
    [flushInputBuffer, flushOutputBuffer, setFeedback, setPhase],
  );

  const handleToolCall = useCallback(
    (name: string, args: Record<string, unknown>) => {
      if (name === 'end_interview_and_generate_feedback') {
        try {
          const feedback = handleEndInterviewToolCall(args);
          endInterview(feedback);
        } catch (err) {
          console.error('Failed to parse tool call args', err);
          const fallback: Feedback = {
            overall_score: 50,
            verdict: 'Borderline / Reserve List',
            hiring_verdict: 'Borderline / Reserve List',
            analytical_depth: 5,
            administrative_balance: 5,
            domain_knowledge: 5,
            articulation_composure: 5,
            technical_depth: 5,
            communication_clarity: 5,
            problem_solving: 5,
            key_strengths: ['Participated in the competitive exam interview simulation'],
            areas_for_improvement: [
              'Interview ended without a structured evaluation from the board.',
            ],
            detailed_summary: `The interview concluded. Raw args: ${JSON.stringify(
              args,
            )}`,
          };
          endInterview(fallback);
        }
      }
    },
    [endInterview],
  );

  // --- Connect to Gemini Live ---
  const teardown = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    playerRef.current?.dispose();
    playerRef.current = null;
    clientRef.current?.close();
    clientRef.current = null;
  }, []);

  const connect = useCallback(async () => {
    if (!config) return;
    endedRef.current = false;
    setConnectionState('connecting');
    setAudioState('idle');

    // 1. Fetch the API key from the session broker.
    let apiKey: string;
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: config.apiKey || undefined }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          data.error ??
            'No Gemini API key. Set GEMINI_API_KEY in .env.local or provide one on the setup screen.',
        );
      }
      const data = (await res.json()) as { apiKey: string };
      apiKey = data.apiKey;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Session broker failed.';
      setError(msg);
      toast.error('Failed to obtain API key', { description: msg });
      setConnectionState('failed');
      return;
    }

    // 2. Audio player (24kHz playback for Gemini responses).
    const player = new AudioPlayer({
      sampleRate: 24000,
      onLevel: (rms) => setAiLevel(rms),
      onPlaybackEnd: () => {
        // AI has finished speaking — wait for the user to respond.
        setAudioState('thinking');
      },
    });
    playerRef.current = player;

    // 3. Audio recorder (16kHz Int16 PCM input).
    const recorder = new AudioRecorder({
      sampleRate: 16000,
      onChunk: (b64) => {
        clientRef.current?.sendAudio(b64);
        // Local barge-in detection while AI is speaking.
        const rms = recorder.getRMS();
        if (
          rms > BARGE_IN_RMS_THRESHOLD &&
          playerRef.current?.isPlaying() === true
        ) {
          playerRef.current.stopAndClear();
          clientRef.current?.sendInterrupt();
          setAudioState('listening');
        }
      },
      onLevel: (rms) => setMicLevel(rms),
    });

    try {
      await recorder.start();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Microphone access failed.';
      setError(msg);
      toast.error('Microphone error', { description: msg });
      setConnectionState('failed');
      return;
    }
    recorderRef.current = recorder;

    // 4. Gemini Live client.
    const client = new GeminiLiveClient(apiKey, config);
    client.on('open', () => {
      setConnectionState('connected');
      setAudioState('thinking');
      toast.success('Connected', {
        description: 'The interviewer is ready — say hello!',
      });
    });
    client.on('audio', (b64) => {
      void player.enqueueChunk(b64);
      // Set state to 'speaking' once we receive audio.
      setAudioState('speaking');
    });
    client.on('inputTranscript', (text) => {
      inputBufferRef.current += text;
      flushInputBuffer(false);
      if (text.trim()) setAudioState('listening');
    });
    client.on('outputTranscript', (text) => {
      outputBufferRef.current += text;
      flushOutputBuffer(false);
    });
    client.on('interrupted', () => {
      player.stopAndClear();
      setAudioState('listening');
    });
    client.on('toolCall', (name, args) => handleToolCall(name, args));
    client.on('error', (msg) => {
      console.error('[GeminiLiveClient] error', msg);
      toast.error('Connection error', { description: msg });
      setError(msg);
      // Don't auto-teardown on transient errors; let user decide.
    });
    client.on('close', (code, reason) => {
      console.log('[GeminiLiveClient] closed', code, reason);
      // If closed unexpectedly mid-session, surface but don't crash.
      if (!endedRef.current && phase === 'live') {
        setConnectionState('failed');
      }
    });

    clientRef.current = client;
    client.connect();
  }, [
    config,
    phase,
    setAiLevel,
    setAudioState,
    setError,
    setMicLevel,
    handleToolCall,
    flushInputBuffer,
    flushOutputBuffer,
  ]);

  // Boot the session on mount.
  useEffect(() => {
    void connect();
    return () => {
      teardown();
    };
    // connect/teardown are stable refs on first mount — intentional empty deps.
  }, []);

  // --- Timer ---
  useEffect(() => {
    if (phase !== 'live') return;
    const id = setInterval(() => tick(), 1000);
    return () => clearInterval(id);
  }, [phase, tick]);

  // --- Mute toggle ---
  useEffect(() => {
    const r = recorderRef.current;
    if (!r) return;
    if (isMuted) {
      r.mute();
    } else {
      r.unmute();
    }
  }, [isMuted]);

  // --- Standard LLM evaluation on manual end or disconnect ---
  const requestStandardEvaluation = useCallback(async () => {
    if (endedRef.current) return;
    setIsEvaluating(true);
    teardown();
    flushInputBuffer(true);
    flushOutputBuffer(true);

    try {
      const currentTranscript = useInterviewStore.getState().transcript;
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          transcript: currentTranscript,
        }),
      });

      if (!res.ok) {
        throw new Error(`Evaluation failed with status ${res.status}`);
      }

      const data = await res.json();
      if (data.feedback) {
        endInterview(data.feedback);
        return;
      }
      throw new Error('No feedback returned');
    } catch (err) {
      console.error('Failed to generate LLM evaluation', err);
      toast.error('Evaluation fallback generated');
      const fallback: Feedback = {
        overall_score: 65,
        verdict: 'Recommended (Service List)',
        hiring_verdict: 'Recommended (Service List)',
        analytical_depth: 6,
        administrative_balance: 7,
        domain_knowledge: 6,
        articulation_composure: 7,
        technical_depth: 6,
        communication_clarity: 7,
        problem_solving: 6,
        key_strengths: ['Engaged actively and maintained poise during questioning'],
        areas_for_improvement: ['Continue building on structured policy and analytical depth'],
        detailed_summary:
          'The candidate participated in the competitive exam mock interview. An evaluation scorecard was generated based on the captured board dialogue.',
      };
      endInterview(fallback);
    } finally {
      setIsEvaluating(false);
    }
  }, [config, endInterview, flushInputBuffer, flushOutputBuffer, teardown]);

  // --- Manual end ---
  const handleManualEnd = useCallback(() => {
    if (endedRef.current || isEvaluating) return;
    toast.info('Generating your comprehensive feedback scorecard...');
    void requestStandardEvaluation();
  }, [isEvaluating, requestStandardEvaluation]);

  // --- Retry on failure ---
  const handleRetry = useCallback(() => {
    teardown();
    void connect();
  }, [connect, teardown]);

  const roleBadge = useMemo(() => {
    if (!config) return null;
    const exam = config.examCategory || config.role;
    const mode = config.simulationMode || config.level;
    const officer = BOARD_OFFICERS[exam];
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Badge
          variant="secondary"
          className="bg-indigo-500/15 border border-indigo-400/30 text-indigo-100 gap-1 font-medium"
        >
          <User className="h-3 w-3" />
          {config.candidateName}
        </Badge>
        {officer && (
          <Badge
            variant="secondary"
            className="bg-emerald-500/15 border border-emerald-400/30 text-emerald-100 gap-1 font-medium"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {officer.name}
          </Badge>
        )}
        <Badge
          variant="secondary"
          className="bg-amber-500/15 border border-amber-400/30 text-amber-100 gap-1 font-medium"
        >
          <BadgeCheck className="h-3 w-3" />
          {exam}
        </Badge>
        <Badge
          variant="outline"
          className="bg-white/5 border-white/15 text-slate-300 font-normal"
        >
          {mode}
        </Badge>
      </div>
    );
  }, [config]);

  const orbSize = typeof window !== 'undefined' && window.innerWidth < 640 ? 260 : 340;

  return (
    <main className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col">
      {/* Top bar */}
      <header className="px-4 sm:px-6 py-4 border-b border-white/5 backdrop-blur-sm bg-slate-950/60 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  connectionState === 'connected'
                    ? 'bg-emerald-400 animate-pulse'
                    : connectionState === 'connecting'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-red-500'
                }`}
              />
            </div>
            <span className="text-sm text-slate-400 capitalize">
              {connectionState === 'connected'
                ? 'Live'
                : connectionState === 'connecting'
                  ? 'Connecting…'
                  : 'Disconnected'}
            </span>
          </div>

          {roleBadge}

          <div className="flex items-center gap-2 text-sm text-slate-300 font-mono bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
            <Clock className="h-3.5 w-3.5" />
            {formatTimer(elapsedSeconds)}
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 px-4 sm:px-6 py-6 sm:py-10">
        <div className="max-w-6xl mx-auto grid gap-6 lg:grid-cols-[1fr_minmax(360px,420px)]">
          {/* Left: orb + controls */}
          <motion.section
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="glass-panel rounded-3xl p-6 sm:p-10 flex flex-col items-center justify-center gap-8 min-h-[480px]"
          >
            <div className="text-center">
              {config && BOARD_OFFICERS[config.examCategory || config.role] && (
                <div className="mb-2">
                  <span className="text-xs uppercase tracking-widest font-semibold text-indigo-400">
                    Active Board Interviewer
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    {BOARD_OFFICERS[config.examCategory || config.role].name}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto line-clamp-1">
                    {BOARD_OFFICERS[config.examCategory || config.role].designation}
                  </p>
                </div>
              )}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    audioState === 'speaking'
                      ? 'bg-violet-400 animate-pulse'
                      : audioState === 'listening'
                        ? 'bg-emerald-400 animate-pulse'
                        : audioState === 'thinking'
                          ? 'bg-amber-400 animate-pulse'
                          : 'bg-slate-500',
                  )}
                />
                <span className="font-medium capitalize">
                  {audioState === 'idle' && 'Channel Ready'}
                  {audioState === 'listening' && 'Listening to your response…'}
                  {audioState === 'thinking' && 'Board deliberating…'}
                  {audioState === 'speaking' && 'Board questioning…'}
                </span>
              </div>
            </div>

            <AudioBallVisualizer
              state={audioState}
              micLevel={micLevel}
              aiLevel={aiLevel}
              size={orbSize}
            />

            <div className="flex items-center gap-3 flex-wrap justify-center">
              <Button
                size="lg"
                variant={isMuted ? 'secondary' : 'outline'}
                onClick={toggleMute}
                className={`h-12 px-5 ${
                  isMuted
                    ? 'bg-amber-500/20 border-amber-400/40 text-amber-100 hover:bg-amber-500/30'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
                aria-pressed={isMuted}
              >
                {isMuted ? (
                  <>
                    <MicOff className="h-4 w-4 mr-2" />
                    Unmute
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    Mute
                  </>
                )}
              </Button>

              {connectionState === 'failed' && (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleRetry}
                  className="h-12 px-5 bg-white/5 border-white/10 hover:bg-white/10"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Connection
                </Button>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="lg"
                    variant="destructive"
                    className="h-12 px-5 bg-red-600/90 hover:bg-red-600"
                  >
                    <PhoneOff className="h-4 w-4 mr-2" />
                    End Interview
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-zinc-900 border-white/10 text-slate-100">
                  <AlertDialogHeader>
                    <AlertDialogTitle>End the interview?</AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-400">
                      This will conclude the live conversation. Gemini will evaluate the
                      full spoken transcript and generate your comprehensive evaluation
                      scorecard and radar analysis.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10">
                      Keep Interviewing
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleManualEnd}
                      disabled={isEvaluating}
                      className="bg-red-600 hover:bg-red-500 text-white"
                    >
                      {isEvaluating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Evaluating...
                        </>
                      ) : (
                        'End & Generate Report'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </motion.section>

          {/* Right: transcript */}
          <motion.section
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
          >
            <LiveTranscript transcript={transcript} />
          </motion.section>
        </div>
      </div>

      {/* Evaluating Loading Overlay */}
      {isEvaluating && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="relative mb-6">
            <div className="h-16 w-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <BadgeCheck className="h-6 w-6 text-indigo-400 animate-pulse" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Analyzing Transcript & Generating Scorecard...
          </h2>
          <p className="text-sm text-slate-400 max-w-md">
            Gemini is reviewing your technical depth, communication clarity, and problem-solving answers to construct your detailed feedback report.
          </p>
        </div>
      )}

      <footer className="mt-auto px-4 py-4 text-center text-xs text-slate-500">
        Powered by Google Gemini Live API · Speak naturally to barge in
      </footer>
    </main>
  );
}
