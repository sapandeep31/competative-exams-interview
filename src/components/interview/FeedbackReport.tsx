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
  Download,
  Copy,
  RotateCcw,
  FileText,
  User,
  BadgeCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useInterviewStore } from '@/core/state/useInterviewStore';
import type { Feedback, HiringVerdict } from '@/core/state/types';
import { cn } from '@/lib/utils';

const VERDICT_STYLES: Record<HiringVerdict, string> = {
  'Strong Hire': 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200',
  Hire: 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200',
  'Leaning Hire': 'bg-lime-500/15 border-lime-400/40 text-lime-200',
  'Leaning No Hire': 'bg-amber-500/15 border-amber-400/40 text-amber-200',
  'No Hire': 'bg-red-500/15 border-red-400/40 text-red-200',
};

function scoreColor(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 70) return '#10b981'; // emerald
  if (pct >= 50) return '#f59e0b'; // amber
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

// --- Sub-components ---

function CircularGauge({
  score,
  max = 100,
}: {
  score: number;
  max?: number;
}) {
  const radius = 70;
  const stroke = 12;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, score / max));
  const offset = circumference * (1 - pct);
  const color = scoreColor(score, max);

  return (
    <div className="relative w-44 h-44 flex-shrink-0">
      <svg
        viewBox="0 0 180 180"
        className="w-full h-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
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
        <span
          className="text-4xl font-bold tracking-tight"
          style={{ color }}
        >
          {Math.round(score)}
        </span>
        <span className="text-xs text-slate-500 mt-0.5">/ {max}</span>
        <span className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">
          Overall Score
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
  meta: { name: string; role: string; level: string; date: string; duration: string },
  transcript: { role: 'user' | 'interviewer'; text: string; timestamp: number }[],
): string {
  const lines: string[] = [];
  lines.push(`# Interview Feedback Report`);
  lines.push('');
  lines.push(`- **Candidate:** ${meta.name}`);
  lines.push(`- **Role:** ${meta.role}`);
  lines.push(`- **Level:** ${meta.level}`);
  lines.push(`- **Date:** ${meta.date}`);
  lines.push(`- **Duration:** ${meta.duration}`);
  lines.push('');
  lines.push(`## Overall Score: ${feedback.overall_score} / 100`);
  lines.push(`## Hiring Verdict: ${feedback.hiring_verdict}`);
  lines.push('');
  lines.push(`## Sub-scores`);
  lines.push(`- Technical Depth: ${feedback.technical_depth} / 10`);
  lines.push(`- Communication Clarity: ${feedback.communication_clarity} / 10`);
  lines.push(`- Problem Solving: ${feedback.problem_solving} / 10`);
  lines.push('');
  lines.push(`## Key Strengths`);
  for (const s of feedback.key_strengths) lines.push(`- ${s}`);
  lines.push('');
  lines.push(`## Areas for Improvement`);
  for (const s of feedback.areas_for_improvement) lines.push(`- ${s}`);
  lines.push('');
  lines.push(`## Detailed Summary`);
  lines.push('');
  lines.push(feedback.detailed_summary);
  lines.push('');
  lines.push(`## Full Transcript`);
  lines.push('');
  for (const t of transcript) {
    const who = t.role === 'user' ? 'Candidate' : 'Interviewer';
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
      role: config?.role ?? 'Role',
      level: config?.level ?? 'Level',
      date: formatTime(Date.now()),
      duration: formatDuration(elapsedSeconds),
    }),
    [config, elapsedSeconds],
  );

  if (!feedback) {
    // Defensive — shouldn't happen because the store only enters 'feedback' phase with one set.
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-center">
          <p className="text-slate-400">No feedback available.</p>
          <Button onClick={reset} className="mt-4">
            Start New Interview
          </Button>
        </div>
      </main>
    );
  }

  const radarData = [
    { axis: 'Technical', value: feedback.technical_depth, max: 10 },
    { axis: 'Communication', value: feedback.communication_clarity, max: 10 },
    { axis: 'Problem Solving', value: feedback.problem_solving, max: 10 },
  ];

  const barData = [
    { name: 'Technical', value: feedback.technical_depth, fill: scoreColor(feedback.technical_depth, 10) },
    { name: 'Communication', value: feedback.communication_clarity, fill: scoreColor(feedback.communication_clarity, 10) },
    { name: 'Problem Solving', value: feedback.problem_solving, fill: scoreColor(feedback.problem_solving, 10) },
  ];

  const handleCopyMarkdown = async () => {
    const md = buildMarkdown(feedback, meta, transcript);
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      toast.success('Markdown copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy', {
        description: 'Clipboard access was denied by your browser.',
      });
    }
  };

  const handlePrint = () => {
    // Print-friendly CSS hides interactive chrome and reveals the printable report.
    document.body.classList.add('printing');
    setTimeout(() => {
      window.print();
      document.body.classList.remove('printing');
    }, 50);
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
            className="text-center mb-8 print-friendly-header"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-xs font-medium mb-3">
              <Trophy className="h-3.5 w-3.5" />
              Interview Complete
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Feedback Scorecard
            </h1>
            <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
              <Badge className="bg-indigo-500/15 border border-indigo-400/30 text-indigo-100 gap-1">
                <User className="h-3 w-3" />
                {meta.name}
              </Badge>
              <Badge className="bg-violet-500/15 border border-violet-400/30 text-violet-100 gap-1">
                <BadgeCheck className="h-3 w-3" />
                {meta.role}
              </Badge>
              <Badge variant="outline" className="bg-white/5 border-white/15 text-slate-300">
                {meta.level}
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
              className="glass-panel rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-8"
            >
              <CircularGauge score={feedback.overall_score} max={100} />
              <div className="flex-1 text-center sm:text-left">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">
                  Hiring Verdict
                </p>
                <div
                  className={cn(
                    'inline-block px-4 py-2 rounded-xl border text-lg font-semibold',
                    VERDICT_STYLES[feedback.hiring_verdict],
                  )}
                >
                  {feedback.hiring_verdict}
                </div>
                <p className="mt-4 text-sm text-slate-400">
                  {feedback.hiring_verdict === 'Strong Hire' &&
                    'Outstanding performance — the candidate clearly exceeded expectations.'}
                  {feedback.hiring_verdict === 'Hire' &&
                    'Solid performance — the candidate is recommended for the role.'}
                  {feedback.hiring_verdict === 'Leaning Hire' &&
                    'Promising — leaning toward hiring with minor reservations.'}
                  {feedback.hiring_verdict === 'Leaning No Hire' &&
                    'Mixed signals — leaning against hiring at this time.'}
                  {feedback.hiring_verdict === 'No Hire' &&
                    'Not recommended for this role at the current level.'}
                </p>
                <p className="mt-3 text-xs text-slate-500">
                  Duration: {meta.duration} · {transcript.length} transcript entries
                </p>
              </div>
            </motion.div>

            {/* Sub-scores grid */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Bar chart card */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="glass-panel rounded-3xl p-6"
              >
                <h3 className="text-sm font-semibold text-slate-200 mb-5">
                  Sub-scores
                </h3>
                <div className="flex flex-col gap-4 mb-6">
                  <ScoreBar
                    label="Technical Depth"
                    score={feedback.technical_depth}
                    delay={0.15}
                  />
                  <ScoreBar
                    label="Communication Clarity"
                    score={feedback.communication_clarity}
                    delay={0.25}
                  />
                  <ScoreBar
                    label="Problem Solving"
                    score={feedback.problem_solving}
                    delay={0.35}
                  />
                </div>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                      <XAxis type="number" domain={[0, 10]} hide />
                      <YAxis type="category" dataKey="name" width={92} tick={{ fill: '#cbd5e1', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                        contentStyle={{
                          background: 'rgba(15,23,42,0.95)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                        {barData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Radar chart card */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="glass-panel rounded-3xl p-6"
              >
                <h3 className="text-sm font-semibold text-slate-200 mb-5">
                  Competency Radar
                </h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="75%">
                      <PolarGrid stroke="rgba(255,255,255,0.1)" />
                      <PolarAngleAxis
                        dataKey="axis"
                        tick={{ fill: '#cbd5e1', fontSize: 11 }}
                      />
                      <PolarRadiusAxis
                        domain={[0, 10]}
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        axisLine={false}
                      />
                      <Radar
                        name="Score"
                        dataKey="value"
                        stroke="#a855f7"
                        fill="#a855f7"
                        fillOpacity={0.35}
                        strokeWidth={2}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'rgba(15,23,42,0.95)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>

            {/* Strengths + Improvements */}
            <div className="grid gap-6 md:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="glass-panel rounded-3xl p-6"
              >
                <h3 className="text-sm font-semibold text-emerald-300 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Key Strengths
                </h3>
                {feedback.key_strengths.length > 0 ? (
                  <ul className="space-y-3">
                    {feedback.key_strengths.map((s, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.05 }}
                        className="flex items-start gap-2.5 text-sm text-slate-200"
                      >
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-400 flex-shrink-0" />
                        <span className="leading-relaxed">{s}</span>
                      </motion.li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500 italic">
                    No specific strengths recorded.
                  </p>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
                className="glass-panel rounded-3xl p-6"
              >
                <h3 className="text-sm font-semibold text-amber-300 mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Areas for Improvement
                </h3>
                {feedback.areas_for_improvement.length > 0 ? (
                  <ul className="space-y-3">
                    {feedback.areas_for_improvement.map((s, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 + i * 0.05 }}
                        className="flex items-start gap-2.5 text-sm text-slate-200"
                      >
                        <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-400 flex-shrink-0" />
                        <span className="leading-relaxed">{s}</span>
                      </motion.li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500 italic">
                    No specific improvements recorded.
                  </p>
                )}
              </motion.div>
            </div>

            {/* Detailed summary */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="glass-panel rounded-3xl p-6 sm:p-8"
            >
              <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Detailed Summary
              </h3>
              <div className="prose prose-invert max-w-none">
                {feedback.detailed_summary
                  .split(/\n\n+/)
                  .filter((p) => p.trim().length > 0)
                  .map((para, i) => (
                    <p
                      key={i}
                      className="text-sm leading-relaxed text-slate-300 mb-3 last:mb-0"
                    >
                      {para.trim()}
                    </p>
                  ))}
              </div>
            </motion.div>

            {/* Full transcript accordion */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="glass-panel rounded-3xl p-6"
            >
              <Accordion type="single" collapsible>
                <AccordionItem value="transcript" className="border-b-0">
                  <AccordionTrigger className="text-sm font-semibold text-slate-200 hover:no-underline">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Full Transcript ({transcript.length} messages)
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="max-h-96 overflow-y-auto custom-scroll pr-2 mt-3 space-y-3">
                      {transcript.length === 0 ? (
                        <p className="text-sm text-slate-500 italic text-center py-6">
                          No transcript captured.
                        </p>
                      ) : (
                        transcript.map((entry) => {
                          const isUser = entry.role === 'user';
                          return (
                            <div
                              key={entry.id}
                              className={cn(
                                'flex flex-col',
                                isUser ? 'items-end' : 'items-start',
                              )}
                            >
                              <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
                                {isUser ? 'You' : 'Interviewer'} ·{' '}
                                {new Date(entry.timestamp).toLocaleTimeString()}
                              </div>
                              <div
                                className={cn(
                                  'px-3 py-2 rounded-xl text-sm border max-w-[85%] break-words',
                                  isUser
                                    ? 'bg-emerald-500/10 border-emerald-400/20 text-emerald-50'
                                    : 'bg-indigo-500/10 border-indigo-400/20 text-indigo-50',
                                )}
                              >
                                {entry.text}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </motion.div>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-3 no-print"
            >
              <Button
                size="lg"
                onClick={handlePrint}
                variant="outline"
                className="flex-1 h-12 bg-white/5 border-white/10 hover:bg-white/10"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button
                size="lg"
                onClick={handleCopyMarkdown}
                variant="outline"
                className="flex-1 h-12 bg-white/5 border-white/10 hover:bg-white/10"
              >
                <Copy className="h-4 w-4 mr-2" />
                {copied ? 'Copied!' : 'Copy Markdown'}
              </Button>
              <Button
                size="lg"
                onClick={reset}
                className="flex-1 h-12 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Start New Interview
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      <footer className="mt-auto px-4 py-6 text-center text-xs text-slate-500 no-print">
        Powered by Google Gemini Live API · Feedback generated by AI
      </footer>
    </main>
  );
}
