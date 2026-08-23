'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import {
  CheckCircle2,
  AlertTriangle,
  Trophy,
  Copy,
  RotateCcw,
  User,
  BadgeCheck,
  Landmark,
  Printer,
  Volume2,
  Camera,
  Activity,
  Eye,
  FileCheck,
  Award,
  ChevronDown,
  LayoutDashboard,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { BOARD_OFFICERS } from '@/core/gemini/live-config';
import { useInterviewStore } from '@/core/state/useInterviewStore';
import type { ExamVerdict, Feedback } from '@/core/state/types';
import { cn } from '@/lib/utils';

const VERDICT_STYLES: Record<ExamVerdict, { badge: string; desc: string }> = {
  'Recommended (Top Merit)': {
    badge: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    desc: 'Outstanding performance — candidate demonstrated top-tier analytical depth, balanced judgment, and officer-like composure.',
  },
  'Recommended (Service List)': {
    badge: 'bg-teal-500/10 border-teal-500/30 text-teal-300',
    desc: 'Commendable performance — solid grasp of core issues and well-calibrated responses suitable for appointment.',
  },
  'Borderline / Reserve List': {
    badge: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    desc: 'Promising potential with occasional hesitation or superficial answers — placed in the reserve/borderline bracket.',
  },
  'Needs Polish': {
    badge: 'bg-orange-500/10 border-orange-500/30 text-orange-300',
    desc: 'Needs further refinement in structured articulation, factual backing, and maintaining administrative neutrality.',
  },
  'Not Recommended': {
    badge: 'bg-red-500/10 border-red-500/30 text-red-300',
    desc: 'Below board cutoff — significant gaps in domain depth, policy awareness, or composure under questioning.',
  },
};

function scoreColor(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 75) return '#34d399'; // emerald-400
  if (pct >= 55) return '#38bdf8'; // sky-400
  if (pct >= 40) return '#fbbf24'; // amber-400
  return '#f87171'; // red-400
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function CircularGauge({ score, max = 100 }: { score: number; max?: number }) {
  const radius = 64;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, score / max));
  const offset = circumference * (1 - pct);
  const color = scoreColor(score, max);

  return (
    <div className="relative w-36 h-36 flex-shrink-0">
      <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90" aria-hidden="true">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <motion.circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.0, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold font-mono tracking-tight" style={{ color }}>
          {Math.round(score)}
        </span>
        <span className="text-[11px] font-mono text-zinc-500">/ {max}</span>
        <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider mt-0.5">
          Board Marks
        </span>
      </div>
    </div>
  );
}

function ScoreBar({
  label,
  score,
  max = 10,
  delay = 0,
}: {
  label: string;
  score: number;
  max?: number;
  delay?: number;
}) {
  const pct = Math.max(0, Math.min(100, (score / max) * 100));
  const color = scoreColor(score, max);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-zinc-300">{label}</span>
        <span className="font-mono text-zinc-400">
          <span className="text-zinc-200 font-semibold">{score.toFixed(1)}</span> / {max}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-800/80 overflow-hidden border border-zinc-800">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay }}
        />
      </div>
    </div>
  );
}

