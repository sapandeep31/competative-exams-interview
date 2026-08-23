'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Mic,
  Video,
  Brain,
  BarChart3,
  Shield,
  Landmark,
  GraduationCap,
  ArrowRight,
  Sparkles,
  Users,
  Zap,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/lib/auth-client';

const FEATURES = [
  {
    icon: Mic,
    title: 'Real-Time Voice AI',
    desc: 'Live bidirectional voice powered by Gemini Live API with barge-in support and natural conversation flow.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: Video,
    title: 'Video & Body Language',
    desc: 'Optional webcam analysis evaluates posture, eye contact, and composure under pressure.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Brain,
    title: '6 Specialized Boards',
    desc: 'UPSC, SSB, RBI Grade B, IIMs MBA PI, State PSC, and Judiciary — each with unique board officers.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
  },
  {
    icon: BarChart3,
    title: 'Detailed Scorecards',
    desc: 'Comprehensive feedback with radar charts, competency scores, and actionable improvement areas.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    icon: Shield,
    title: 'Your API Key, Your Data',
    desc: 'Use your own Gemini API key — encrypted at rest, never shared. Full control over your sessions.',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
  },
  {
    icon: Globe,
    title: 'Practice Anytime',
    desc: 'Save interview history, review past feedback, track your progress over multiple sessions.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
  },
];

const EXAM_BADGES = [
  { label: 'UPSC IAS/IPS', icon: Landmark },
  { label: 'SSB Defence', icon: Shield },
  { label: 'RBI Grade B', icon: BarChart3 },
  { label: 'IIMs MBA PI', icon: GraduationCap },
  { label: 'State PSC', icon: Users },
  { label: 'Judiciary PCS-J', icon: Zap },
];

export default function LandingPage() {
  const { data: session } = useSession();

  return (
    <main className="min-h-screen w-full bg-zinc-950 text-zinc-100 overflow-x-hidden">
      {/* Nav */}
      <header className="h-14 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse" />
          <span className="font-bold text-sm tracking-tight text-zinc-100">
            BoardPrep AI
          </span>
          <Badge
            variant="outline"
            className="text-[10px] font-mono border-zinc-800 bg-zinc-900/80 text-zinc-400 px-1.5 py-0 ml-1"
          >
            v0.4
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {session ? (
            <Link href="/dashboard">
              <Button
                size="sm"
                className="h-8 text-xs font-medium bg-zinc-100 text-zinc-950 hover:bg-white"
              >
                Dashboard
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs font-medium text-zinc-300 hover:text-zinc-100"
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button
                  size="sm"
                  className="h-8 text-xs font-medium bg-zinc-100 text-zinc-950 hover:bg-white"
                >
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 sm:px-8 pt-16 sm:pt-24 pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Badge className="bg-indigo-500/10 text-indigo-300 border-indigo-500/30 text-xs font-mono mb-6 px-3 py-1">
            <Sparkles className="h-3 w-3 mr-1.5" />
            AI-Powered Board Interview Simulator
          </Badge>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-5">
            Crack Your{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              Board Interview
            </span>
            <br />
            With AI That Grills You
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            Practice with hyper-realistic AI board officers for UPSC, SSB, RBI,
            IIMs, and more. Real-time voice conversations, video analysis, and
            comprehensive scorecards — all powered by your own Gemini API key.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <Link href="/signup">
              <Button
                size="lg"
                className="h-12 px-8 text-sm font-semibold bg-zinc-100 text-zinc-950 hover:bg-white"
              >
                Start Practicing Free
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                variant="outline"
                size="lg"
                className="h-12 px-8 text-sm font-medium border-zinc-800 text-zinc-300 hover:bg-zinc-900"
              >
                Already have an account?
              </Button>
            </Link>
          </div>

          {/* Exam badges */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {EXAM_BADGES.map((exam) => {
              const Icon = exam.icon;
              return (
                <Badge
                  key={exam.label}
                  variant="outline"
                  className="text-[11px] font-mono border-zinc-800 bg-zinc-900/60 text-zinc-400 gap-1.5 px-2.5 py-1"
                >
                  <Icon className="h-3 w-3 text-zinc-500" />
                  {exam.label}
                </Badge>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="max-w-5xl mx-auto px-4 sm:px-8 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              Everything You Need to Prepare
            </h2>
            <p className="text-sm text-zinc-400 max-w-lg mx-auto">
              From real-time voice AI to comprehensive feedback — a complete
              interview preparation platform.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={feat.title}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
                  className="p-5 rounded-lg border border-zinc-800/80 bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-zinc-700 transition-all duration-200"
                >
                  <div
                    className={`h-9 w-9 rounded-md ${feat.bg} border border-zinc-800/60 flex items-center justify-center mb-3`}
                  >
                    <Icon className={`h-4.5 w-4.5 ${feat.color}`} />
                  </div>
                  <h3 className="font-semibold text-sm text-zinc-100 mb-1.5">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {feat.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* How It Works */}
      <section className="max-w-5xl mx-auto px-4 sm:px-8 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              How It Works
            </h2>
            <p className="text-sm text-zinc-400 max-w-lg mx-auto">
              Three simple steps to realistic board interview practice.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                step: '01',
                title: 'Sign Up & Add Your API Key',
                desc: 'Create a free account and add your Gemini API key from Google AI Studio. Your key stays encrypted and private.',
              },
              {
                step: '02',
                title: 'Configure Your Interview',
                desc: 'Pick your exam board, simulation mode, fill your DAF/PIQ details, and choose voice-only or video mode.',
              },
              {
                step: '03',
                title: 'Practice & Review',
                desc: 'Converse with the AI board officer in real-time. Get scored instantly, review past sessions, and improve.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="p-5 rounded-lg border border-zinc-800/80 bg-zinc-900/30"
              >
                <span className="inline-flex items-center justify-center h-8 w-8 rounded bg-zinc-800 text-zinc-300 text-xs font-mono font-bold mb-3">
                  {item.step}
                </span>
                <h3 className="font-semibold text-sm text-zinc-100 mb-1.5">
                  {item.title}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 sm:px-8 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="p-8 rounded-xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/60 to-zinc-950"
        >
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-3">
            Ready to Face the Board?
          </h2>
          <p className="text-sm text-zinc-400 mb-6 max-w-md mx-auto">
            Join aspirants preparing smarter with AI-powered mock interviews.
            Completely free with your own API key.
          </p>
          <Link href="/signup">
            <Button
              size="lg"
              className="h-12 px-10 text-sm font-semibold bg-zinc-100 text-zinc-950 hover:bg-white"
            >
              Create Free Account
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="h-12 px-4 sm:px-8 border-t border-zinc-800/80 bg-zinc-950/80 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
        <div>BoardPrep AI — Competitive Exams Interview Simulator</div>
        <div>Powered by Gemini Live API</div>
      </footer>
    </main>
  );
}
