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
  Landmark,
  Shield,
  Coins,
  GraduationCap,
  Scale,
  Building2,
  SlidersHorizontal,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useInterviewStore } from '@/core/state/useInterviewStore';
import type { ExamCategory, SimulationMode } from '@/core/state/types';
import { AudioRecorder } from '@/core/audio/AudioRecorder';
import { cn } from '@/lib/utils';

interface ExamCardConfig {
  id: ExamCategory;
  title: string;
  shortDesc: string;
  boardPersona: string;
  icon: typeof Landmark;
  color: string;
  bgGlow: string;
  borderActive: string;
  focusTags: string[];
}

const EXAM_CARDS: ExamCardConfig[] = [
  {
    id: 'UPSC Civil Services (IAS/IPS)',
    title: 'UPSC Civil Services',
    shortDesc: 'IAS / IPS / IFS Personality Test & Board Interview',
    boardPersona: 'Honorable Board Chairman & Distinguished Panelists',
    icon: Landmark,
    color: 'from-amber-500 to-orange-500',
    bgGlow: 'hover:border-amber-500/50 hover:bg-amber-500/5',
    borderActive: 'border-amber-400 bg-amber-500/10 shadow-amber-500/20',
    focusTags: ['DAF Cross-Examination', 'Constitutional Ethics', 'Policy Debates'],
  },
  {
    id: 'SSB Defence Interview (Army/Navy/Air Force)',
    title: 'SSB Defence Interview',
    shortDesc: 'Officer Cadre Selection (Army / Navy / Air Force / NDA / CDS / AFCAT)',
    boardPersona: 'Senior Military Interviewing Officer (IO)',
    icon: Shield,
    color: 'from-emerald-500 to-teal-500',
    bgGlow: 'hover:border-emerald-500/50 hover:bg-emerald-500/5',
    borderActive: 'border-emerald-400 bg-emerald-500/10 shadow-emerald-500/20',
    focusTags: ['15 OLQs Assessment', 'Rapid CIQ Series', 'Situational Crisis Tests'],
  },
  {
    id: 'RBI Grade B & Banking PO',
    title: 'RBI Grade B & Banking',
    shortDesc: 'Reserve Bank of India & Premier PSU Banking Board (SBI/IBPS PO)',
    boardPersona: 'Executive Board Member & Senior Monetary Economists',
    icon: Coins,
    color: 'from-blue-500 to-cyan-500',
    bgGlow: 'hover:border-blue-500/50 hover:bg-blue-500/5',
    borderActive: 'border-blue-400 bg-blue-500/10 shadow-blue-500/20',
    focusTags: ['Monetary Policy & Repo', 'Macroeconomic Health', 'Fintech / Banking NPAs'],
  },
  {
    id: 'CAT & IIMs MBA PI',
    title: 'CAT & IIMs MBA PI',
    shortDesc: 'Premier B-School Personal Interview (IIM A/B/C, FMS, XLRI)',
    boardPersona: 'Senior IIM Faculty & Business Admissions Panel',
    icon: GraduationCap,
    color: 'from-purple-500 to-violet-500',
    bgGlow: 'hover:border-purple-500/50 hover:bg-purple-500/5',
    borderActive: 'border-purple-400 bg-purple-500/10 shadow-purple-500/20',
    focusTags: ['Academic Deep Dive', 'Business Acumen', 'Goal Clarity & Why MBA'],
  },
  {
    id: 'State PSC (Civil Services)',
    title: 'State PSC Exams',
    shortDesc: 'Provincial Civil Services (UPPSC, BPSC, MPSC, KPSC, WBPSC)',
    boardPersona: 'State Public Service Commission Board Panel',
    icon: Building2,
    color: 'from-rose-500 to-pink-500',
    bgGlow: 'hover:border-rose-500/50 hover:bg-rose-500/5',
    borderActive: 'border-rose-400 bg-rose-500/10 shadow-rose-500/20',
    focusTags: ['Grassroots Governance', 'State Budget & Schemes', 'Rural Administration'],
  },
  {
    id: 'Judiciary Services (PCS-J)',
    title: 'Judiciary Services (PCS-J)',
    shortDesc: 'Judicial Magistrate & Civil Judge Examination Bench',
    boardPersona: 'Senior High Court Judge & Judicial Examination Bench',
    icon: Scale,
    color: 'from-indigo-500 to-blue-600',
    bgGlow: 'hover:border-indigo-500/50 hover:bg-indigo-500/5',
    borderActive: 'border-indigo-400 bg-indigo-500/10 shadow-indigo-500/20',
    focusTags: ['Constitutional Law', 'BNS/BNSS & Evidence Act', 'Judicial Temperament'],
  },
];

