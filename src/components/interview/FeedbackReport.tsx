'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
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
  Sparkles,
  Volume2,
  Camera,
  Activity,
  Eye,
  MessageSquare,
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
    badge: 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200',
    desc: 'Outstanding performance — candidate demonstrated top-tier analytical depth, balanced judgment, and officer-like composure.',
  },
  'Recommended (Service List)': {
    badge: 'bg-teal-500/20 border-teal-400/50 text-teal-200',
    desc: 'Commendable performance — solid grasp of core issues and well-calibrated responses suitable for appointment.',
  },
  'Borderline / Reserve List': {
    badge: 'bg-amber-500/20 border-amber-400/50 text-amber-200',
    desc: 'Promising potential with occasional hesitation or superficial answers — placed in the reserve/borderline bracket.',
  },
  'Needs Polish': {
    badge: 'bg-orange-500/20 border-orange-400/50 text-orange-200',
    desc: 'Needs further refinement in structured articulation, factual backing, and maintaining administrative neutrality.',
  },
  'Not Recommended': {
    badge: 'bg-red-500/20 border-red-400/50 text-red-200',
    desc: 'Below board cutoff — significant gaps in domain depth, policy awareness, or composure under questioning.',
  },
};

function scoreColor(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 75) return '#10b981'; // emerald
  if (pct >= 55) return '#38bdf8'; // sky
  if (pct >= 40) return '#f59e0b'; // amber
  return '#ef4444'; // red
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
  const radius = 70;
  const stroke = 12;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, score / max));
  const offset = circumference * (1 - pct);
  const color = scoreColor(score, max);

  return (
    <div className="relative w-44 h-44 flex-shrink-0">
      <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90" aria-hidden="true">
        <circle cx="90" cy="90" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <motion.circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-extrabold tracking-tight" style={{ color }}>
          {Math.round(score)}
        </span>
        <span className="text-xs text-slate-500 mt-0.5">/ {max}</span>
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1">
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
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-slate-200">{label}</span>
        <span className="text-sm font-mono text-slate-300">
          {score.toFixed(1)}
          <span className="text-slate-500"> / {max}</span>
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-white/5 overflow-hidden border border-white/5">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: 'easeOut', delay }}
        />
      </div>
    </div>
  );
}

