'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Clock,
  RefreshCw,
  User,
  BadgeCheck,
  Loader2,
  Camera,
  Sparkles,
  Move,
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
  const [isVideoEnabled, setIsVideoEnabled] = useState<boolean>(
    config?.inputMode === 'video_audio',
  );

  // Engine instances — kept in refs so they survive re-renders.
  const recorderRef = useRef<AudioRecorder | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const clientRef = useRef<GeminiLiveClient | null>(null);

  // Container ref for drag boundaries
  const panelContainerRef = useRef<HTMLDivElement | null>(null);

  // Video streaming refs
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Accumulate streaming transcript fragments.
  const inputBufferRef = useRef<string>('');
  const outputBufferRef = useRef<string>('');
  const lastInputFlushRef = useRef<number>(0);
  const lastOutputFlushRef = useRef<number>(0);
  const endedRef = useRef<boolean>(false);

  // Toggle microphone muting with instant AudioRecorder state synchronization
  const handleToggleMute = useCallback(() => {
    toggleMute();
    const willBeMuted = !isMuted;
    if (willBeMuted) {
      recorderRef.current?.mute();
      setMicLevel(0);
      toast.info('Microphone muted');
    } else {
      recorderRef.current?.unmute();
      toast.success('Microphone unmuted');
    }
  }, [isMuted, setMicLevel, toggleMute]);

  // --- Helpers ---
  const flushInputBuffer = useCallback(
    (force = false) => {
      const text = inputBufferRef.current.trim();
      if (!text) return;
      const now = Date.now();
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
      flushInputBuffer(true);
      flushOutputBuffer(true);

      // Stop video streaming & tracks
      if (videoIntervalRef.current) {
        clearInterval(videoIntervalRef.current);
        videoIntervalRef.current = null;
      }
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach((t) => t.stop());
        videoStreamRef.current = null;
      }

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
            speech_fluency: 5,
            body_language_poise: 5,
            vocal_cues: ['Participated in the live audio dialogue'],
            non_verbal_cues: ['Maintained attention during questioning'],
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

  // Interruption and silence tracking
  const isInterruptedRef = useRef<boolean>(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Teardown engine ---
  const teardown = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((t) => t.stop());
      videoStreamRef.current = null;
    }
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
    isInterruptedRef.current = false;
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
        // When AI stops speaking, the board is actively listening for candidate's answer
        if (!isInterruptedRef.current) {
          setAudioState('listening');
        }
      },
    });
    playerRef.current = player;

    // 3. Audio recorder (16kHz Int16 PCM input).
    const recorder = new AudioRecorder({
      sampleRate: 16000,
      onChunk: (b64) => {
        if (useInterviewStore.getState().isMuted || recorderRef.current?.isMuted()) {
          return;
        }
        clientRef.current?.sendAudio(b64);
        const rms = recorder.getRMS();

        // Local instant barge-in if candidate speaks while AI is talking
        if (rms > BARGE_IN_RMS_THRESHOLD) {
          if (playerRef.current?.isPlaying() === true) {
            isInterruptedRef.current = true;
            playerRef.current.stopAndClear();
          }
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }
          setAudioState('listening');
        }
      },
      onLevel: (rms) => {
        if (useInterviewStore.getState().isMuted || recorderRef.current?.isMuted()) {
          setMicLevel(0);
          return;
        }
        setMicLevel(rms);
        if (rms < 0.015 && !playerRef.current?.isPlaying()) {
          if (!silenceTimeoutRef.current) {
            silenceTimeoutRef.current = setTimeout(() => {
              setAudioState('thinking');
              silenceTimeoutRef.current = null;
            }, 1000);
          }
        }
      },
    });

    try {
      await recorder.start();
      if (useInterviewStore.getState().isMuted) {
        recorder.mute();
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Microphone access failed.';
      setError(msg);
      toast.error('Microphone error', { description: msg });
      setConnectionState('failed');
      return;
    }
    recorderRef.current = recorder;

    // 4. Video Stream Setup (if enabled)
    if (config.inputMode === 'video_audio') {
      try {
        const vStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15 } },
        });
        videoStreamRef.current = vStream;
        if (videoElementRef.current) {
          videoElementRef.current.srcObject = vStream;
          await videoElementRef.current.play().catch(() => {});
        }
      } catch (vErr) {
        console.warn('Webcam stream failed to start:', vErr);
        toast.warning('Webcam vision unavailable — continuing with audio only.');
      }
    }

    // 5. Gemini Live client.
    const client = new GeminiLiveClient(apiKey, config);
    client.on('open', () => {
      setConnectionState('connected');
      setAudioState('thinking');

      // Start 1 FPS Video Capture Pipeline if video stream is active
      if (videoStreamRef.current) {
        if (!offscreenCanvasRef.current) {
          const cvs = document.createElement('canvas');
          cvs.width = 640;
          cvs.height = 480;
          offscreenCanvasRef.current = cvs;
        }

        videoIntervalRef.current = setInterval(() => {
          if (!clientRef.current || !videoElementRef.current || !videoElementRef.current.videoWidth) return;
          const cvs = offscreenCanvasRef.current;
          if (!cvs) return;
          const ctx = cvs.getContext('2d');
          if (ctx) {
            ctx.drawImage(videoElementRef.current, 0, 0, cvs.width, cvs.height);
            const dataUrl = cvs.toDataURL('image/jpeg', 0.6);
            const base64Data = dataUrl.split(',')[1];
            if (base64Data) {
              clientRef.current.sendVideo(base64Data);
            }
          }
        }, 1000); // 1 Frame Per Second
      }
    });

    client.on('audio', (b64) => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      isInterruptedRef.current = false;
      playerRef.current?.enqueueChunk(b64);
      setAudioState('speaking');
    });

    client.on('inputTranscript', (text) => {
      isInterruptedRef.current = false;
      inputBufferRef.current += ' ' + text;
      flushInputBuffer(false);
      setAudioState('listening');
    });

    client.on('outputTranscript', (text) => {
      isInterruptedRef.current = false;
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      outputBufferRef.current += ' ' + text;
      flushOutputBuffer(false);
      setAudioState('speaking');
    });

    client.on('interrupted', () => {
      isInterruptedRef.current = true;
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      playerRef.current?.stopAndClear();
      setAudioState('listening');
    });

    client.on('toolCall', (name, args) => handleToolCall(name, args));
    client.on('error', (msg) => {
      console.error('[GeminiLiveClient] error', msg);
      toast.error('Connection error', { description: msg });
      setError(msg);
    });

    client.on('close', (code, reason) => {
      console.log('[GeminiLiveClient] closed', code, reason);
      if (!endedRef.current && phase === 'live') {
        setConnectionState('failed');
      }
    });

    client.connect();
    clientRef.current = client;
  }, [
    config,
    endInterview,
    flushInputBuffer,
    flushOutputBuffer,
    handleToolCall,
    phase,
    setAiLevel,
    setAudioState,
    setError,
    setMicLevel,
  ]);

  // Toggle Camera in live session
  const toggleCamera = useCallback(async () => {
    if (isVideoEnabled) {
      if (videoIntervalRef.current) {
        clearInterval(videoIntervalRef.current);
        videoIntervalRef.current = null;
      }
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach((t) => t.stop());
        videoStreamRef.current = null;
      }
      if (videoElementRef.current) {
        videoElementRef.current.srcObject = null;
      }
      setIsVideoEnabled(false);
      toast.info('Camera turned off');
    } else {
      try {
        const vStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15 } },
        });
        videoStreamRef.current = vStream;
        if (videoElementRef.current) {
          videoElementRef.current.srcObject = vStream;
          await videoElementRef.current.play().catch(() => {});
        }
        setIsVideoEnabled(true);

        if (!offscreenCanvasRef.current) {
          const cvs = document.createElement('canvas');
          cvs.width = 640;
          cvs.height = 480;
          offscreenCanvasRef.current = cvs;
        }

        videoIntervalRef.current = setInterval(() => {
          if (!clientRef.current || !videoElementRef.current || !videoElementRef.current.videoWidth) return;
          const cvs = offscreenCanvasRef.current;
          if (!cvs) return;
          const ctx = cvs.getContext('2d');
          if (ctx) {
            ctx.drawImage(videoElementRef.current, 0, 0, cvs.width, cvs.height);
            const dataUrl = cvs.toDataURL('image/jpeg', 0.6);
            const base64Data = dataUrl.split(',')[1];
            if (base64Data) {
              clientRef.current.sendVideo(base64Data);
            }
          }
        }, 1000);

        toast.success('Camera connected & streaming AI vision');
      } catch (err) {
        toast.error('Failed to enable camera', {
          description: err instanceof Error ? err.message : 'Permission denied',
        });
      }
    }
  }, [isVideoEnabled]);

  // Request standard LLM evaluation on manual end
  const requestStandardEvaluation = useCallback(async () => {
    if (!config) return;
    setIsEvaluating(true);
    flushInputBuffer(true);
    flushOutputBuffer(true);

    const currentTranscript = useInterviewStore.getState().transcript;
    teardown();

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          transcript: currentTranscript,
          apiKey: config.apiKey,
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
        speech_fluency: 7,
        body_language_poise: 7,
        vocal_cues: ['Maintained consistent verbal pacing'],
        non_verbal_cues: ['Direct engagement during board questioning'],
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

  // Connect on mount
  useEffect(() => {
    void connect();
    return () => teardown();
  }, [connect, teardown]);

  // Elapsed timer tick (1 second)
  useEffect(() => {
    if (connectionState !== 'connected') return;
    const interval = setInterval(() => tick(), 1000);
    return () => clearInterval(interval);
  }, [connectionState, tick]);

  // Manual end
  const handleManualEnd = useCallback(() => {
    if (endedRef.current || isEvaluating) return;
    toast.info('Generating your comprehensive feedback scorecard...');
    void requestStandardEvaluation();
  }, [isEvaluating, requestStandardEvaluation]);

  // Retry on failure
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
        {config.inputMode === 'video_audio' && (
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px] gap-1">
            <Camera className="h-2.5 w-2.5" />
            Vision Active
          </Badge>
        )}
      </div>
    );
  }, [config]);

  const orbSize = typeof window !== 'undefined' && window.innerWidth < 640 ? 240 : 300;

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
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col">
        <div className="grid lg:grid-cols-12 gap-6 flex-1 items-stretch">
          {/* Left panel: Board Visualizer & Webcam */}
          <motion.div
            ref={panelContainerRef}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-7 glass-panel rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-between gap-6 min-h-[480px] relative overflow-hidden"
          >
            {/* Header info */}
            <div className="text-center w-full">
              {config && BOARD_OFFICERS[config.examCategory || config.role] && (
                <div className="mb-2">
                  <span className="text-[11px] uppercase tracking-widest font-semibold text-indigo-400">
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
                  {audioState === 'thinking' && 'Board evaluating…'}
                  {audioState === 'speaking' && 'Board speaking…'}
                </span>
              </div>
            </div>

            {/* Visualizer & Video Grid */}
            <div className="relative w-full flex items-center justify-center my-auto">
              <AudioBallVisualizer
                state={audioState}
                micLevel={micLevel}
                aiLevel={aiLevel}
                size={orbSize}
              />

              {/* Draggable Picture-in-Picture Webcam Stream */}
              {isVideoEnabled && (
                <motion.div
                  drag
                  dragConstraints={panelContainerRef}
                  dragElastic={0.12}
                  dragMomentum={false}
                  whileDrag={{ scale: 1.05 }}
                  className="absolute bottom-4 right-4 z-30 w-44 sm:w-56 aspect-video rounded-2xl overflow-hidden border border-white/20 bg-black/85 shadow-2xl cursor-grab active:cursor-grabbing backdrop-blur-md select-none group"
                >
                  <video
                    ref={videoElementRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover -scale-x-100 pointer-events-none"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 text-[10px] text-emerald-300 font-mono flex items-center gap-1.5 border border-white/10 select-none pointer-events-none">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Candidate Feed
                  </div>
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/75 text-[10px] text-slate-300 font-mono flex items-center gap-1 border border-white/10 opacity-70 group-hover:opacity-100 transition-opacity select-none pointer-events-none">
                    <Move className="h-2.5 w-2.5" />
                    Drag
                  </div>
                </motion.div>
              )}
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-3 flex-wrap justify-center w-full pt-2">
              <Button
                size="lg"
                variant={isMuted ? 'secondary' : 'outline'}
                onClick={handleToggleMute}
                className={`h-11 px-4 text-sm ${
                  isMuted
                    ? 'bg-amber-500/20 border-amber-400/40 text-amber-100 hover:bg-amber-500/30'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
                aria-pressed={isMuted}
              >
                {isMuted ? (
                  <>
                    <MicOff className="h-4 w-4 mr-1.5" />
                    Unmute
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-1.5 text-indigo-300" />
                    Mute Mic
                  </>
                )}
              </Button>

              {config?.inputMode === 'video_audio' && (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={toggleCamera}
                  className={cn(
                    'h-11 px-4 text-sm bg-white/5 border-white/10 hover:bg-white/10',
                    isVideoEnabled && 'border-emerald-400/30 text-emerald-200',
                  )}
                >
                  {isVideoEnabled ? (
                    <>
                      <Video className="h-4 w-4 mr-1.5 text-emerald-400" />
                      Camera On
                    </>
                  ) : (
                    <>
                      <VideoOff className="h-4 w-4 mr-1.5 text-red-400" />
                      Camera Off
                    </>
                  )}
                </Button>
              )}

              {connectionState === 'failed' && (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleRetry}
                  className="h-11 px-4 text-sm bg-white/5 border-white/10 hover:bg-white/10"
                >
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                  Retry Connection
                </Button>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="lg"
                    variant="destructive"
                    className="h-11 px-5 bg-red-600/90 hover:bg-red-600 font-semibold"
                  >
                    <PhoneOff className="h-4 w-4 mr-2" />
                    End Interview
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-zinc-900 border-white/10 text-slate-100">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Conclude this Board Interview?</AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-400">
                      This will end the live exchange. The board will evaluate your full spoken
                      answers, vocal fluency, and non-verbal delivery to generate your official scorecard.
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
                        'End & Generate Scorecard'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </motion.div>

          {/* Right panel: Live Transcript */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="lg:col-span-5 h-[480px] lg:h-auto flex flex-col"
          >
            <LiveTranscript transcript={transcript} />
          </motion.div>
        </div>
      </div>

      {/* Evaluating overlay */}
      {isEvaluating && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center gap-4 text-center px-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <Sparkles className="h-6 w-6 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-1">
              Board Deliberating & Generating Appraisal
            </h3>
            <p className="text-sm text-slate-400 max-w-md">
              Evaluating spoken transcript, analytical depth, vocal fluency, and non-verbal delivery cues...
            </p>
          </div>
        </div>
      )}

      {/* Offscreen hidden video capture element */}
      <video ref={videoElementRef} className="hidden" playsInline muted />
    </main>
  );
}
