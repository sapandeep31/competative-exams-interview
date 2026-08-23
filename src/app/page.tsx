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
  ChevronDown,
  Lock,
  Cpu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/lib/auth-client';

const FEATURES = [
  {
    icon: Mic,
    title: 'Real-Time Voice AI',
    desc: 'Live bidirectional audio powered by Gemini Live API with natural interruptibility and rapid conversational turns.',
    color: 'text-emerald-400',
    border: 'hover:border-emerald-500/40',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: Video,
    title: 'Visual & Body Language',
    desc: 'Real-time webcam feed analyzes posture, eye contact, facial composure, and non-verbal candidate presence.',
    color: 'text-sky-400',
    border: 'hover:border-sky-500/40',
    bg: 'bg-sky-500/10',
  },
  {
    icon: Brain,
    title: '6 Specialized Boards',
    desc: 'UPSC IAS, SSB Armed Forces, RBI Grade B, IIMs MBA, State PSC, and Judiciary — tailored officers and rubrics.',
    color: 'text-violet-400',
    border: 'hover:border-violet-500/40',
    bg: 'bg-violet-500/10',
  },
  {
    icon: BarChart3,
    title: 'Detailed Scorecards',
    desc: 'Comprehensive multi-competency radar scores, analytical feedback, cross-questioning critique, and suggestions.',
    color: 'text-amber-400',
    border: 'hover:border-amber-500/40',
    bg: 'bg-amber-500/10',
  },
  {
    icon: Lock,
    title: 'Zero Data Compromise',
    desc: 'Powered by your personal Gemini API key — AES-256 encrypted at rest. We never share or sell your transcripts.',
    color: 'text-rose-400',
    border: 'hover:border-rose-500/40',
    bg: 'bg-rose-500/10',
  },
  {
    icon: Globe,
    title: 'Track Performance History',
    desc: 'Revisit past mock interviews, re-read board transcripts, track score improvements across attempts.',
    color: 'text-cyan-400',
    border: 'hover:border-cyan-500/40',
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

const STEPS = [
  {
    step: '01',
    title: 'Sign Up & Add Your Key',
    desc: 'Create your free account and paste your Google AI Studio Gemini API key. Stays 100% private and encrypted.',
    tag: 'Instant Setup',
  },
  {
    step: '02',
    title: 'Configure Your Profile & DAF',
    desc: 'Choose your exam board, simulation mode (Grill, Standard, Stress), and fill your background credentials.',
    tag: 'Custom Rubrics',
  },
  {
    step: '03',
    title: 'Convene Board & Review',
    desc: 'Speak naturally with the AI officers in real-time. Receive your multi-page scorecard immediately upon conclusion.',
    tag: 'Instant Feedback',
  },
];

export default function LandingPage() {
  const { data: session } = useSession();

  return (
    <main className="min-h-screen w-full bg-zinc-950 text-zinc-100 overflow-x-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Sticky Top Nav */}
      <header className="h-14 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 px-4 sm:px-8 flex items-center justify-between">
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
                className="h-8 text-xs font-medium bg-zinc-100 text-zinc-950 hover:bg-white cursor-pointer"
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
                  className="h-8 text-xs font-medium text-zinc-300 hover:text-zinc-100 cursor-pointer"
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button
                  size="sm"
                  className="h-8 text-xs font-medium bg-zinc-100 text-zinc-950 hover:bg-white cursor-pointer"
                >
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* SECTION 1: HERO (Strict 100vh Viewport Fit) */}
      <section className="relative min-h-[calc(100vh-3.5rem)] flex flex-col justify-between items-center px-4 sm:px-8 py-10 sm:py-16 text-center">
        {/* Ambient Radial Lighting Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-gradient-to-tr from-indigo-600/15 via-violet-600/10 to-transparent blur-[110px] pointer-events-none -z-10" />

        {/* Center Content */}
        <div className="my-auto max-w-4xl mx-auto flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Badge className="bg-indigo-500/10 text-indigo-300 border-indigo-500/30 text-xs font-mono mb-6 px-3.5 py-1.5 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 mr-2 text-indigo-400" />
              AI-Powered Competitive Board Interview Simulator
            </Badge>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6">
              Crack Your{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                Board Interview
              </span>
              <br />
              With AI That Grills You
            </h1>

            <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto mb-9 leading-relaxed">
              Experience authentic, high-pressure board interviews for UPSC,
              SSB, RBI, IIMs, and more. Real-time voice conversations, video
              presence analysis, and rigorous competency scorecards.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-10">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="h-12 px-8 text-sm font-semibold bg-zinc-100 text-zinc-950 hover:bg-white shadow-lg cursor-pointer"
                >
                  Start Practicing Free
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 px-8 text-sm font-medium border-zinc-800 text-zinc-300 hover:bg-zinc-900 cursor-pointer"
                >
                  Already have an account?
                </Button>
              </Link>
            </div>

            {/* Exam Board Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto">
              {EXAM_BADGES.map((exam) => {
                const Icon = exam.icon;
                return (
                  <Badge
                    key={exam.label}
                    variant="outline"
                    className="text-[11px] font-mono border-zinc-800/90 bg-zinc-900/60 text-zinc-400 gap-1.5 px-3 py-1 hover:border-zinc-700 transition-colors"
                  >
                    <Icon className="h-3 w-3 text-zinc-500" />
                    {exam.label}
                  </Badge>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Floating Scroll Indicator */}
        <motion.a
          href="#features"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="inline-flex flex-col items-center gap-1.5 text-[11px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors pt-4 pb-1 cursor-pointer"
        >
          <span>Scroll to explore features</span>
          <ChevronDown className="h-4 w-4 animate-bounce text-zinc-500" />
        </motion.a>
      </section>

      {/* SECTION 2: FEATURES (Full Section View) */}
      <section
        id="features"
        className="relative min-h-[95vh] flex flex-col justify-center max-w-6xl mx-auto px-4 sm:px-8 py-20 border-t border-zinc-800/60"
      >
        <div className="text-center mb-14">
          <Badge className="bg-zinc-900 border-zinc-800 text-zinc-400 text-xs font-mono mb-3 px-3 py-1">
            <Cpu className="h-3 w-3 mr-1.5 text-indigo-400" />
            Cutting-Edge Engine
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Everything You Need to Prepare
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 max-w-lg mx-auto">
            From low-latency bidirectional voice to cross-examination rubrics —
            a full mock interview suite.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className={`p-6 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/80 ${feat.border} transition-all duration-300 shadow-sm flex flex-col`}
              >
                <div
                  className={`h-10 w-10 rounded-lg ${feat.bg} border border-zinc-800/60 flex items-center justify-center mb-4`}
                >
                  <Icon className={`h-5 w-5 ${feat.color}`} />
                </div>
                <h3 className="font-semibold text-base text-zinc-100 mb-2">
                  {feat.title}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 3: HOW IT WORKS (Full Section View) */}
      <section className="relative min-h-[90vh] flex flex-col justify-center max-w-5xl mx-auto px-4 sm:px-8 py-20 border-t border-zinc-800/60">
        <div className="text-center mb-14">
          <Badge className="bg-zinc-900 border-zinc-800 text-zinc-400 text-xs font-mono mb-3 px-3 py-1">
            Simple 3-Step Journey
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            How It Works
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 max-w-lg mx-auto">
            Simulate realistic board interviews and track your progress in
            minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {STEPS.map((item) => (
            <div
              key={item.step}
              className="p-6 rounded-xl border border-zinc-800/80 bg-zinc-900/30 flex flex-col justify-between hover:border-zinc-700 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-zinc-800 text-zinc-200 text-xs font-mono font-bold">
                    {item.step}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono border-zinc-800 bg-zinc-950 text-zinc-400"
                  >
                    {item.tag}
                  </Badge>
                </div>
                <h3 className="font-semibold text-base text-zinc-100 mb-2">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4: CTA CALLOUT */}
      <section className="max-w-4xl mx-auto px-4 sm:px-8 py-20 text-center">
        <div className="p-8 sm:p-12 rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/70 via-zinc-900/40 to-zinc-950 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent pointer-events-none" />
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight mb-4 text-zinc-100">
            Ready to Face the Board?
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 mb-8 max-w-lg mx-auto leading-relaxed">
            Join aspirants mastering their poise, depth, and spontaneity with
            AI-powered board interviews.
          </p>
          <Link href="/signup">
            <Button
              size="lg"
              className="h-12 px-10 text-sm font-semibold bg-zinc-100 text-zinc-950 hover:bg-white shadow-xl cursor-pointer"
            >
              Create Free Account
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="h-14 px-4 sm:px-8 border-t border-zinc-800/80 bg-zinc-950 flex items-center justify-between text-xs text-zinc-500 font-mono">
        <div>BoardPrep AI — Competitive Exams Simulator</div>
        <div>Powered by Gemini Live API</div>
      </footer>
    </main>
  );
}