function buildMarkdown(
  feedback: Feedback,
  meta: { name: string; exam: string; mode: string; date: string; duration: string },
  transcript: { role: 'user' | 'interviewer'; text: string; timestamp: number }[],
): string {
  const lines: string[] = [];
  lines.push(`# Competitive Exams Interview Evaluation Report`);
  lines.push('');
  lines.push(`- **Candidate:** ${meta.name}`);
  lines.push(`- **Exam Board:** ${meta.exam}`);
  lines.push(`- **Simulation Mode:** ${meta.mode}`);
  lines.push(`- **Date:** ${meta.date}`);
  lines.push(`- **Duration:** ${meta.duration}`);
  lines.push('');
  lines.push(`## Board Marks: ${feedback.overall_score} / 100`);
  lines.push(`## Final Recommendation: ${feedback.verdict || feedback.hiring_verdict}`);
  lines.push('');
  lines.push(`## Assessment Dimensions`);
  lines.push(`- Analytical & Critical Depth: ${(feedback.analytical_depth ?? feedback.problem_solving ?? 0).toFixed(1)} / 10`);
  lines.push(`- Administrative Judgment & OLQs: ${(feedback.administrative_balance ?? 0).toFixed(1)} / 10`);
  lines.push(`- Domain & Current Affairs Mastery: ${(feedback.domain_knowledge ?? feedback.technical_depth ?? 0).toFixed(1)} / 10`);
  lines.push(`- Articulation & Composure: ${(feedback.articulation_composure ?? feedback.communication_clarity ?? 0).toFixed(1)} / 10`);
  lines.push(`- Speech Fluency & Vocal Pacing: ${(feedback.speech_fluency ?? 7).toFixed(1)} / 10`);
  lines.push(`- Non-Verbal & Body Language Poise: ${(feedback.body_language_poise ?? 7).toFixed(1)} / 10`);
  lines.push('');
  if (feedback.vocal_cues && feedback.vocal_cues.length > 0) {
    lines.push(`## Vocal & Speech Delivery Cues`);
    for (const v of feedback.vocal_cues) lines.push(`- ${v}`);
    lines.push('');
  }
  if (feedback.non_verbal_cues && feedback.non_verbal_cues.length > 0) {
    lines.push(`## Non-Verbal & Body Language Cues`);
    for (const nv of feedback.non_verbal_cues) lines.push(`- ${nv}`);
    lines.push('');
  }
  lines.push(`## Key Demonstrated Strengths`);
  for (const s of feedback.key_strengths || []) lines.push(`- ${s}`);
  lines.push('');
  lines.push(`## Actionable Areas for Improvement`);
  for (const s of feedback.areas_for_improvement || []) lines.push(`- ${s}`);
  lines.push('');
  lines.push(`## Board Narrative Appraisal`);
  lines.push('');
  lines.push(feedback.detailed_summary);
  lines.push('');
  lines.push(`## Spoken Interview Transcript`);
  lines.push('');
  for (const t of transcript) {
    const who = t.role === 'user' ? 'Candidate' : 'Board Panelist';
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
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-center">
          <p className="text-slate-400">No evaluation report available.</p>
          <Button onClick={reset} className="mt-4">
            Start New Mock Interview
          </Button>
        </div>
      </main>
    );
  }

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
    { axis: 'Admin Balance / OLQs', value: adminBalance, max: 10 },
    { axis: 'Domain & Knowledge', value: domain, max: 10 },
    { axis: 'Articulation & Poise', value: articulation, max: 10 },
    { axis: 'Speech Fluency', value: speechFluency, max: 10 },
    { axis: 'Body Language', value: bodyLanguage, max: 10 },
  ];

  const handleCopyMarkdown = async () => {
    const md = buildMarkdown(feedback, meta, transcript);
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
    <main className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col">
      <div className="flex-1 px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-xs font-medium mb-3">
              <Trophy className="h-3.5 w-3.5" />
              Official Board Assessment Complete
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-violet-200 bg-clip-text text-transparent">
              {meta.exam} Scorecard
            </h1>
            <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
              <Badge className="bg-indigo-500/15 border border-indigo-400/30 text-indigo-100 gap-1 font-medium">
                <User className="h-3 w-3" />
                {meta.name}
              </Badge>
              <Badge className="bg-amber-500/15 border border-amber-400/30 text-amber-100 gap-1 font-medium">
                <Landmark className="h-3 w-3" />
                {meta.exam}
              </Badge>
              <Badge variant="outline" className="bg-white/5 border-white/15 text-slate-300">
                {meta.mode}
              </Badge>
              <Badge variant="outline" className="bg-white/5 border-white/15 text-slate-300">
                {meta.date}
              </Badge>
            </div>
          </motion.div>

          <div className="grid gap-6">
            {/* Score + Verdict card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="glass-panel rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-8 border border-white/10"
            >
              <CircularGauge score={feedback.overall_score} max={100} />
              <div className="flex-1 text-center sm:text-left">
                <p className="text-xs uppercase font-semibold tracking-wider text-slate-400 mb-2">
                  Board Recommendation Verdict
                </p>
                <div
                  className={cn(
                    'inline-block px-4 py-2 rounded-xl border text-lg font-bold shadow-md',
                    verdictInfo.badge,
                  )}
                >
                  {currentVerdict}
                </div>
                <p className="mt-4 text-sm text-slate-300 leading-relaxed">
                  {verdictInfo.desc}
                </p>
                <p className="mt-3 text-xs text-slate-400">
                  Duration: {meta.duration} · {transcript.length} spoken exchanges
                </p>
              </div>
            </motion.div>

            {/* Vocal & Non-Verbal Delivery Card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="glass-panel rounded-3xl p-6 sm:p-8 border border-indigo-500/20 bg-indigo-950/10"
            >
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-indigo-400" />
                <h2 className="text-base font-bold text-white">
                  Audio & Non-Verbal Delivery Assessment
                </h2>
                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-400/30 text-[10px] ml-auto">
                  Fluency & Body Language
                </Badge>
              </div>

              <div className="grid sm:grid-cols-2 gap-6 mb-6">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Volume2 className="h-4 w-4 text-emerald-400" />
                      Speech Fluency & Stammering Control
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {speechFluency.toFixed(1)} / 10
                    </span>
                  </div>
                  <ScoreBar label="" score={speechFluency} delay={0.1} />
                  <p className="text-[11px] text-slate-400 mt-2">
                    Evaluates pauses, hesitation under stress, stammering control, and vocal pacing.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Eye className="h-4 w-4 text-sky-400" />
                      Body Language & Non-Verbal Poise
                    </span>
                    <span className="text-xs font-mono font-bold text-sky-400">
                      {bodyLanguage.toFixed(1)} / 10
                    </span>
                  </div>
                  <ScoreBar label="" score={bodyLanguage} delay={0.2} />
                  <p className="text-[11px] text-slate-400 mt-2">
                    Evaluates posture, eye contact consistency, facial calmness, and physical gestures.
                  </p>
                </div>
              </div>

              {/* Observed Cues Grid */}
              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                {feedback.vocal_cues && feedback.vocal_cues.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1 mb-2">
                      <Volume2 className="h-3.5 w-3.5" />
                      Observed Vocal Cues
                    </span>
                    <ul className="space-y-1.5">
                      {feedback.vocal_cues.map((c, i) => (
                        <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {feedback.non_verbal_cues && feedback.non_verbal_cues.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="text-xs font-semibold text-sky-300 flex items-center gap-1 mb-2">
                      <Camera className="h-3.5 w-3.5" />
                      Observed Body Language Cues
                    </span>
                    <ul className="space-y-1.5">
                      {feedback.non_verbal_cues.map((c, i) => (
                        <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-sky-400 mt-1.5 flex-shrink-0" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Sub-scores grid */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Bar chart card */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="glass-panel rounded-3xl p-6 border border-white/10"
              >
                <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  Core Competency Breakdown
                </h2>
                <div className="grid gap-4">
                  <ScoreBar label="Analytical & Critical Depth" score={analytical} delay={0.1} />
                  <ScoreBar label="Administrative Balance & OLQs" score={adminBalance} delay={0.2} />
                  <ScoreBar label="Domain & Current Affairs Mastery" score={domain} delay={0.3} />
                  <ScoreBar label="Articulation & Composure Under Pressure" score={articulation} delay={0.4} />
                </div>
              </motion.div>

              {/* Radar chart card */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="glass-panel rounded-3xl p-6 border border-white/10 flex flex-col justify-between"
              >
                <h2 className="text-base font-bold text-white mb-2">
                  6-Dimensional Radar Profile
                </h2>
                <div className="w-full h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="rgba(255,255,255,0.1)" />
                      <PolarAngleAxis dataKey="axis" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 10]} stroke="rgba(255,255,255,0.15)" />
                      <Radar
                        name="Competency"
                        dataKey="value"
                        stroke="#818cf8"
                        fill="#6366f1"
                        fillOpacity={0.45}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>

            {/* Strengths & Improvements */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Strengths */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="glass-panel rounded-3xl p-6 border border-white/10"
              >
                <div className="flex items-center gap-2 mb-4 text-emerald-300">
                  <CheckCircle2 className="h-5 w-5" />
                  <h2 className="text-base font-bold text-white">Demonstrated Strengths</h2>
                </div>
                <ul className="space-y-2.5">
                  {(feedback.key_strengths || []).map((s, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* Improvements */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
                className="glass-panel rounded-3xl p-6 border border-white/10"
              >
                <div className="flex items-center gap-2 mb-4 text-amber-300">
                  <AlertTriangle className="h-5 w-5" />
                  <h2 className="text-base font-bold text-white">Areas for Growth & Polish</h2>
                </div>
                <ul className="space-y-2.5">
                  {(feedback.areas_for_improvement || []).map((item, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>

            {/* Detailed Narrative Summary */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10"
            >
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="text-lg font-bold text-white">
                  Board Narrative & Detailed Performance Appraisal
                </h2>
                {config && BOARD_OFFICERS[config.examCategory || config.role] && (
                  <Badge variant="outline" className="bg-white/5 border-white/10 text-indigo-300 text-xs">
                    Evaluated by {BOARD_OFFICERS[config.examCategory || config.role].name}
                  </Badge>
                )}
              </div>
              <div className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                {feedback.detailed_summary}
              </div>
              {config && BOARD_OFFICERS[config.examCategory || config.role] && (
                <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
                  <div>
                    <span className="font-semibold text-slate-200">Presiding Officer: </span>
                    {BOARD_OFFICERS[config.examCategory || config.role].name} ({BOARD_OFFICERS[config.examCategory || config.role].designation})
                  </div>
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Official Board Record
                  </span>
                </div>
              )}
            </motion.div>

            {/* Transcript Accordion */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="glass-panel rounded-3xl p-6 border border-white/10"
            >
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="transcript" className="border-none">
                  <AccordionTrigger className="hover:no-underline py-0">
                    <div className="flex items-center gap-2 text-left">
                      <h2 className="text-base font-bold text-white">
                        Spoken Interview Transcript ({transcript.length} exchanges)
                      </h2>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-5">
                    {transcript.length === 0 ? (
                      <p className="text-sm text-slate-400">No transcript recorded for this session.</p>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {transcript.map((entry) => {
                          const isUser = entry.role === 'user';
                          return (
                            <div
                              key={entry.id}
                              className={cn(
                                'p-3 rounded-xl border text-sm',
                                isUser
                                  ? 'bg-indigo-500/10 border-indigo-400/20 text-indigo-100 ml-4'
                                  : 'bg-white/5 border-white/10 text-slate-200 mr-4',
                              )}
                            >
                              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                                <span className="font-semibold">
                                  {isUser ? meta.name : 'Board Panelist'}
                                </span>
                                <span>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="leading-relaxed">{entry.text}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </motion.div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
              <Button
                onClick={reset}
                size="lg"
                className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg h-12 px-6 rounded-xl font-semibold"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Start Another Mock Interview
              </Button>
              <Button
                onClick={handleCopyMarkdown}
                variant="outline"
                size="lg"
                className="bg-white/5 border-white/10 hover:bg-white/10 h-12 px-5 rounded-xl text-slate-200"
              >
                <Copy className="h-4 w-4 mr-2" />
                {copied ? 'Copied Report!' : 'Copy Markdown Report'}
              </Button>
              <Button
                onClick={handlePrint}
                variant="outline"
                size="lg"
                className="bg-white/5 border-white/10 hover:bg-white/10 h-12 px-5 rounded-xl text-slate-200"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print / Save PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-auto px-4 py-6 text-center text-xs text-slate-500 border-t border-white/5">
        Competitive Exams AI Voice & Video Interview Simulator · Powered by Google Gemini Live API
      </footer>
    </main>
  );
}