const MODES: { id: SimulationMode; label: string; desc: string }[] = [
  {
    id: 'Comprehensive Board Mock',
    label: 'Full Board Mock',
    desc: '360° interview: DAF, domain depth, policy debates & crisis dilemmas.',
  },
  {
    id: 'DAF / Rapid-Fire Deep Dive',
    label: 'DAF / Rapid-Fire',
    desc: 'Intense cross-questioning on your background, hometown & hobbies.',
  },
  {
    id: 'Situational Crisis & Ethical Dilemmas',
    label: 'Situational & Ethics',
    desc: 'High-pressure case scenarios, moral conflicts & instant decision making.',
  },
  {
    id: 'Current Affairs & Policy Grilling',
    label: 'Current Affairs & Policy',
    desc: 'National/international headlines, reforms & controversial policy stands.',
  },
];

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
  const [selectedExam, setSelectedExam] = useState<ExamCategory>('UPSC Civil Services (IAS/IPS)');
  const [selectedMode, setSelectedMode] = useState<SimulationMode>('Comprehensive Board Mock');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  // Background / DAF details
  const [education, setEducation] = useState('');
  const [nativeState, setNativeState] = useState('');
  const [optionalSubject, setOptionalSubject] = useState('');
  const [hobbies, setHobbies] = useState('');

  const [micState, setMicState] = useState<MicMeterState>({
    active: false,
    level: 0,
    error: null,
  });

  const meterRecorderRef = useRef<AudioRecorder | null>(null);
  const [starting, setStarting] = useState(false);

  const startMeter = useCallback(async () => {
    if (meterRecorderRef.current) return;
    try {
      const recorder = new AudioRecorder({
        sampleRate: 16000,
        onChunk: () => {},
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

  useEffect(() => {
    return () => {
      meterRecorderRef.current?.stop();
      meterRecorderRef.current = null;
    };
  }, []);

  const canStart = name.trim().length > 0 && !starting;

  const handleStart = async () => {
    if (!canStart) return;
    setError(null);
    setStarting(true);

    if (!meterRecorderRef.current) {
      try {
        await startMeter();
      } catch (err) {
        toast.error('Microphone access failed', {
          description: err instanceof Error ? err.message : 'Unknown mic error.',
        });
        setStarting(false);
        return;
      }
    }

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

      stopMeter();

      setConfig({
        candidateName: name.trim(),
        examCategory: selectedExam,
        simulationMode: selectedMode,
        role: selectedExam,
        level: selectedMode,
        background: {
          education: education.trim() || undefined,
          nativeState: nativeState.trim() || undefined,
          optionalOrSpecialization: optionalSubject.trim() || undefined,
          hobbies: hobbies.trim() || undefined,
        },
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

  const meterWidth = Math.min(100, micState.level * 320);

  return (
    <main className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col">
      <div className="flex-1 max-w-5xl mx-auto px-4 py-8 sm:py-12 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {/* Hero header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-400/30 text-indigo-300 text-xs font-medium mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              India's Premier Competitive Exams AI Voice Board Simulator
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-violet-200 bg-clip-text text-transparent">
              Competitive Exams Interview Simulator
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
              Simulate realistic board interviews for UPSC, SSB, RBI, IIM, State PSC, and Judiciary. Speak naturally via real-time voice and receive an in-depth scorecard with OLQ & administrative radar analysis.
            </p>
          </div>

          <div className="grid gap-6">
            {/* 1. Candidate Info Card */}
            <div className="glass-panel rounded-2xl p-5 sm:p-6 shadow-xl border border-white/10">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <h2 className="text-lg font-semibold text-white">Candidate Details</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="name" className="text-xs font-medium text-slate-300">
                    Candidate Full Name *
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g. Vikramaditya Singh"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="off"
                    className="bg-white/5 border-white/10 focus-visible:border-indigo-400/50"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-medium text-slate-300">
                    Microphone Input Check
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={micState.active ? stopMeter : startMeter}
                      className={cn(
                        'bg-white/5 border-white/10 hover:bg-white/10 text-xs h-10',
                        micState.active && 'border-emerald-400/40 text-emerald-200 bg-emerald-500/10',
                      )}
                    >
                      {micState.active ? (
                        <>
                          <MicOff className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                          Stop Test
                        </>
                      ) : (
                        <>
                          <Mic className="h-3.5 w-3.5 mr-1 text-indigo-300" />
                          Test Mic
                        </>
                      )}
                    </Button>
                    <div className="flex-1 h-3 rounded-full bg-white/5 border border-white/10 overflow-hidden relative">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-75"
                        style={{
                          width: `${meterWidth}%`,
                          background: 'linear-gradient(90deg, #10b981 0%, #22d3ee 60%, #a855f7 100%)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Select Exam Track */}
            <div className="glass-panel rounded-2xl p-5 sm:p-6 shadow-xl border border-white/10">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <h2 className="text-lg font-semibold text-white">Select Exam Board & Track</h2>
                </div>
                <span className="text-xs text-slate-400">Click to choose your target interview</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {EXAM_CARDS.map((exam) => {
                  const Icon = exam.icon;
                  const isSelected = selectedExam === exam.id;
                  return (
                    <div
                      key={exam.id}
                      onClick={() => setSelectedExam(exam.id)}
                      className={cn(
                        'cursor-pointer rounded-xl p-4 transition-all duration-200 border relative flex flex-col justify-between',
                        exam.bgGlow,
                        isSelected
                          ? cn('border-2 shadow-lg', exam.borderActive)
                          : 'border-white/10 bg-white/[0.02]',
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <div
                            className={cn(
                              'h-9 w-9 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shadow-md',
                              exam.color,
                            )}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          {isSelected && (
                            <Badge className="bg-indigo-500 text-white text-[10px] uppercase font-bold tracking-wider px-2 py-0.5">
                              Selected
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-bold text-base text-white tracking-tight mb-1">
                          {exam.title}
                        </h3>
                        <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                          {exam.shortDesc}
                        </p>
                      </div>

                      <div className="mt-3 pt-3 border-t border-white/5">
                        <div className="text-[11px] font-medium text-indigo-300 mb-2 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                          {exam.boardPersona}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {exam.focusTags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Select Simulation Mode */}
            <div className="glass-panel rounded-2xl p-5 sm:p-6 shadow-xl border border-white/10">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <h2 className="text-lg font-semibold text-white">Choose Simulation Mode</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {MODES.map((mode) => {
                  const isSelected = selectedMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setSelectedMode(mode.id)}
                      className={cn(
                        'text-left p-3.5 rounded-xl border transition-all duration-150',
                        isSelected
                          ? 'border-indigo-400 bg-indigo-500/15 text-white shadow-md shadow-indigo-500/10'
                          : 'border-white/10 bg-white/[0.02] hover:bg-white/5 text-slate-300',
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-400" />
                        <span className="font-semibold text-sm">{mode.label}</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-snug">{mode.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Optional DAF & Profile Grounding */}
            <div className="glass-panel rounded-2xl p-5 sm:p-6 shadow-xl border border-white/10">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="daf-details" className="border-none">
                  <AccordionTrigger className="hover:no-underline py-0">
                    <div className="flex items-center gap-2 text-left">
                      <div className="h-7 w-7 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-sm">
                        4
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4 text-indigo-400" />
                          Detailed Application Form (DAF) / Background Grounding
                          <Badge variant="outline" className="text-[10px] text-slate-400 border-white/10">
                            Optional
                          </Badge>
                        </h3>
                        <p className="text-xs text-slate-400 font-normal">
                          Add your degree, native state, optional subject, and hobbies for authentic personalized questioning.
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="grid gap-1.5">
                        <Label className="text-xs font-medium text-slate-300">
                          Education & Graduation Degree
                        </Label>
                        <Input
                          placeholder="e.g. B.Tech in Computer Science / BA History"
                          value={education}
                          onChange={(e) => setEducation(e.target.value)}
                          className="bg-white/5 border-white/10 text-sm"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs font-medium text-slate-300">
                          Native State & Hometown
                        </Label>
                        <Input
                          placeholder="e.g. Varanasi, Uttar Pradesh"
                          value={nativeState}
                          onChange={(e) => setNativeState(e.target.value)}
                          className="bg-white/5 border-white/10 text-sm"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs font-medium text-slate-300">
                          Optional Subject / Specialization / Cadre Preference
                        </Label>
                        <Input
                          placeholder="e.g. Political Science & International Relations (PSIR) / Finance"
                          value={optionalSubject}
                          onChange={(e) => setOptionalSubject(e.target.value)}
                          className="bg-white/5 border-white/10 text-sm"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs font-medium text-slate-300">
                          Hobbies, Sports & Extracurriculars
                        </Label>
                        <Input
                          placeholder="e.g. Basketball, Vipassana meditation, Reading Indian history"
                          value={hobbies}
                          onChange={(e) => setHobbies(e.target.value)}
                          className="bg-white/5 border-white/10 text-sm"
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* 5. Optional Gemini API Key */}
            <div className="glass-panel rounded-2xl p-5 sm:p-6 shadow-xl border border-white/10">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="api-key" className="border-none">
                  <AccordionTrigger className="hover:no-underline py-0">
                    <div className="flex items-center gap-2 text-left">
                      <KeyRound className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-300">
                        Custom Gemini API Key
                      </span>
                      <span className="text-xs text-slate-500 font-normal">
                        (optional — preconfigured with server key)
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <div className="relative">
                      <Input
                        id="apikey"
                        type={showKey ? 'text' : 'password'}
                        placeholder="AIza… (leave empty to use server preconfigured key)"
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
                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Launch CTA */}
            <div className="pt-2">
              <Button
                size="lg"
                onClick={handleStart}
                disabled={!canStart}
                className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white shadow-xl shadow-indigo-500/25 disabled:opacity-40 disabled:cursor-not-allowed h-14 text-lg font-bold rounded-2xl"
              >
                {starting ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    Connecting to {selectedExam} Board…
                  </>
                ) : (
                  <>
                    Commence {selectedExam} Mock Interview
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>
              {!canStart && (
                <p className="text-xs text-slate-500 mt-2 text-center">
                  Please enter your candidate name above to commence.
                </p>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mt-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Low-latency real-time voice streaming with Google Gemini Live API. Speak naturally as in an actual board interview.
            </div>
          </div>
        </motion.div>
      </div>

      <footer className="mt-auto px-4 py-6 text-center text-xs text-slate-500 border-t border-white/5">
        Competitive Exams AI Interview Preparation · Powered by Google Gemini Live API
      </footer>
    </main>
  );
}