function buildMarkdown(
  feedback: Feedback,
  meta: { name: string; exam: string; mode: string; date: string; duration: string },
  transcript: { role: 'user' | 'interviewer'; text: string; timestamp: number }[],
  isVideoMode: boolean,
): string {
  const lines: string[] = [];
  lines.push(`# Competitive Exams Interview Evaluation Dossier`);
  lines.push('');
  lines.push(`- **Candidate:** ${meta.name}`);
  lines.push(`- **Exam Board:** ${meta.exam}`);
  lines.push(`- **Simulation Mode:** ${meta.mode}`);
  lines.push(`- **Date:** ${meta.date}`);
  lines.push(`- **Duration:** ${meta.duration}`);
  lines.push('');
  lines.push(`## Board Marks: ${feedback.overall_score} / 100`);
  lines.push(`## Recommendation Verdict: ${feedback.verdict || feedback.hiring_verdict}`);
  lines.push('');
  lines.push(`## Competency Evaluation Dimensions`);
  lines.push(`- Analytical & Critical Depth: ${(feedback.analytical_depth ?? feedback.problem_solving ?? 0).toFixed(1)} / 10`);
  lines.push(`- Administrative Judgment & OLQs: ${(feedback.administrative_balance ?? 0).toFixed(1)} / 10`);
  lines.push(`- Domain & Current Affairs Mastery: ${(feedback.domain_knowledge ?? feedback.technical_depth ?? 0).toFixed(1)} / 10`);
  lines.push(`- Articulation & Composure: ${(feedback.articulation_composure ?? feedback.communication_clarity ?? 0).toFixed(1)} / 10`);
  lines.push(`- Speech Fluency & Vocal Pacing: ${(feedback.speech_fluency ?? 7).toFixed(1)} / 10`);
  if (isVideoMode) {
    lines.push(`- Non-Verbal & Body Language Poise: ${(feedback.body_language_poise ?? 7).toFixed(1)} / 10`);
  } else {
    lines.push(`- Non-Verbal & Body Language Poise: N/A (Voice-Only Session)`);
  }
  lines.push('');
  if (feedback.vocal_cues && feedback.vocal_cues.length > 0) {
    lines.push(`## Observed Vocal & Speech Cues`);
    for (const v of feedback.vocal_cues) lines.push(`- ${v}`);
    lines.push('');
  }
  if (isVideoMode && feedback.non_verbal_cues && feedback.non_verbal_cues.length > 0) {
    lines.push(`## Observed Non-Verbal & Body Language Cues`);
    for (const nv of feedback.non_verbal_cues) lines.push(`- ${nv}`);
    lines.push('');
  }
  lines.push(`## Key Demonstrated Strengths`);
  for (const s of feedback.key_strengths || []) lines.push(`- ${s}`);
  lines.push('');
  lines.push(`## Actionable Areas for Growth`);
  for (const s of feedback.areas_for_improvement || []) lines.push(`- ${s}`);
  lines.push('');
  lines.push(`## Official Board Appraisal Narrative`);
  lines.push('');
  lines.push(feedback.detailed_summary);
  lines.push('');
  lines.push(`## Spoken Dialogue Transcript`);
  lines.push('');
  for (const t of transcript) {
    const who = t.role === 'user' ? 'Candidate' : 'Board Panel';
    const time = new Date(t.timestamp).toLocaleTimeString();
    lines.push(`**[${time}] ${who}:** ${t.text}`);
    lines.push('');
  }
  return lines.join('\n');
}

