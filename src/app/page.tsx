'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Mic,
  Video,
  Brain,
  BarChart3,
  Landmark,
  Shield,
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
      <header className="h-14 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 px-3.5 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse" />
          <span className="font-bold text-xs sm:text-sm tracking-tight text-zinc-100">
            BoardPrep AI
          </span>
          <Badge
            variant="outline"
            className="text-[9px] sm:text-[10px] font-mono border-zinc-800 bg-zinc-900/80 text-zinc-400 px-1.5 py-0"
          >
            v0.4
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {session ? (
            <Link href="/dashboard">
              <Button
                size="sm"
                className="h-8 text-xs font-medium bg-zinc-100 text-zinc-950 hover:bg-white cursor-pointer px-3 sm:px-4"
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
                  className="h-8 text-xs font-medium text-zinc-300 hover:text-zinc-100 cursor-pointer px-2.5 sm:px-3"
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button
                  size="sm"
                  className="h-8 text-xs font-medium bg-zinc-100 text-zinc-950 hover:bg-white cursor-pointer px-3 sm:px-4"
                >
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* SECTION 1: HERO (Responsive 100dvh Viewport Fit on Desktop, Clean Flow on Mobile) */}
      <section className="relative min-h-[calc(100dvh-3.5rem)] flex flex-col justify-between items-center px-4 sm:px-8 py-8 sm:py-16 text-center">
        {/* Ambient Radial Lighting Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[550px] h-[220px] sm:h-[350px] bg-gradient-to-tr from-indigo-600/15 via-violet-600/10 to-transparent blur-[80px] sm:blur-[110px] pointer-events-none -z-10" />

        {/* Center Content */}
        <div className="my-auto max-w-4xl mx-auto flex flex-col items-center w-full">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full"
          >
            <div className="inline-flex max-w-full justify-center mb-4 sm:mb-6">
              <Badge className="bg-indigo-500/10 text-indigo-300 border-indigo-500/30 text-[10px] sm:text-xs font-mono px-2.5 sm:px-3.5 py-1 shadow-sm text-center">
                <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1.5 text-indigo-400 shrink-0 inline" />
                <span>Competitive Board Interview Simulator</span>
              </Badge>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.12] mb-4 sm:mb-6">
              Crack Your{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                Board Interview
              </span>
              <br />
              With AI That Grills You
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-zinc-400 max-w-2xl mx-auto mb-6 sm:mb-9 leading-relaxed px-2">
              Experience authentic, high-pressure board interviews for UPSC,
              SSB, RBI, IIMs, and more. Real-time voice conversations, video
              presence analysis, and rigorous competency scorecards.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-3.5 mb-6 sm:mb-10 w-full max-w-sm sm:max-w-none mx-auto">
              <Link href="/signup" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-11 sm:h-12 px-7 text-sm font-semibold bg-zinc-100 text-zinc-950 hover:bg-white shadow-lg cursor-pointer"
                >
                  Start Practicing Free
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto h-11 sm:h-12 px-7 text-sm font-medium border-zinc-800 text-zinc-300 hover:bg-zinc-900 cursor-pointer"
                >
                  Already have an account?
                </Button>
              </Link>
            </div>

            {/* Exam Board Badges */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 max-w-2xl mx-auto">
              {EXAM_BADGES.map((exam) => {
                const Icon = exam.icon;
                return (
                  <Badge
                    key={exam.label}
                    variant="outline"
                    className="text-[10px] sm:text-[11px] font-mono border-zinc-800/90 bg-zinc-900/60 text-zinc-400 gap-1.5 px-2.5 sm:px-3 py-1 hover:border-zinc-700 transition-colors"
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
          className="inline-flex flex-col items-center gap-1 text-[10px] sm:text-[11px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors pt-4 pb-1 cursor-pointer"
        >
          <span>Scroll to explore features</span>
          <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-bounce text-zinc-500" />
        </motion.a>
      </section>

      {/* SECTION 2: FEATURES (Mobile-friendly Grid) */}
      <section
        id="features"
        className="relative min-h-0 sm:min-h-[85vh] flex flex-col justify-center max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-24 border-t border-zinc-800/60"
      >
        <div className="text-center mb-8 sm:mb-14">
          <Badge className="bg-zinc-900 border-zinc-800 text-zinc-400 text-[10px] sm:text-xs font-mono mb-2.5 sm:mb-3 px-3 py-1">
            <Cpu className="h-3 w-3 mr-1.5 text-indigo-400 inline" />
            Cutting-Edge Engine
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-2 sm:mb-3">
            Everything You Need to Prepare
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-zinc-400 max-w-lg mx-auto px-2">
            From low-latency bidirectional voice to cross-examination rubrics —
            a full mock interview suite.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
          {FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className={`p-4 sm:p-6 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/80 ${feat.border} transition-all duration-300 shadow-sm flex flex-col`}
              >
                <div
                  className={`h-9 w-9 sm:h-10 sm:w-10 rounded-lg ${feat.bg} border border-zinc-800/60 flex items-center justify-center mb-3 sm:mb-4`}
                >
                  <Icon className={`h-4.5 w-4.5 sm:h-5 sm:w-5 ${feat.color}`} />
                </div>
                <h3 className="font-semibold text-sm sm:text-base text-zinc-100 mb-1.5 sm:mb-2">
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

      {/* SECTION 3: HOW IT WORKS (Mobile-friendly Step Cards) */}
      <section className="relative min-h-0 sm:min-h-[85vh] flex flex-col justify-center max-w-5xl mx-auto px-4 sm:px-8 py-14 sm:py-24 border-t border-zinc-800/60">
        <div className="text-center mb-8 sm:mb-14">
          <Badge className="bg-zinc-900 border-zinc-800 text-zinc-400 text-[10px] sm:text-xs font-mono mb-2.5 sm:mb-3 px-3 py-1">
            Simple 3-Step Journey
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-2 sm:mb-3">
            How It Works
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-zinc-400 max-w-lg mx-auto px-2">
            Simulate realistic board interviews and track your progress in
            minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {STEPS.map((item) => (
            <div
              key={item.step}
              className="p-4 sm:p-6 rounded-xl border border-zinc-800/80 bg-zinc-900/30 flex flex-col justify-between hover:border-zinc-700 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <span className="inline-flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-md bg-zinc-800 text-zinc-200 text-xs font-mono font-bold">
                    {item.step}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[9px] sm:text-[10px] font-mono border-zinc-800 bg-zinc-950 text-zinc-400"
                  >
                    {item.tag}
                  </Badge>
                </div>
                <h3 className="font-semibold text-sm sm:text-base text-zinc-100 mb-1.5 sm:mb-2">
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

      {/* SECTION 4: CTA CALLOUT (Mobile-optimized) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-8 py-12 sm:py-20 text-center">
        <div className="p-6 sm:p-12 rounded-xl sm:rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/70 via-zinc-900/40 to-zinc-950 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent pointer-events-none" />
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3 sm:mb-4 text-zinc-100">
            Ready to Face the Board?
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-zinc-400 mb-6 sm:mb-8 max-w-lg mx-auto leading-relaxed px-2">
            Join aspirants mastering their poise, depth, and spontaneity with
            AI-powered board interviews.
          </p>
          <Link href="/signup" className="w-full sm:w-auto inline-block">
            <Button
              size="lg"
              className="w-full sm:w-auto h-11 sm:h-12 px-8 sm:px-10 text-sm font-semibold bg-zinc-100 text-zinc-950 hover:bg-white shadow-xl cursor-pointer"
            >
              Create Free Account
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Responsive Footer */}
      <footer className="h-auto sm:h-14 py-4 sm:py-0 px-4 sm:px-8 border-t border-zinc-800/80 bg-zinc-950 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left text-[11px] sm:text-xs text-zinc-500 font-mono">
        <div>BoardPrep AI — Competitive Exams Simulator</div>
        <div>Powered by Gemini Live API</div>
      </footer>
    </main>
  );
}
