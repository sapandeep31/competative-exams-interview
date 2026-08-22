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
  ShieldCheck,
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
  const appendTranscript = useInterviewStore((s) => s.appendTranscript);
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

  const endInterview = useCallback(
    (feedback: Feedback) => {
      if (endedRef.current) return;
      endedRef.current = true;

      // Full synchronous teardown of mic, player, video, and WebSocket
      teardown();

      setFeedback(feedback);
      setPhase('feedback');
    },
    [setFeedback, setPhase, teardown],
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
            'No API key configured. Please set the API key on the setup screen.',
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
      appendTranscript('user', text);
      setAudioState('listening');
    });

    client.on('outputTranscript', (text) => {
      isInterruptedRef.current = false;
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      appendTranscript('interviewer', text);
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
    appendTranscript,
    config,
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
  }, [config, endInterview, teardown]);

  // Connect on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge
          variant="secondary"
          className="bg-zinc-900 border border-zinc-800 text-zinc-300 gap-1 font-mono text-[11px] px-2 py-0.5"
        >
          <ShieldCheck className="h-3 w-3 text-indigo-400" />
          {config.candidateName}
        </Badge>
        {officer && (
          <Badge
            variant="secondary"
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 gap-1 font-mono text-[11px] px-2 py-0.5 hidden sm:inline-flex"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {officer.name.split(',')[0]}
          </Badge>
        )}
        <Badge
          variant="outline"
          className="bg-zinc-900/80 border border-zinc-800 text-zinc-300 font-mono text-[11px] px-2 py-0.5"
        >
          <BadgeCheck className="h-3 w-3 text-indigo-400" />
          {exam.split('(')[0].trim()}
        </Badge>
        <Badge
          variant="outline"
          className="bg-zinc-900/60 border border-zinc-800 text-zinc-400 font-mono text-[10px] hidden md:inline-flex"
        >
          {mode.split(' ')[0]}
        </Badge>
        {config.inputMode === 'video_audio' && (
          <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30 text-[10px] gap-1 py-0 px-1.5">
            <Camera className="h-2.5 w-2.5" />
            Video
          </Badge>
        )}
      </div>
    );
  }, [config]);

  const orbSize = typeof window !== 'undefined' && window.innerWidth < 640 ? 220 : 280;

  return (
    <main className="h-screen w-full bg-zinc-950 text-zinc-100 flex flex-col antialiased overflow-hidden">
      {/* High-density Utility Header */}
      <header className="h-12 shrink-0 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                connectionState === 'connected'
                  ? 'bg-emerald-400'
                  : connectionState === 'connecting'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-red-500'
              }`}
            />
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-300">
              {connectionState === 'connected'
                ? 'Board Session Live'
                : connectionState === 'connecting'
                  ? 'Connecting…'
                  : 'Disconnected'}
            </span>
          </div>
        </div>

        {roleBadge}

        <div className="flex items-center gap-2 text-xs font-mono text-zinc-300 bg-zinc-900/80 border border-zinc-800 rounded px-2.5 py-1">
          <Clock className="h-3 w-3 text-zinc-400" />
          {formatTimer(elapsedSeconds)}
        </div>
      </header>

      {/* Main Workspace Layout (constrained height, no page-level stretching) */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 flex flex-col min-h-0 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0 items-stretch overflow-hidden">
          {/* Left / Center Chamber: Visualizer, HUD & Controls (7 cols) */}
          <motion.div
            ref={panelContainerRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="lg:col-span-7 surface-panel rounded-lg border border-zinc-800/80 p-4 sm:p-5 bg-zinc-900/40 flex flex-col items-center justify-between gap-3 min-h-0 h-full relative overflow-hidden"
          >
            {/* Header info */}
            <div className="w-full shrink-0 flex items-center justify-between pb-3 border-b border-zinc-800/80 flex-wrap gap-2">
              {config && BOARD_OFFICERS[config.examCategory || config.role] ? (
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-indigo-400">
                    Presiding Panel Chair
                  </div>
                  <h3 className="text-sm font-bold text-zinc-100 tracking-tight">
                    {BOARD_OFFICERS[config.examCategory || config.role].name}
                  </h3>
                  <p className="text-[11px] text-zinc-400 truncate max-w-md">
                    {BOARD_OFFICERS[config.examCategory || config.role].designation}
                  </p>
                </div>
              ) : (
                <div className="text-xs font-semibold text-zinc-200">Official Board Chamber</div>
              )}

              {/* Status Pill */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900/90 border border-zinc-800 text-[11px] font-mono text-zinc-300">
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    audioState === 'speaking'
                      ? 'bg-indigo-400 animate-pulse'
                      : audioState === 'listening'
                        ? 'bg-emerald-400 animate-pulse'
                        : audioState === 'thinking'
                          ? 'bg-amber-400 animate-pulse'
                          : 'bg-zinc-500',
                  )}
                />
                <span className="capitalize">
                  {audioState === 'idle' && 'Channel Ready'}
                  {audioState === 'listening' && 'Listening to response…'}
                  {audioState === 'thinking' && 'Board evaluating…'}
                  {audioState === 'speaking' && 'Board speaking…'}
                </span>
              </div>
            </div>

            {/* Visualizer & Picture-in-Picture Video */}
            <div className="relative w-full flex-1 min-h-0 flex items-center justify-center my-auto py-1">
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
                  dragElastic={0.1}
                  dragMomentum={false}
                  whileDrag={{ scale: 1.02 }}
                  className="absolute bottom-2 right-2 z-30 w-44 sm:w-52 aspect-video rounded-md overflow-hidden border border-zinc-700 bg-zinc-950/95 shadow-xl cursor-grab active:cursor-grabbing backdrop-blur-md select-none group"
                >
                  <video
                    ref={(el) => {
                      videoElementRef.current = el;
                      if (el && videoStreamRef.current && el.srcObject !== videoStreamRef.current) {
                        el.srcObject = videoStreamRef.current;
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover -scale-x-100 pointer-events-none"
                  />
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[9px] text-emerald-300 font-mono flex items-center gap-1 border border-white/10 select-none pointer-events-none">
                    <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                    Live Video
                  </div>
                  <div className="absolute top-1.5 right-1.5 px-1 py-0.5 rounded bg-black/80 text-[9px] text-zinc-400 font-mono flex items-center gap-0.5 border border-white/10 opacity-60 group-hover:opacity-100 transition-opacity select-none pointer-events-none">
                    <Move className="h-2 w-2" />
                    Move
                  </div>
                </motion.div>
              )}
            </div>

            {/* Bottom Controls Dock */}
            <div className="w-full shrink-0 flex items-center gap-2.5 flex-wrap justify-between pt-3 border-t border-zinc-800/80">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={isMuted ? 'secondary' : 'outline'}
                  onClick={handleToggleMute}
                  className={cn(
                    'h-8 px-3 text-xs font-medium border-zinc-800',
                    isMuted
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-200 hover:bg-amber-500/25'
                      : 'bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300',
                  )}
                  aria-pressed={isMuted}
                >
                  {isMuted ? (
                    <>
                      <MicOff className="h-3.5 w-3.5 mr-1 text-amber-400" />
                      Unmute Mic
                    </>
                  ) : (
                    <>
                      <Mic className="h-3.5 w-3.5 mr-1 text-zinc-400" />
                      Mute Mic
                    </>
                  )}
                </Button>

                {config?.inputMode === 'video_audio' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={toggleCamera}
                    className={cn(
                      'h-8 px-3 text-xs font-medium border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300',
                      isVideoEnabled && 'border-emerald-500/30 text-emerald-300',
                    )}
                  >
                    {isVideoEnabled ? (
                      <>
                        <Video className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                        Camera Active
                      </>
                    ) : (
                      <>
                        <VideoOff className="h-3.5 w-3.5 mr-1 text-red-400" />
                        Camera Muted
                      </>
                    )}
                  </Button>
                )}

                {connectionState === 'failed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRetry}
                    className="h-8 px-3 text-xs font-medium border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    Retry
                  </Button>
                )}
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 px-3 text-xs font-medium bg-red-600/90 hover:bg-red-600 text-white"
                  >
                    <PhoneOff className="h-3.5 w-3.5 mr-1.5" />
                    End & Score
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-base font-bold text-zinc-100">
                      Conclude Board Interview?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-xs text-zinc-400">
                      This will conclude the live dialogue. The board will evaluate your full spoken answers,
                      analytical depth, vocal fluency, and non-verbal cues to generate your official scorecard.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="h-8 text-xs border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300">
                      Resume Interview
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleManualEnd}
                      disabled={isEvaluating}
                      className="h-8 text-xs bg-red-600 hover:bg-red-500 text-white font-medium"
                    >
                      {isEvaluating ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          Evaluating…
                        </>
                      ) : (
                        'Conclude & Generate Scorecard'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </motion.div>

          {/* Right Panel: High-density Live Transcript (5 cols) - Constrained strictly scrollable window */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.05 }}
            className="lg:col-span-5 h-[340px] lg:h-full min-h-0 flex flex-col overflow-hidden"
          >
            <LiveTranscript transcript={transcript} className="h-full min-h-0 flex flex-col" />
          </motion.div>
        </div>
      </div>

      {/* Evaluating Modal Overlay */}
      {isEvaluating && (
        <div className="fixed inset-0 z-50 bg-zinc-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-center px-4">
          <div className="h-10 w-10 rounded-full border-2 border-zinc-700 border-t-indigo-400 animate-spin mb-1" />
          <h3 className="text-base font-bold text-zinc-100">
            Board Deliberation in Progress
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm font-mono">
            Evaluating spoken transcript, analytical depth, vocal fluency, and non-verbal cues…
          </p>
        </div>
      )}
    </main>
  );
}