export function FeedbackReport() {
  const feedback = useInterviewStore((s) => s.feedback);
  const transcript = useInterviewStore((s) => s.transcript);
  const config = useInterviewStore((s) => s.config);
  const elapsedSeconds = useInterviewStore((s) => s.elapsedSeconds);
  const reset = useInterviewStore((s) => s.reset);

  const [copied, setCopied] = useState(false);

  // Backup auto-save: ensure newly finished interview is saved to Neon DB
  const savedRef = useRef(false);
  useEffect(() => {
    if (savedRef.current || !feedback || !config) return;
    savedRef.current = true;

    fetch('/api/user/interviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidateName: config.candidateName || 'Candidate',
        examCategory: config.examCategory || config.role || 'UPSC Civil Services',
        simulationMode: config.simulationMode || config.level || 'Comprehensive Board Mock',
        inputMode: config.inputMode || 'audio_only',
        overallScore: feedback.overall_score ?? null,
        verdict: feedback.verdict || feedback.hiring_verdict || null,
        durationSeconds: elapsedSeconds || 0,
        feedbackJson: feedback,
        configJson: config,
      }),
    }).catch((err) => {
      console.error('[FeedbackReport] Auto-save error:', err);
    });
  }, [feedback, config, elapsedSeconds]);

  const meta = useMemo(
    () => ({
      name: config?.candidateName ?? 'Candidate',
      exam: config?.examCategory ?? config?.role ?? 'UPSC Civil Services',
      mode: config?.simulationMode ?? config?.level ?? 'Comprehensive Board Mock',
      date: formatTime(Date.now()),
      duration: formatDuration(elapsedSeconds),
    }),
    [config, elapsedSeconds],
  );

  if (!feedback) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 p-4">
        <div className="surface-panel rounded-lg border border-zinc-800 p-6 text-center max-w-sm">
          <p className="text-sm text-zinc-400">No evaluation scorecard available for this session.</p>
          <Button onClick={reset} className="mt-4 h-8 text-xs font-semibold bg-zinc-100 text-zinc-950 hover:bg-white">
            Start New Mock Interview
          </Button>
        </div>
      </main>
    );
  }

  const isVideoMode =
    config?.inputMode === 'video_audio' &&
    (feedback.body_language_poise ?? 0) > 0 &&
    !(
      feedback.non_verbal_cues?.[0]?.toLowerCase().includes('n/a') ||
      feedback.non_verbal_cues?.[0]?.toLowerCase().includes('voice only')
    );

  const analytical = feedback.analytical_depth ?? feedback.problem_solving ?? 6;
  const adminBalance = feedback.administrative_balance ?? 6;
  const domain = feedback.domain_knowledge ?? feedback.technical_depth ?? 6;
  const articulation = feedback.articulation_composure ?? feedback.communication_clarity ?? 6;
  const speechFluency = feedback.speech_fluency ?? articulation;
  const bodyLanguage = feedback.body_language_poise ?? articulation;

  const currentVerdict = (feedback.verdict || feedback.hiring_verdict || 'Recommended (Service List)') as ExamVerdict;
  const verdictInfo = VERDICT_STYLES[currentVerdict] || VERDICT_STYLES['Recommended (Service List)'];

  const radarData = [
    { axis: 'Analytical Depth', value: analytical, max: 10 },
    { axis: 'Admin Balance', value: adminBalance, max: 10 },
    { axis: 'Domain Mastery', value: domain, max: 10 },
    { axis: 'Articulation', value: articulation, max: 10 },
    { axis: 'Speech Fluency', value: speechFluency, max: 10 },
    ...(isVideoMode ? [{ axis: 'Body Language', value: bodyLanguage, max: 10 }] : []),
  ];

  const handleCopyMarkdown = async () => {
    const md = buildMarkdown(feedback, meta, transcript, isVideoMode);
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      toast.success('Full evaluation report copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy', {
        description: 'Clipboard access was denied by your browser.',
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <main className="min-h-screen w-full bg-zinc-950 text-zinc-100 flex flex-col antialiased">
      {/* Main Dossier Content */}
      <div className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full space-y-6">
        {/* Dossier Header Info Banner */}
        <div className="surface-panel rounded-lg border border-zinc-800/80 p-5 bg-zinc-900/40">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-semibold">
                  Assessment Completed
                </span>
                <span className="text-zinc-600">·</span>
                <span className="text-xs text-zinc-400 font-mono">{meta.date}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
                {meta.exam} Performance Evaluation
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                Presided by {BOARD_OFFICERS[config?.examCategory || config?.role || 'UPSC Civil Services (IAS/IPS)']?.name || 'Board Chairman'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-medium border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Dashboard
                </Button>
              </Link>
              <Badge
                variant="outline"
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-xs px-2.5 py-1"
              >
                <User className="h-3 w-3 mr-1.5 text-zinc-400" />
                {meta.name}
              </Badge>
              <Badge
                variant="outline"
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-xs px-2.5 py-1"
              >
                <Landmark className="h-3 w-3 mr-1.5 text-indigo-400" />
                {meta.mode}
              </Badge>
              <Badge
                variant="outline"
                className="bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-xs px-2.5 py-1"
              >
                {meta.duration}
              </Badge>
            </div>
          </div>
        </div>

        {/* Hero Score + Verdict Card */}
        <div className="surface-panel rounded-lg border border-zinc-800/80 p-6 bg-zinc-900/40 flex flex-col sm:flex-row items-center gap-6">
          <CircularGauge score={feedback.overall_score} max={100} />
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-semibold">
              Official Recommendation Verdict
            </div>
            <div>
              <span
                className={cn(
                  'inline-block px-3 py-1 rounded border text-sm font-semibold font-mono',
                  verdictInfo.badge,
                )}
              >
                {currentVerdict}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed pt-1">
              {verdictInfo.desc}
            </p>
            <div className="pt-2 flex items-center justify-center sm:justify-start gap-3 text-[11px] font-mono text-zinc-500">
              <span>Duration: {meta.duration}</span>
              <span>·</span>
              <span>{transcript.length} dialogue turns captured</span>
            </div>
          </div>
        </div>

        {/* Audio & Non-Verbal Telemetry Card */}
        <div className="surface-panel rounded-lg border border-zinc-800/80 p-5 bg-zinc-900/40 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                Speech Fluency & Non-Verbal Telemetry
              </h2>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] font-mono text-indigo-400 border-indigo-500/20 bg-indigo-500/10"
            >
              Live Telemetry
            </Badge>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-md bg-zinc-900/60 border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
                  Speech Fluency & Vocal Control
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {speechFluency.toFixed(1)} / 10
                </span>
              </div>
              <ScoreBar label="" score={speechFluency} delay={0.1} />
              <p className="text-[11px] text-zinc-400 leading-normal">
                Evaluates pauses, hesitation under stress, stammering control, and vocal pacing.
              </p>
            </div>

            <div className="p-3.5 rounded-md bg-zinc-900/60 border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-sky-400" />
                  Body Language & Visual Poise
                </span>
                {isVideoMode ? (
                  <span className="text-xs font-mono font-bold text-sky-400">
                    {bodyLanguage.toFixed(1)} / 10
                  </span>
                ) : (
                  <Badge variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-400 text-[10px] font-mono py-0 px-1.5">
                    N/A (Voice Only)
                  </Badge>
                )}
              </div>
              {isVideoMode ? (
                <>
                  <ScoreBar label="" score={bodyLanguage} delay={0.2} />
                  <p className="text-[11px] text-zinc-400 leading-normal">
                    Evaluates physical posture, eye contact consistency, and composure under questioning.
                  </p>
                </>
              ) : (
                <div className="py-1">
                  <p className="text-[11px] text-zinc-500 leading-normal">
                    Camera feed was disabled during this voice session. Non-verbal visual telemetry is enabled when taking the interview in Video mode.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Observed Cues Grid */}
          <div className="grid sm:grid-cols-2 gap-3 pt-1">
            {feedback.vocal_cues && feedback.vocal_cues.length > 0 && (
              <div className="p-3 rounded-md bg-zinc-950/60 border border-zinc-800/80">
                <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5 mb-2">
                  <Volume2 className="h-3 w-3 text-emerald-400" />
                  Observed Vocal Cues
                </span>
                <ul className="space-y-1 text-xs text-zinc-400">
                  {feedback.vocal_cues.map((c, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {isVideoMode && feedback.non_verbal_cues && feedback.non_verbal_cues.length > 0 && (
              <div className="p-3 rounded-md bg-zinc-950/60 border border-zinc-800/80">
                <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5 mb-2">
                  <Camera className="h-3 w-3 text-sky-400" />
                  Observed Body Language Cues
                </span>
                <ul className="space-y-1 text-xs text-zinc-400">
                  {feedback.non_verbal_cues.map((c, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-sky-400 mt-1.5 flex-shrink-0" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Competencies & Radar Breakdown */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: Score Bars */}
          <div className="surface-panel rounded-lg border border-zinc-800/80 p-5 bg-zinc-900/40 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200 pb-2 border-b border-zinc-800/80">
              Core Competency Breakdown
            </h2>
            <div className="space-y-3.5">
              <ScoreBar label="Analytical & Critical Depth" score={analytical} delay={0.1} />
              <ScoreBar label="Administrative Balance & OLQs" score={adminBalance} delay={0.2} />
              <ScoreBar label="Domain & Current Affairs Mastery" score={domain} delay={0.3} />
              <ScoreBar label="Articulation & Composure Under Pressure" score={articulation} delay={0.4} />
            </div>
          </div>

          {/* Right: Radar Chart */}
          <div className="surface-panel rounded-lg border border-zinc-800/80 p-5 bg-zinc-900/40 flex flex-col justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200 pb-2 border-b border-zinc-800/80">
              Competency Radar Profile
            </h2>
            <div className="w-full h-48 my-auto">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="axis" stroke="#71717a" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 10]} stroke="rgba(255,255,255,0.08)" />
                  <Radar
                    name="Competency"
                    dataKey="value"
                    stroke="#818cf8"
                    fill="#6366f1"
                    fillOpacity={0.35}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Strengths & Growth Areas */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Strengths */}
          <div className="surface-panel rounded-lg border border-zinc-800/80 p-5 bg-zinc-900/40 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 pb-2 border-b border-zinc-800/80">
              <CheckCircle2 className="h-4 w-4" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                Demonstrated Strengths
              </h2>
            </div>
            <ul className="space-y-2 text-xs text-zinc-300">
              {(feedback.key_strengths || []).map((s, i) => (
                <li key={i} className="flex items-start gap-2 leading-relaxed">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Growth Areas */}
          <div className="surface-panel rounded-lg border border-zinc-800/80 p-5 bg-zinc-900/40 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 pb-2 border-b border-zinc-800/80">
              <AlertTriangle className="h-4 w-4" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                Areas for Growth & Polish
              </h2>
            </div>
            <ul className="space-y-2 text-xs text-zinc-300">
              {(feedback.areas_for_improvement || []).map((item, i) => (
                <li key={i} className="flex items-start gap-2 leading-relaxed">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Detailed Narrative Summary */}
        <div className="surface-panel rounded-lg border border-zinc-800/80 p-5 bg-zinc-900/40 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80 flex-wrap gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
              Board Narrative Appraisal
            </h2>
            {config && BOARD_OFFICERS[config.examCategory || config.role] && (
              <span className="text-[11px] font-mono text-zinc-400">
                Evaluated by {BOARD_OFFICERS[config.examCategory || config.role].name}
              </span>
            )}
          </div>
          <div className="text-xs sm:text-sm text-zinc-300 whitespace-pre-line leading-relaxed">
            {feedback.detailed_summary}
          </div>
        </div>

        {/* Collapsible Transcript */}
        <div className="surface-panel rounded-lg border border-zinc-800/80 p-5 bg-zinc-900/40">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="transcript" className="border-none">
              <AccordionTrigger className="hover:no-underline py-0">
                <div className="flex items-center justify-between w-full pr-4 text-left">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                    Spoken Dialogue Transcript ({transcript.length} turns)
                  </h2>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 mt-3 border-t border-zinc-800/80">
                {transcript.length === 0 ? (
                  <p className="text-xs text-zinc-500">No transcript recorded for this session.</p>
                ) : (
                  <div className="space-y-2.5 max-h-96 overflow-y-auto custom-scroll pr-2">
                    {transcript.map((entry) => {
                      const isUser = entry.role === 'user';
                      return (
                        <div
                          key={entry.id}
                          className={cn(
                            'p-2.5 rounded-md border text-xs leading-relaxed',
                            isUser
                              ? 'bg-zinc-800/80 border-zinc-700/70 text-zinc-100 ml-4'
                              : 'bg-zinc-900/90 border-zinc-800 text-zinc-200 mr-4',
                          )}
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-1">
                            <span className="font-semibold">
                              {isUser ? meta.name : 'Board Panel'}
                            </span>
                            <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p>{entry.text}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-center gap-3 pt-2 pb-6 no-print flex-wrap">
          <Link href="/dashboard">
            <Button
              size="sm"
              className="h-9 px-4 text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-950 cursor-pointer"
            >
              <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
              Go to Dashboard
            </Button>
          </Link>
          <Button
            onClick={reset}
            variant="outline"
            size="sm"
            className="h-9 px-4 text-xs font-medium border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Start Another Mock Interview
          </Button>
          <Button
            onClick={handleCopyMarkdown}
            variant="outline"
            size="sm"
            className="h-9 px-4 text-xs font-medium border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 cursor-pointer"
          >
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            {copied ? 'Copied Report' : 'Copy Markdown Report'}
          </Button>
          <Button
            onClick={handlePrint}
            variant="outline"
            size="sm"
            className="h-9 px-4 text-xs font-medium border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            Print / Save PDF
          </Button>
        </div>
      </div>
    </main>
  );
}
