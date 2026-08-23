'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  CheckCircle2,
  AlertCircle,
  Radio,
  Cpu,
  Trophy,
  Sparkles,
  RotateCcw,
  Briefcase,
  Medal,
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
import { useSession } from '@/lib/auth-client';

interface ExamCardConfig {
  id: ExamCategory;
  title: string;
  shortDesc: string;
  officerName: string;
  officerDesignation: string;
  officerLore: string;
  icon: typeof Landmark;
  focusTags: string[];
}

const EXAM_CARDS: ExamCardConfig[] = [
  {
    id: 'UPSC Civil Services (IAS/IPS)',
    title: 'UPSC Civil Services',
    shortDesc: 'IAS / IPS / IFS Personality Board Test',
    officerName: 'Dr. Arvind K. Raghavan, IAS (Retd.)',
    officerDesignation: 'Former Union Home Secretary & UPSC Board Chairman',
    officerLore: '38 years in civil administration across frontier districts, Cabinet Secretariat & policy reform.',
    icon: Landmark,
    focusTags: ['DAF Cross-Exam', 'Constitutional Ethics', 'Policy Debates'],
  },
  {
    id: 'SSB Defence Interview (Army/Navy/Air Force)',
    title: 'SSB Defence Interview',
    shortDesc: 'Officer Cadre Selection (NDA/CDS/AFCAT)',
    officerName: 'Brigadier Ranvijay Singh Rathore, SM',
    officerDesignation: 'Senior Military Interviewing Officer (IO), SSB Board',
    officerLore: '32 years in Infantry & Para SF. Veteran of Siachen, counter-insurgency & strategic commands.',
    icon: Shield,
    focusTags: ['15 OLQs Assessment', 'Rapid CIQ Series', 'Crisis Reactions'],
  },
  {
    id: 'RBI Grade B & Banking PO',
    title: 'RBI Grade B & Banking',
    shortDesc: 'Reserve Bank of India & SBI/IBPS PO Board',
    officerName: 'Dr. Meenakshi Sundaram',
    officerDesignation: 'Deputy Governor, Reserve Bank of India',
    officerLore: 'PhD Macroeconomics (LSE/DSE). Architect of monetary policy, inflation targeting & liquidity frameworks.',
    icon: Coins,
    focusTags: ['Monetary Policy & Repo', 'Macroeconomic Health', 'NPAs & FinTech'],
  },
  {
    id: 'CAT & IIMs MBA PI',
    title: 'CAT & IIMs MBA PI',
    shortDesc: 'Premier B-School Personal Interview',
    officerName: 'Prof. Debashis Roy',
    officerDesignation: 'Professor of Strategy & Chair of Admissions, IIM Ahmedabad',
    officerLore: 'Corporate advisor to Global 500s. Scholar in competitive strategy, business models & leadership.',
    icon: GraduationCap,
    focusTags: ['Academics & Resume', 'Business Acumen', 'Goal Clarity'],
  },
  {
    id: 'State PSC (Civil Services)',
    title: 'State PSC Exams',
    shortDesc: 'Provincial Civil Services (UPPSC/BPSC/MPSC)',
    officerName: 'Shri Birendra Nath Shukla',
    officerDesignation: 'Former Addl. Chief Secretary & State PSC Chairman',
    officerLore: '34 years managing district administration, rural agrarian crisis, law & order and state welfare.',
    icon: Building2,
    focusTags: ['Grassroots Governance', 'State Schemes', 'Rural Administration'],
  },
  {
    id: 'Judiciary Services (PCS-J)',
    title: 'Judiciary Services (PCS-J)',
    shortDesc: 'Judicial Magistrate & Civil Judge Board',
    officerName: "Hon'ble Justice (Retd.) S. M. Pathak",
    officerDesignation: 'Former High Court Senior Judge & Judicial Board Chair',
    officerLore: '36 years on the bench presiding over landmark constitutional, civil & criminal jurisprudence.',
    icon: Scale,
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
  const { data: session } = useSession();
  const setConfig = useInterviewStore((s) => s.setConfig);
  const setPhase = useInterviewStore((s) => s.setPhase);
  const setError = useInterviewStore((s) => s.setError);

  const [name, setName] = useState('');

  // Automatically pre-fill name from authenticated user profile
  useEffect(() => {
    if (session?.user?.name && !name) {
      setName(session.user.name);
    }
  }, [session?.user?.name, name]);

  const [selectedExam, setSelectedExam] = useState<ExamCategory>('UPSC Civil Services (IAS/IPS)');
  const [selectedMode, setSelectedMode] = useState<SimulationMode>('Comprehensive Board Mock');
  const [inputMode, setInputMode] = useState<InputMode>('audio_only');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  // Background / DAF & PIQ details
  const [education, setEducation] = useState('');
  const [nativeState, setNativeState] = useState('');
  const [optionalSubject, setOptionalSubject] = useState('');
  const [sportsAndGames, setSportsAndGames] = useState('');
  const [leadershipRoles, setLeadershipRoles] = useState('');
  const [nccOrScouts, setNccOrScouts] = useState('');
  const [hobbies, setHobbies] = useState('');
  const [workExperienceOrAttempts, setWorkExperienceOrAttempts] = useState('');

  const handleFillSampleDafPiq = (type: 'upsc' | 'ssb' | 'mba') => {
    if (type === 'ssb') {
      setEducation('B.Tech Mechanical Engineering (DTU Delhi), 76% (English medium)');
      setNativeState('Dehradun, Uttarakhand (Resident for 16 years)');
      setOptionalSubject('Aerospace Propulsion & Automotive Dynamics');
      setSportsAndGames('Football (State Level U-19), Basketball (College Team Captain)');
      setLeadershipRoles('School Sports Captain, Head of Collegiate SAE Aero Design Club');
      setNccOrScouts('NCC "C" Certificate (Air Wing, "A" Grade), Completed Annual Training Camp (ATC)');
      setHobbies('Cross-country running, Aircraft scale modeling, Reading military history');
      setWorkExperienceOrAttempts('Fresher / 1st SSB Attempt (NDA/CDS Entry)');
      toast.success('SSB PIQ sample credentials loaded');
    } else if (type === 'mba') {
      setEducation('B.Com (Hons) (SRCC Delhi, 8.8 CGPA), 12th: 96% CBSE');
      setNativeState('Indore, Madhya Pradesh');
      setOptionalSubject('Corporate Finance, FinTech & Strategic Brand Management');
      setSportsAndGames('Lawn Tennis (District Runner-up), Table Tennis (College Team)');
      setLeadershipRoles('President of The Commerce Society, Convener of Annual Business Conclave');
      setNccOrScouts('Rotaract Youth Club Lead / Teach For India Volunteer (1 year)');
      setHobbies('Equity market research, Geopolitical analysis, Classical piano');
      setWorkExperienceOrAttempts('22 months as Financial Risk Analyst at Goldman Sachs');
      toast.success('IIMs MBA / Banking profile loaded');
    } else {
      setEducation('B.Tech in Computer Science (IIT Roorkee, 8.4 CGPA), 12th: 94%');
      setNativeState('Varanasi, Uttar Pradesh (Resident for 18 years)');
      setOptionalSubject('Political Science & International Relations (PSIR)');
      setSportsAndGames('Badminton (College Intramural Winner), 10km Marathon Runner');
      setLeadershipRoles('General Secretary of Student Council, Tech Fest Convener');
      setNccOrScouts('NSS National Service Scheme Volunteer (200+ hours rural service)');
      setHobbies('Vipassana meditation, Amateur bird watching, Column writing on rural governance');
      setWorkExperienceOrAttempts('14 months as Software Engineer at Infosys / 1st UPSC Interview Attempt');
      toast.success('UPSC / State PSC DAF sample credentials loaded');
    }
  };

  const handleClearDafPiq = () => {
    setEducation('');
    setNativeState('');
    setOptionalSubject('');
    setSportsAndGames('');
    setLeadershipRoles('');
    setNccOrScouts('');
    setHobbies('');
    setWorkExperienceOrAttempts('');
    toast.info('DAF / PIQ form cleared');
  };

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
          'No API key configured. Please check server configuration or provide a key below.';
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
          sportsAndGames: sportsAndGames.trim() || undefined,
          leadershipRoles: leadershipRoles.trim() || undefined,
          nccOrScouts: nccOrScouts.trim() || undefined,
          hobbies: hobbies.trim() || undefined,
          workExperienceOrAttempts: workExperienceOrAttempts.trim() || undefined,
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

  const selectedExamData = useMemo(() => {
    return EXAM_CARDS.find((e) => e.id === selectedExam) || EXAM_CARDS[0];
  }, [selectedExam]);

  const meterWidth = Math.min(100, micState.level * 320);

  return (
    <main className="min-h-screen w-full bg-zinc-950 text-zinc-100 flex flex-col antialiased">
      {/* High-density Utility Top Bar */}
      <header className="h-12 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="font-semibold text-xs tracking-wider uppercase text-zinc-200">
              Competitive Exams Board Simulator
            </span>
          </div>
          <span className="text-zinc-600 hidden sm:inline">/</span>
          <span className="text-xs text-zinc-400 font-mono hidden sm:inline">
            v0.3.1-live
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-[11px] font-mono border-zinc-800 bg-zinc-900/80 text-zinc-300 gap-1.5 px-2 py-0.5"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Official Board Session
          </Badge>
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-6 w-full space-y-6">
        {/* Workspace Title Header */}
        <div className="pb-4 border-b border-zinc-800/80 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
              Interview Setup & Board Protocol
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Configure your candidate credentials, target exam panel, simulation mode, and telemetry streams.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 bg-zinc-900/60 px-3 py-1.5 rounded-md border border-zinc-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            6 Specialized Boards Available
          </div>
        </div>

        {/* Section 01: Candidate Identity & Input Devices */}
        <section className="surface-panel rounded-lg border border-zinc-800/80 p-5 bg-zinc-900/40">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center h-5 w-5 rounded bg-zinc-800 text-zinc-300 text-[11px] font-mono font-bold">
                01
              </span>
              <h2 className="text-sm font-semibold text-zinc-200">
                Candidate Profile & Input Telemetry
              </h2>
            </div>
            <span className="text-[11px] font-mono text-zinc-500">
              Required credentials
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-5">
            {/* Candidate Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium text-zinc-300 flex items-center justify-between">
                <span>Candidate Full Name</span>
                <span className="text-[10px] font-mono text-zinc-500">Required</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g. Vikramaditya Singh"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                className="h-9 text-sm"
              />
            </div>

            {/* Mic Telemetry Check */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
                <span>Microphone Calibration</span>
                <span className="text-[10px] font-mono text-zinc-500">
                  {micState.active ? `${Math.round(micState.level * 100)}% RMS` : 'Idle'}
                </span>
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={micState.active ? stopMeter : startMeter}
                  className={cn(
                    'h-9 text-xs font-medium border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300',
                    micState.active && 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20',
                  )}
                >
                  {micState.active ? (
                    <>
                      <MicOff className="h-3.5 w-3.5 text-emerald-400" />
                      Stop Test
                    </>
                  ) : (
                    <>
                      <Mic className="h-3.5 w-3.5 text-zinc-400" />
                      Test Mic
                    </>
                  )}
                </Button>
                <div className="flex-1 h-9 rounded-md bg-zinc-900/80 border border-zinc-800 p-1.5 flex items-center">
                  <div className="w-full h-2 rounded bg-zinc-950 overflow-hidden relative border border-zinc-800/60">
                    <div
                      className="absolute inset-y-0 left-0 rounded transition-[width] duration-75"
                      style={{
                        width: `${meterWidth}%`,
                        background:
                          meterWidth > 75
                            ? '#ef4444'
                            : meterWidth > 40
                              ? '#10b981'
                              : '#6366f1',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modality Selector (Audio vs Audio+Video) */}
          <div className="pt-4 border-t border-zinc-800/80">
            <Label className="text-xs font-medium text-zinc-300 mb-2 block">
              Interview Modality Stream
            </Label>
            <div className="grid sm:grid-cols-2 gap-3">
              {/* Voice Only */}
              <button
                type="button"
                onClick={() => {
                  setInputMode('audio_only');
                  stopCameraPreview();
                }}
                className={cn(
                  'p-3 rounded-md border text-left transition-all duration-150 active:scale-[0.99] cursor-pointer',
                  inputMode === 'audio_only'
                    ? 'border-zinc-300 bg-zinc-800/60 text-zinc-100'
                    : 'border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-700 text-zinc-400',
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Mic className="h-4 w-4 text-zinc-300" />
                    <span className="font-medium text-xs text-zinc-200">
                      Voice Only (Microphone)
                    </span>
                  </div>
                  {inputMode === 'audio_only' && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-zinc-200" />
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  Ultra-low-latency real-time voice streaming. Evaluates spoken depth, articulation, and domain knowledge.
                </p>
              </button>

              {/* Video & Voice */}
              <button
                type="button"
                onClick={() => {
                  setInputMode('video_audio');
                  if (!cameraActive) void startCameraPreview();
                }}
                className={cn(
                  'p-3 rounded-md border text-left transition-all duration-150 active:scale-[0.99] cursor-pointer',
                  inputMode === 'video_audio'
                    ? 'border-emerald-500/60 bg-emerald-950/15 text-zinc-100'
                    : 'border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-700 text-zinc-400',
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-emerald-400" />
                    <span className="font-medium text-xs text-zinc-200">
                      Video & Voice (Webcam + Mic)
                    </span>
                  </div>
                  <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px] py-0 px-1.5">
                    Live Video
                  </Badge>
                </div>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  Enables camera stream to evaluate physical posture, eye contact consistency, and composure.
                </p>
              </button>
            </div>

            {/* Inline Camera Framing HUD (if video mode selected) */}
            {inputMode === 'video_audio' && (
              <div className="mt-4 p-3.5 rounded-md bg-zinc-950/70 border border-zinc-800/80">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5 text-emerald-400" />
                    Webcam Framing Check
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={cameraActive ? stopCameraPreview : startCameraPreview}
                    className="h-7 text-xs px-2.5 border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300"
                  >
                    {cameraActive ? (
                      <>
                        <VideoOff className="h-3 w-3 text-red-400 mr-1" />
                        Turn Off Preview
                      </>
                    ) : (
                      <>
                        <Video className="h-3 w-3 text-emerald-400 mr-1" />
                        Preview Camera
                      </>
                    )}
                  </Button>
                </div>

                <div className="relative aspect-video max-w-sm mx-auto bg-zinc-950 rounded border border-zinc-800 overflow-hidden flex items-center justify-center">
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
                    <div className="text-center p-3 text-zinc-500 text-xs">
                      <Camera className="h-6 w-6 mx-auto mb-1 text-zinc-600" />
                      Click Preview to test video framing before the board convenes.
                    </div>
                  )}
                  {cameraActive && (
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/80 border border-white/10 text-[9px] font-mono text-emerald-300 flex items-center gap-1">
                      <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                      CAMERA PREVIEW ACTIVE
                    </div>
                  )}
                </div>
                {cameraError && (
                  <p className="text-xs text-amber-300 mt-2 p-2 rounded bg-amber-500/10 border border-amber-400/20">
                    {cameraError}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Section 02: Exam Board & Panel Track Selection */}
        <section className="surface-panel rounded-lg border border-zinc-800/80 p-5 bg-zinc-900/40">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center h-5 w-5 rounded bg-zinc-800 text-zinc-300 text-[11px] font-mono font-bold">
                02
              </span>
              <h2 className="text-sm font-semibold text-zinc-200">
                Select Target Examination Board
              </h2>
            </div>
            <span className="text-[11px] font-mono text-zinc-500">
              {EXAM_CARDS.length} Panels Configured
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {EXAM_CARDS.map((exam) => {
              const Icon = exam.icon;
              const isSelected = selectedExam === exam.id;
              return (
                <div
                  key={exam.id}
                  onClick={() => setSelectedExam(exam.id)}
                  className={cn(
                    'cursor-pointer rounded-md p-3.5 transition-all duration-150 border relative flex flex-col justify-between active:scale-[0.99]',
                    isSelected
                      ? 'border-zinc-300 bg-zinc-800/50 shadow-xs'
                      : 'border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/60',
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-7 w-7 rounded bg-zinc-800 border border-zinc-700/50 flex items-center justify-center text-zinc-200">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      {isSelected && (
                        <Badge className="bg-zinc-200 text-zinc-950 text-[10px] font-mono font-semibold px-1.5 py-0">
                          ACTIVE
                        </Badge>
                      )}
                    </div>

                    <h3 className="font-semibold text-xs text-zinc-100 tracking-tight mb-0.5">
                      {exam.title}
                    </h3>
                    <p className="text-[11px] text-zinc-400 mb-2 leading-relaxed line-clamp-1">
                      {exam.shortDesc}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-zinc-800/60 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                      <span className="text-[11px] font-medium text-zinc-200 truncate">
                        {exam.officerName}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 truncate">
                      {exam.officerDesignation}
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {exam.focusTags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/40"
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
        </section>

        {/* Section 03: Simulation Protocol Mode */}
        <section className="surface-panel rounded-lg border border-zinc-800/80 p-5 bg-zinc-900/40">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center h-5 w-5 rounded bg-zinc-800 text-zinc-300 text-[11px] font-mono font-bold">
                03
              </span>
              <h2 className="text-sm font-semibold text-zinc-200">
                Simulation Protocol & Grilling Strategy
              </h2>
            </div>
            <span className="text-[11px] font-mono text-zinc-500">
              Select Intensity
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MODES.map((mode) => {
              const isSelected = selectedMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setSelectedMode(mode.id)}
                  className={cn(
                    'text-left p-3 rounded-md border transition-all duration-150 active:scale-[0.99] cursor-pointer',
                    isSelected
                      ? 'border-zinc-300 bg-zinc-800/50 text-zinc-100 shadow-xs'
                      : 'border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-700 text-zinc-400',
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-400" />
                      <span className="font-medium text-xs text-zinc-200">
                        {mode.label}
                      </span>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-zinc-200" />
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-normal">
                    {mode.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 04: DAF Grounding & Optional Custom Key */}
        <section className="surface-panel rounded-lg border border-zinc-800/80 p-5 bg-zinc-900/40 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center h-5 w-5 rounded bg-zinc-800 text-zinc-300 text-[11px] font-mono font-bold">
                04
              </span>
              <h2 className="text-sm font-semibold text-zinc-200">
                Candidate Profile Grounding & Environment Configuration
              </h2>
            </div>
            <span className="text-[11px] font-mono text-zinc-500">
              Optional
            </span>
          </div>

          <Accordion type="multiple" className="w-full space-y-3">
            {/* DAF & PIQ Accordion */}
            <AccordionItem value="daf-details" className="border border-zinc-800 rounded-md px-3 bg-zinc-900/50">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-2 text-left">
                  <FileSpreadsheet className="h-4 w-4 text-zinc-400" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-200">
                        Detailed Application Form (DAF) / Personal Information Questionnaire (PIQ)
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 border-zinc-700 bg-zinc-800/80 text-zinc-300">
                        SSB & UPSC Grounding
                      </Badge>
                    </div>
                    <div className="text-[11px] text-zinc-400 font-normal mt-0.5">
                      Ground the Board Chairperson in your genuine academic degree, hometown, sports, leadership & extracurricular records.
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4 border-t border-zinc-800 space-y-4">
                {/* Presets & Quick Fill Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded bg-zinc-950/60 border border-zinc-800/80">
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    <span>Quick Autofill Sample Credentials:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleFillSampleDafPiq('upsc')}
                      className="px-2 py-1 rounded text-[11px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 transition-colors"
                    >
                      UPSC DAF Sample
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFillSampleDafPiq('ssb')}
                      className="px-2 py-1 rounded text-[11px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 transition-colors"
                    >
                      SSB PIQ Sample
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFillSampleDafPiq('mba')}
                      className="px-2 py-1 rounded text-[11px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 transition-colors"
                    >
                      IIMs / Banking Sample
                    </button>
                    <button
                      type="button"
                      onClick={handleClearDafPiq}
                      className="px-2 py-1 rounded text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors flex items-center gap-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Clear
                    </button>
                  </div>
                </div>

                {/* 8-Field Comprehensive Form Grid */}
                <div className="grid sm:grid-cols-2 gap-3.5">
                  {/* Field 1: Education */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                        <GraduationCap className="h-3.5 w-3.5 text-zinc-400" />
                        1. Education, Degree & College
                      </Label>
                      <span className="text-[10px] font-mono text-zinc-500">DAF / PIQ Q7</span>
                    </div>
                    <Input
                      placeholder="e.g. B.Tech Mechanical (DTU), 76% (English medium)"
                      value={education}
                      onChange={(e) => setEducation(e.target.value)}
                      className="h-8 text-xs bg-zinc-950/50"
                    />
                  </div>

                  {/* Field 2: Domicile / Native State */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-zinc-400" />
                        2. Native State, District & Hometown
                      </Label>
                      <span className="text-[10px] font-mono text-zinc-500">PIQ Q2 / DAF</span>
                    </div>
                    <Input
                      placeholder="e.g. Varanasi, Uttar Pradesh (Resident for 18 years)"
                      value={nativeState}
                      onChange={(e) => setNativeState(e.target.value)}
                      className="h-8 text-xs bg-zinc-950/50"
                    />
                  </div>

                  {/* Field 3: Optional / Specialization */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                        <Scale className="h-3.5 w-3.5 text-zinc-400" />
                        3. Optional Subject / Core Specialization
                      </Label>
                      <span className="text-[10px] font-mono text-zinc-500">DAF / PI</span>
                    </div>
                    <Input
                      placeholder="e.g. PSIR / Macroeconomics / Criminal Law / Aerospace"
                      value={optionalSubject}
                      onChange={(e) => setOptionalSubject(e.target.value)}
                      className="h-8 text-xs bg-zinc-950/50"
                    />
                  </div>

                  {/* Field 4: Sports & Games */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                        <Trophy className="h-3.5 w-3.5 text-amber-400/80" />
                        4. Sports & Games Participation
                      </Label>
                      <span className="text-[10px] font-mono text-zinc-500">PIQ Q10</span>
                    </div>
                    <Input
                      placeholder="e.g. Football (State Level U-19), Badminton (College Team)"
                      value={sportsAndGames}
                      onChange={(e) => setSportsAndGames(e.target.value)}
                      className="h-8 text-xs bg-zinc-950/50"
                    />
                  </div>

                  {/* Field 5: Positions of Responsibility / Leadership */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                        <Medal className="h-3.5 w-3.5 text-emerald-400/80" />
                        5. Positions of Responsibility & Leadership
                      </Label>
                      <span className="text-[10px] font-mono text-zinc-500">PIQ Q11</span>
                    </div>
                    <Input
                      placeholder="e.g. School Captain, Head of Collegiate Aero Club, Tech Lead"
                      value={leadershipRoles}
                      onChange={(e) => setLeadershipRoles(e.target.value)}
                      className="h-8 text-xs bg-zinc-950/50"
                    />
                  </div>

                  {/* Field 6: NCC / Defense Training / Scouts */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-blue-400/80" />
                        6. NCC Training / Scouts / NSS
                      </Label>
                      <span className="text-[10px] font-mono text-zinc-500">PIQ Q9</span>
                    </div>
                    <Input
                      placeholder="e.g. NCC 'C' Cert (Air Wing, 'A' Grade) / NSS 200+ hrs"
                      value={nccOrScouts}
                      onChange={(e) => setNccOrScouts(e.target.value)}
                      className="h-8 text-xs bg-zinc-950/50"
                    />
                  </div>

                  {/* Field 7: Hobbies & Extra-Curriculars */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                        <Radio className="h-3.5 w-3.5 text-zinc-400" />
                        7. Hobbies & Personal Interests
                      </Label>
                      <span className="text-[10px] font-mono text-zinc-500">DAF / PIQ Q11</span>
                    </div>
                    <Input
                      placeholder="e.g. Vipassana meditation, Cross-country running, Military history"
                      value={hobbies}
                      onChange={(e) => setHobbies(e.target.value)}
                      className="h-8 text-xs bg-zinc-950/50"
                    />
                  </div>

                  {/* Field 8: Work Experience / Prior Attempts */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5 text-zinc-400" />
                        8. Work Experience & Prior Attempts
                      </Label>
                      <span className="text-[10px] font-mono text-zinc-500">DAF / PIQ Q13</span>
                    </div>
                    <Input
                      placeholder="e.g. 2 yrs Software Engg at Infosys / 1st SSB Attempt"
                      value={workExperienceOrAttempts}
                      onChange={(e) => setWorkExperienceOrAttempts(e.target.value)}
                      className="h-8 text-xs bg-zinc-950/50"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Custom API Key Accordion */}
            <AccordionItem value="api-key" className="border border-zinc-800 rounded-md px-3 bg-zinc-900/50">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-2 text-left">
                  <KeyRound className="h-4 w-4 text-zinc-400" />
                  <div>
                    <div className="text-xs font-semibold text-zinc-200">
                      Custom API Key Configuration
                    </div>
                    <div className="text-[11px] text-zinc-400 font-normal">
                      Leave empty to use default server configuration.
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4 border-t border-zinc-800">
                <div className="relative max-w-lg">
                  <Input
                    id="apikey"
                    type={showKey ? 'text' : 'password'}
                    placeholder="Provide custom API key (optional)"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    autoComplete="off"
                    className="h-8 font-mono text-xs pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
                    aria-label={showKey ? 'Hide API key' : 'Show API key'}
                  >
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* Section 05: Commence Board Interview (Primary Action Station at the very bottom) */}
        <section className="surface-panel rounded-lg border border-zinc-800/80 p-5 bg-zinc-900/60 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center h-5 w-5 rounded bg-zinc-800 text-zinc-300 text-[11px] font-mono font-bold">
                05
              </span>
              <h2 className="text-sm font-semibold text-zinc-200">
                Commence Board Interview
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Board Ready</span>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3 p-3.5 rounded-md bg-zinc-950/70 border border-zinc-800/80 text-xs">
            <div className="space-y-0.5">
              <div className="font-semibold text-zinc-200 flex items-center gap-2">
                <span>{selectedExamData.title}</span>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-400 font-mono text-[11px]">{selectedMode}</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Presiding Chair: <span className="text-zinc-300 font-medium">{selectedExamData.officerName}</span> ({selectedExamData.officerDesignation})
              </p>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono">
              <Badge variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-300">
                {name.trim() ? name.trim() : 'Candidate Name Pending'}
              </Badge>
              <Badge variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-300">
                {inputMode === 'video_audio' ? 'Voice & Video' : 'Voice Only'}
              </Badge>
            </div>
          </div>

          <div className="pt-1 space-y-2.5">
            <Button
              size="lg"
              onClick={handleStart}
              disabled={!canStart}
              className="w-full h-12 text-xs font-semibold uppercase tracking-wider bg-zinc-100 hover:bg-white text-zinc-950 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {starting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Convening Board…
                </>
              ) : (
                <>
                  Commence Board Interview
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>

            <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/80" />
                <span>Secure real-time audio & video stream</span>
              </div>
              {!name.trim() && (
                <div className="flex items-center gap-1 text-amber-400/80">
                  <AlertCircle className="h-3 w-3" />
                  <span>Enter candidate name in Step 01 to proceed</span>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="mt-auto h-10 px-4 sm:px-6 border-t border-zinc-800/80 bg-zinc-950/80 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
        <div>Competitive Exams AI Interview Simulator</div>
        <div>Standardized Evaluation Engine</div>
      </footer>
    </main>
  );
}
