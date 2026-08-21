'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
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
  Camera,
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
import type { ExamCategory, InputMode, SimulationMode } from '@/core/state/types';
import { AudioRecorder } from '@/core/audio/AudioRecorder';
import { cn } from '@/lib/utils';

interface ExamCardConfig {
  id: ExamCategory;
  title: string;
  shortDesc: string;
  officerName: string;
  officerDesignation: string;
  officerLore: string;
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
    shortDesc: 'IAS / IPS / IFS Personality Test',
    officerName: 'Dr. Arvind K. Raghavan, IAS (Retd.)',
    officerDesignation: 'Former Union Home Secretary & UPSC Board Chairman',
    officerLore: '38 years of civil administration across border districts and Cabinet Secretariat.',
    icon: Landmark,
    color: 'from-amber-500 to-orange-500',
    bgGlow: 'hover:border-amber-500/50 hover:bg-amber-500/5',
    borderActive: 'border-amber-400 bg-amber-500/10 shadow-amber-500/20',
    focusTags: ['DAF Cross-Exam', 'Constitutional Ethics', 'Policy Debates'],
  },
  {
    id: 'SSB Defence Interview (Army/Navy/Air Force)',
    title: 'SSB Defence Interview',
    shortDesc: 'Officer Cadre Selection (NDA/CDS/AFCAT)',
    officerName: 'Brigadier Ranvijay Singh Rathore, SM',
    officerDesignation: 'Senior Military Interviewing Officer (IO), SSB',
    officerLore: '32 years in Infantry & Para SF. Veteran of Siachen & counter-insurgency ops.',
    icon: Shield,
    color: 'from-emerald-500 to-teal-500',
    bgGlow: 'hover:border-emerald-500/50 hover:bg-emerald-500/5',
    borderActive: 'border-emerald-400 bg-emerald-500/10 shadow-emerald-500/20',
    focusTags: ['15 OLQs Assessment', 'Rapid CIQ Series', 'Crisis Reactions'],
  },
  {
    id: 'RBI Grade B & Banking PO',
    title: 'RBI Grade B & Banking',
    shortDesc: 'Reserve Bank of India & SBI/IBPS PO',
    officerName: 'Dr. Meenakshi Sundaram',
    officerDesignation: 'Deputy Governor, Reserve Bank of India',
    officerLore: 'PhD Macroeconomics (LSE/DSE). Architect of inflation targeting & liquidity frameworks.',
    icon: Coins,
    color: 'from-blue-500 to-cyan-500',
    bgGlow: 'hover:border-blue-500/50 hover:bg-blue-500/5',
    borderActive: 'border-blue-400 bg-blue-500/10 shadow-blue-500/20',
    focusTags: ['Monetary Policy & Repo', 'Macroeconomic Health', 'NPAs & FinTech'],
  },
  {
    id: 'CAT & IIMs MBA PI',
    title: 'CAT & IIMs MBA PI',
    shortDesc: 'Premier B-School Personal Interview',
    officerName: 'Prof. Debashis Roy',
    officerDesignation: 'Professor of Strategy & Chair of Admissions, IIM Ahmedabad',
    officerLore: 'Corporate advisor to Global 500s. Expert in business models & strategy.',
    icon: GraduationCap,
    color: 'from-purple-500 to-violet-500',
    bgGlow: 'hover:border-purple-500/50 hover:bg-purple-500/5',
    borderActive: 'border-purple-400 bg-purple-500/10 shadow-purple-500/20',
    focusTags: ['Academics & Resume', 'Business Acumen', 'Goal Clarity'],
  },
  {
    id: 'State PSC (Civil Services)',
    title: 'State PSC Exams',
    shortDesc: 'Provincial Civil Services (UPPSC/BPSC/MPSC)',
    officerName: 'Shri Birendra Nath Shukla',
    officerDesignation: 'Former Addl. Chief Secretary & State PSC Chairman',
    officerLore: '34 years managing district administration, rural agrarian crisis & welfare budgets.',
    icon: Building2,
    color: 'from-rose-500 to-pink-500',
    bgGlow: 'hover:border-rose-500/50 hover:bg-rose-500/5',
    borderActive: 'border-rose-400 bg-rose-500/10 shadow-rose-500/20',
    focusTags: ['Grassroots Governance', 'State Schemes', 'Rural Administration'],
  },
  {
    id: 'Judiciary Services (PCS-J)',
    title: 'Judiciary Services (PCS-J)',
    shortDesc: 'Judicial Magistrate & Civil Judge Exam',
    officerName: 'Hon\'ble Justice (Retd.) S. M. Pathak',
    officerDesignation: 'Former High Court Senior Judge & Judicial Board Chair',
    officerLore: '36 years on the bench deciding landmark constitutional & criminal cases.',
    icon: Scale,
    color: 'from-indigo-500 to-blue-600',
    bgGlow: 'hover:border-indigo-500/50 hover:bg-indigo-500/5',
    borderActive: 'border-indigo-400 bg-indigo-500/10 shadow-indigo-500/20',
    focusTags: ['Constitutional Law', 'BNS/BNSS & Evidence', 'Judicial Temperament'],
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
  const [inputMode, setInputMode] = useState<InputMode>('audio_only');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  // Background / DAF details
  const [education, setEducation] = useState('');
  const [nativeState, setNativeState] = useState('');
  const [optionalSubject, setOptionalSubject] = useState('');
  const [hobbies, setHobbies] = useState('');

  // Mic state
  const [micState, setMicState] = useState<MicMeterState>({
    active: false,
    level: 0,
    error: null,
  });

  // Camera preview state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);

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

  const startCameraPreview = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15 } },
      });
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
        await previewVideoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow webcam access in your browser.'
          : err instanceof Error
            ? err.message
            : 'Failed to access webcam.';
      setCameraError(msg);
      setCameraActive(false);
    }
  }, []);

  const stopCameraPreview = useCallback(() => {
    if (previewVideoRef.current && previewVideoRef.current.srcObject) {
      const stream = previewVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      previewVideoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      meterRecorderRef.current?.stop();
      meterRecorderRef.current = null;
      if (previewVideoRef.current && previewVideoRef.current.srcObject) {
        const stream = previewVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
        previewVideoRef.current.srcObject = null;
      }
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
      stopCameraPreview();

      setConfig({
        candidateName: name.trim(),
        examCategory: selectedExam,
        simulationMode: selectedMode,
        inputMode,
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
              India's Premier Competitive Exams AI Voice & Video Board Simulator
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-violet-200 bg-clip-text text-transparent">
              Competitive Exams Interview Simulator
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
              Simulate realistic board interviews for UPSC, SSB, RBI, IIM, State PSC, and Judiciary. Supports real-time Voice and optional Webcam video vision for body language, eye contact, and vocal fluency assessment.
            </p>
          </div>

          <div className="grid gap-6">
            {/* 1. Candidate Info Card */}
            <div className="glass-panel rounded-2xl p-5 sm:p-6 shadow-xl border border-white/10">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <h2 className="text-lg font-semibold text-white">Candidate Details & Input Devices</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
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

              {/* Input Mode Selector: Audio Only vs Audio + Video */}
              <div className="pt-3 border-t border-white/5">
                <Label className="text-xs font-medium text-slate-300 mb-2 block">
                  Interview Modality (Choose Practice Mode)
                </Label>
                <div className="grid sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setInputMode('audio_only');
                      stopCameraPreview();
                    }}
                    className={cn(
                      'p-3.5 rounded-xl border text-left transition-all',
                      inputMode === 'audio_only'
                        ? 'border-indigo-400 bg-indigo-500/15 text-white shadow-md shadow-indigo-500/10'
                        : 'border-white/10 bg-white/[0.02] hover:bg-white/5 text-slate-300',
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Mic className="h-4 w-4 text-indigo-400" />
                      <span className="font-semibold text-sm">Voice Only (Microphone)</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Standard audio stream. Evaluates verbal fluency, logic, and policy reasoning.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setInputMode('video_audio');
                      if (!cameraActive) void startCameraPreview();
                    }}
                    className={cn(
                      'p-3.5 rounded-xl border text-left transition-all',
                      inputMode === 'video_audio'
                        ? 'border-emerald-400 bg-emerald-500/15 text-white shadow-md shadow-emerald-500/10'
                        : 'border-white/10 bg-white/[0.02] hover:bg-white/5 text-slate-300',
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Camera className="h-4 w-4 text-emerald-400" />
                      <span className="font-semibold text-sm">Video & Voice (Webcam + Mic)</span>
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px]">
                        AI Vision
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400">
                      Streams video frames (~1 FPS) to evaluate posture, eye contact, gestures & visual poise.
                    </p>
                  </button>
                </div>

                {/* Webcam Test & Preview Box (if video_audio is selected) */}
                {inputMode === 'video_audio' && (
                  <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4 text-emerald-400" />
                        <span className="text-sm font-semibold text-white">Camera Check & Framing Preview</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={cameraActive ? stopCameraPreview : startCameraPreview}
                        className="text-xs h-8 bg-white/5 border-white/10 hover:bg-white/10"
                      >
                        {cameraActive ? (
                          <>
                            <VideoOff className="h-3.5 w-3.5 mr-1 text-red-400" />
                            Turn Off Camera
                          </>
                        ) : (
                          <>
                            <Video className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                            Start Camera Test
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="relative w-full max-w-sm mx-auto aspect-video bg-black/60 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center">
                      <video
                        ref={previewVideoRef}
                        playsInline
                        muted
                        className={cn(
                          'w-full h-full object-cover -scale-x-100',
                          !cameraActive && 'hidden',
                        )}
                      />
                      {!cameraActive && (
                        <div className="text-center p-4 text-slate-400 text-xs">
                          <Camera className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                          Click <span className="text-emerald-300">Start Camera Test</span> to preview your video framing and posture before connecting.
                        </div>
                      )}
                    </div>
                    {cameraError && (
                      <p className="text-xs text-amber-300 mt-2 text-center bg-amber-500/10 p-2 rounded-lg border border-amber-400/20">
                        {cameraError}
                      </p>
                    )}
                  </div>
                )}
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

                      <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                          <span className="text-xs font-bold text-slate-100 truncate">
                            {exam.officerName}
                          </span>
                        </div>
                        <p className="text-[11px] text-indigo-300 font-medium leading-tight">
                          {exam.officerDesignation}
                        </p>
                        <p className="text-[10px] text-slate-400 leading-snug line-clamp-2">
                          {exam.officerLore}
                        </p>
                        <div className="flex flex-wrap gap-1 pt-1">
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
              Low-latency real-time streaming with Google Gemini Live API. {inputMode === 'video_audio' ? 'Streaming Audio & Webcam Vision (1 FPS).' : 'Streaming Audio.'}
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
