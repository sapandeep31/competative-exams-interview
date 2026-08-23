'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Loader2,
  Trophy,
  Clock,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FeedbackReport } from '@/components/interview/FeedbackReport';
import { useInterviewStore } from '@/core/state/useInterviewStore';
import type { Feedback } from '@/core/state/types';

interface InterviewDetail {
  id: string;
  candidateName: string;
  examCategory: string;
  simulationMode: string;
  inputMode: string;
  overallScore: number | null;
  verdict: string | null;
  durationSeconds: number | null;
  feedbackJson: Feedback | null;
  configJson: Record<string, unknown> | null;
  createdAt: string;
}

export default function PastInterviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [interview, setInterview] = useState<InterviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const setFeedback = useInterviewStore((s) => s.setFeedback);
  const setConfig = useInterviewStore((s) => s.setConfig);
  const setPhase = useInterviewStore((s) => s.setPhase);
  const feedback = useInterviewStore((s) => s.feedback);

  useEffect(() => {
    async function fetchInterview() {
      try {
        const res = await fetch(`/api/user/interviews/${id}`);
        if (!res.ok) {
          setError(res.status === 404 ? 'Interview not found.' : 'Failed to load interview.');
          return;
        }
        const data: InterviewDetail = await res.json();
        setInterview(data);

        // Hydrate the store with the saved feedback so FeedbackReport renders
        if (data.feedbackJson) {
          setFeedback(data.feedbackJson);
          setPhase('feedback');
        }
        if (data.configJson) {
          setConfig(data.configJson as unknown as Parameters<typeof setConfig>[0]);
        }
      } catch {
        setError('Failed to load interview.');
      } finally {
        setLoading(false);
      }
    }

    fetchInterview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-12 text-center">
        <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto mb-3" />
        <p className="text-sm text-zinc-400 mb-4">{error || 'Interview not found.'}</p>
        <Link href="/dashboard">
          <Button variant="outline" size="sm" className="h-8 text-xs border-zinc-800 text-zinc-300">
            <ArrowLeft className="h-3 w-3 mr-1.5" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  // If we have feedback in the store, render the full FeedbackReport component
  if (feedback) {
    return (
      <div>
        {/* Back bar */}
        <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-400 hover:text-zinc-100 gap-1 -ml-2">
              <ArrowLeft className="h-3 w-3" />
              Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-2 mt-2 mb-2">
            <Badge variant="outline" className="text-[10px] border-zinc-800 text-zinc-400">
              {interview.examCategory}
            </Badge>
            <Badge variant="outline" className="text-[10px] border-zinc-800 text-zinc-400">
              {interview.simulationMode}
            </Badge>
            <span className="text-[11px] text-zinc-600">
              {new Date(interview.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
        </div>
        <FeedbackReport />
      </div>
    );
  }

  // Fallback — no feedback JSON stored (shouldn't happen normally)
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-12">
      <Link href="/dashboard">
        <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-400 hover:text-zinc-100 gap-1 -ml-2 mb-6">
          <ArrowLeft className="h-3 w-3" />
          Dashboard
        </Button>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="p-6 rounded-xl border border-zinc-800/80 bg-zinc-900/40"
      >
        <h2 className="text-lg font-bold mb-4">{interview.examCategory} Interview</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-zinc-500">Candidate:</span>{' '}
            <span className="text-zinc-100">{interview.candidateName}</span>
          </div>
          <div>
            <span className="text-zinc-500">Mode:</span>{' '}
            <span className="text-zinc-100">{interview.simulationMode}</span>
          </div>
          {interview.overallScore != null && (
            <div className="flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-zinc-100">{interview.overallScore}/100</span>
            </div>
          )}
          {interview.durationSeconds != null && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-zinc-100">
                {Math.floor(interview.durationSeconds / 60)}m {interview.durationSeconds % 60}s
              </span>
            </div>
          )}
        </div>
        {interview.verdict && (
          <div className="mt-4">
            <Badge className="text-xs bg-zinc-800 text-zinc-300 border-zinc-700">
              <FileText className="h-3 w-3 mr-1" />
              {interview.verdict}
            </Badge>
          </div>
        )}
        <p className="text-xs text-zinc-500 mt-4">
          Detailed feedback report is not available for this session.
        </p>
      </motion.div>
    </div>
  );
}
