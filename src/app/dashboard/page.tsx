'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Plus,
  History,
  Key,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Trophy,
  Clock,
  ChevronRight,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/lib/auth-client';

interface InterviewRecord {
  id: string;
  candidateName: string;
  examCategory: string;
  simulationMode: string;
  overallScore: number | null;
  verdict: string | null;
  durationSeconds: number | null;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [showKeyForm, setShowKeyForm] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [profileRes, interviewsRes] = await Promise.all([
          fetch('/api/user/profile'),
          fetch('/api/user/interviews'),
        ]);

        if (profileRes.ok) {
          const profile = await profileRes.json();
          setHasApiKey(profile.hasApiKey);
        }

        if (interviewsRes.ok) {
          const data = await interviewsRes.json();
          setInterviews(data.interviews ?? []);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    if (session?.user) {
      fetchData();
    }
  }, [session]);

  async function handleSaveApiKey() {
    if (!apiKeyInput.trim()) return;
    setSavingKey(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geminiApiKey: apiKeyInput.trim() }),
      });
      if (res.ok) {
        setHasApiKey(true);
        setShowKeyForm(false);
        setApiKeyInput('');
      }
    } catch (err) {
      console.error('Failed to save API key:', err);
    } finally {
      setSavingKey(false);
    }
  }

  function formatDuration(s: number | null) {
    if (!s) return '—';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (sessionLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-1">
            Welcome back, {session?.user?.name?.split(' ')[0] ?? 'there'}
          </h1>
          <p className="text-sm text-zinc-400">
            Practice board interviews, review past feedback, and improve your
            scores.
          </p>
        </div>

        {/* API Key Status */}
        <div className="mb-6 p-4 rounded-lg border border-zinc-800/80 bg-zinc-900/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-medium text-zinc-200">
                Gemini API Key
              </span>
              {hasApiKey ? (
                <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                  <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                  Active
                </Badge>
              ) : (
                <Badge className="text-[10px] bg-red-500/10 text-red-400 border-red-500/30">
                  Not Set
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowKeyForm(!showKeyForm)}
              className="h-7 text-xs text-zinc-400 hover:text-zinc-100"
            >
              {hasApiKey ? 'Update Key' : 'Add Key'}
            </Button>
          </div>

          {showKeyForm && (
            <div className="mt-3 flex gap-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 h-8 px-3 rounded-md border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
              />
              <Button
                size="sm"
                onClick={handleSaveApiKey}
                disabled={savingKey || !apiKeyInput.trim()}
                className="h-8 text-xs bg-zinc-100 text-zinc-950 hover:bg-white"
              >
                {savingKey ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Save className="h-3 w-3 mr-1" />
                    Save
                  </>
                )}
              </Button>
              <a
                href="https://aistudio.google.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center h-8 px-2 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <Link href="/dashboard/interview" className="block">
            <div className="h-full p-5 rounded-lg border border-zinc-800/80 bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-zinc-700 transition-all duration-200 cursor-pointer group">
              <div className="h-10 w-10 rounded-lg bg-indigo-500/10 border border-zinc-800/60 flex items-center justify-center mb-3">
                <Plus className="h-5 w-5 text-indigo-400" />
              </div>
              <h3 className="font-semibold text-sm text-zinc-100 mb-1">
                New Interview
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Start a new mock board interview session with AI-powered officers.
              </p>
              <div className="flex items-center gap-1 mt-3 text-xs text-indigo-400 group-hover:text-indigo-300 transition-colors">
                Start Now
                <ChevronRight className="h-3 w-3" />
              </div>
            </div>
          </Link>

          <div className="p-5 rounded-lg border border-zinc-800/80 bg-zinc-900/30">
            <div className="h-10 w-10 rounded-lg bg-violet-500/10 border border-zinc-800/60 flex items-center justify-center mb-3">
              <History className="h-5 w-5 text-violet-400" />
            </div>
            <h3 className="font-semibold text-sm text-zinc-100 mb-1">
              Past Interviews
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {interviews.length === 0
                ? 'No interviews yet. Start your first mock session!'
                : `${interviews.length} session${interviews.length === 1 ? '' : 's'} recorded.`}
            </p>
          </div>
        </div>

        {/* Interview History */}
        {interviews.length > 0 && (
          <div>
            <h2 className="font-semibold text-sm text-zinc-200 mb-3 flex items-center gap-2">
              <History className="h-4 w-4 text-zinc-500" />
              Interview History
            </h2>
            <div className="space-y-2">
              {interviews.map((iv) => (
                <Link
                  key={iv.id}
                  href={`/dashboard/interview/${iv.id}`}
                  className="block"
                >
                  <div className="p-4 rounded-lg border border-zinc-800/80 bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-zinc-700 transition-all duration-200 group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-zinc-100">
                            {iv.examCategory}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {iv.candidateName} · {iv.simulationMode}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {iv.overallScore != null && (
                          <Badge className="text-[10px] bg-zinc-800 text-zinc-300 border-zinc-700">
                            <Trophy className="h-2.5 w-2.5 mr-1 text-amber-400" />
                            {iv.overallScore}/100
                          </Badge>
                        )}
                        {iv.verdict && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-zinc-800 text-zinc-400 hidden sm:inline-flex"
                          >
                            {iv.verdict}
                          </Badge>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                          <Clock className="h-3 w-3" />
                          {formatDuration(iv.durationSeconds)}
                        </div>
                        <span className="text-[11px] text-zinc-600 hidden sm:block">
                          {formatDate(iv.createdAt)}
                        </span>
                        <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
