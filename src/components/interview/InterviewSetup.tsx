'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Mic,
  MicOff,
  Eye,
  EyeOff,
  KeyRound,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useInterviewStore } from '@/core/state/useInterviewStore';
import type { ExperienceLevel, Role } from '@/core/state/types';
import { AudioRecorder } from '@/core/audio/AudioRecorder';
import { cn } from '@/lib/utils';

const ROLES: Role[] = [
  'Frontend Engineer',
  'Backend Engineer',
  'Fullstack Engineer',
  'Product Manager',
  'DevOps Engineer',
  'Data Scientist',
];

const LEVELS: ExperienceLevel[] = ['Junior', 'Mid', 'Senior', 'Staff'];

interface MicMeterState {
  active: boolean;
  level: number; // smoothed 0..1
  error: string | null;
}

export function InterviewSetup() {
  const setConfig = useInterviewStore((s) => s.setConfig);
  const setPhase = useInterviewStore((s) => s.setPhase);
  const setError = useInterviewStore((s) => s.setError);

  const [name, setName] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [level, setLevel] = useState<ExperienceLevel | ''>('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const [micState, setMicState] = useState<MicMeterState>({
    active: false,
    level: 0,
    error: null,
  });

  // Live mic meter recorder (separate from the actual session recorder).
  const meterRecorderRef = useRef<AudioRecorder | null>(null);
  const [starting, setStarting] = useState(false);

  const startMeter = useCallback(async () => {
    if (meterRecorderRef.current) return;
    try {
      const recorder = new AudioRecorder({
        sampleRate: 16000,
        onChunk: () => {
          /* discard — meter only */
        },
        onLevel: (rms) => {
          setMicState((s) => ({ ...s, level: rms }));
        },
      });
      await recorder.start();
      meterRecorderRef.current = recorder;
      setMicState({ active: true, level: 0, error: null });
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone permission denied. Please allow mic access in your browser.'
          : err instanceof Error
            ? err.message
            : 'Failed to access microphone.';
      setMicState({ active: false, level: 0, error: msg });
    }
  }, []);

  const stopMeter = useCallback(() => {
    meterRecorderRef.current?.stop();
    meterRecorderRef.current = null;
    setMicState((s) => ({ ...s, active: false, level: 0 }));
  }, []);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      meterRecorderRef.current?.stop();
      meterRecorderRef.current = null;
    };
  }, []);

  const canStart =
    name.trim().length > 0 && role !== '' && level !== '' && !starting;

  const handleStart = async () => {
    if (!canStart) return;
    setError(null);
    setStarting(true);

    // Make sure mic permission is granted before transitioning.
    if (!meterRecorderRef.current) {
      try {
        await startMeter();
      } catch (err) {
        toast.error('Microphone access failed', {
          description:
            err instanceof Error ? err.message : 'Unknown mic error.',
        });
        setStarting(false);
        return;
      }
    }

    // Validate API key availability via the session broker.
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() || undefined }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        const msg =
          data.error ??
            'No Gemini API key available. Set GEMINI_API_KEY in .env.local or provide one below.';
        toast.error('Missing API key', { description: msg });
        setError(msg);
        setStarting(false);
        return;
      }
      // Stop the meter recorder so the Live session can open its own clean stream.
      stopMeter();

      setConfig({
        candidateName: name.trim(),
        role: role as Role,
        level: level as ExperienceLevel,
        apiKey: apiKey.trim() || undefined,
      });
      setPhase('live');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error.';
      toast.error('Failed to start interview', { description: msg });
      setError(msg);
      setStarting(false);
    }
  };

  // Visual meter bar width — amplify small RMS for visibility.
  const meterWidth = Math.min(100, micState.level * 320);

  return (
    <main className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-10 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-2xl"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/30 text-indigo-300 text-xs font-medium mb-4">
              <Sparkles className="h-3.5 w-3.5" />
              Powered by Google Gemini Live
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-br from-white via-indigo-100 to-violet-200 bg-clip-text text-transparent">
              AI Voice Interviewer
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-md mx-auto">
              Practice real-time voice interviews with an AI that adapts to your
              role and experience. Get a full feedback scorecard at the end.
            </p>
          </div>

          {/* Glass card */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="grid gap-5">
              {/* Name */}
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Candidate Name
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. Jordan Rivera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                  className="bg-white/5 border-white/10 focus-visible:border-indigo-400/50"
                />
              </div>

              {/* Role */}
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Target Role</Label>
                <Select
                  value={role}
                  onValueChange={(v) => setRole(v as Role)}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 focus:border-indigo-400/50">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Level */}
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Experience Level</Label>
                <ToggleGroup
                  type="single"
                  value={level}
                  onValueChange={(v) => setLevel(v as ExperienceLevel | '')}
                  className="grid grid-cols-2 sm:grid-cols-4 gap-2"
                >
                  {LEVELS.map((lvl) => (
                    <ToggleGroupItem
                      key={lvl}
                      value={lvl}
                      className="data-[state=on]:bg-indigo-500/20 data-[state=on]:border-indigo-400/50 data-[state=on]:text-indigo-100 bg-white/5 border border-white/10 rounded-xl py-2 text-sm"
                    >
                      {lvl}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              {/* Optional API Key */}
              <div className="grid gap-2">
                <Label
                  htmlFor="apikey"
                  className="text-sm font-medium flex items-center gap-1.5"
                >
                  <KeyRound className="h-3.5 w-3.5 text-slate-400" />
                  Gemini API Key
                  <span className="text-xs font-normal text-slate-500">
                    (optional — falls back to server env)
                  </span>
                </Label>
                <div className="relative">
                  <Input
                    id="apikey"
                    type={showKey ? 'text' : 'password'}
                    placeholder="AIza… (leave empty to use server key)"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    autoComplete="off"
                    className="bg-white/5 border-white/10 focus-visible:border-indigo-400/50 pr-10 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                    aria-label={showKey ? 'Hide API key' : 'Show API key'}
                  >
                    {showKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Your key is sent only to the local session broker. Get one at{' '}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-300 hover:underline"
                  >
                    aistudio.google.com/apikey
                  </a>
                  .
                </p>
              </div>

              {/* Mic Meter */}
              <div className="grid gap-2">
                <Label className="text-sm font-medium flex items-center justify-between">
                  <span>Microphone Test</span>
                  {micState.active ? (
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">Not started</span>
                  )}
                </Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={micState.active ? stopMeter : startMeter}
                    className={cn(
                      'bg-white/5 border-white/10 hover:bg-white/10',
                      micState.active &&
                        'border-emerald-400/40 text-emerald-200',
                    )}
                  >
                    {micState.active ? (
                      <>
                        <MicOff className="h-4 w-4 mr-1.5" />
                        Stop Test
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4 mr-1.5" />
                        Test Mic
                      </>
                    )}
                  </Button>
                  <div className="flex-1 h-3 rounded-full bg-white/5 border border-white/10 overflow-hidden relative">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-75"
                      style={{
                        width: `${meterWidth}%`,
                        background:
                          'linear-gradient(90deg, #10b981 0%, #22d3ee 60%, #a855f7 100%)',
                      }}
                    />
                  </div>
                </div>
                {micState.error && (
                  <div className="flex items-start gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-400/20 rounded-lg p-2.5">
                    <RefreshCw className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>{micState.error}</span>
                  </div>
                )}
                {!micState.active && !micState.error && (
                  <p className="text-xs text-slate-500">
                    Click <span className="text-slate-300">Test Mic</span> to
                    grant permission and verify your input level.
                  </p>
                )}
              </div>

              {/* Start CTA */}
              <div className="pt-2">
                <Button
                  size="lg"
                  onClick={handleStart}
                  disabled={!canStart}
                  className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white shadow-lg shadow-indigo-500/25 disabled:opacity-40 disabled:cursor-not-allowed h-12 text-base"
                >
                  {starting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Starting…
                    </>
                  ) : (
                    <>
                      Start Interview
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
                {!canStart && (
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    Enter your name, role, and level to begin.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Privacy note */}
          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5" />
            Audio is streamed directly to Google Gemini for processing. Mic
            access is required.
          </div>
        </motion.div>
      </div>

      <footer className="mt-auto px-4 py-6 text-center text-xs text-slate-500">
        Powered by Google Gemini Live API · Built with Next.js
      </footer>
    </main>
  );
}
