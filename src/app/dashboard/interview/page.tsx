'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useInterviewStore } from '@/core/state/useInterviewStore';
import { InterviewSetup } from '@/components/interview/InterviewSetup';
import { LiveSessionView } from '@/components/interview/LiveSessionView';
import { FeedbackReport } from '@/components/interview/FeedbackReport';

/**
 * Interview flow page — the same setup → live → feedback phase machine
 * from the original root page, now nested under the authenticated dashboard.
 */
export default function InterviewPage() {
  const phase = useInterviewStore((s) => s.phase);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] w-full bg-zinc-950 text-zinc-100 overflow-x-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      <AnimatePresence mode="wait">
        {phase === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <InterviewSetup />
          </motion.div>
        )}
        {phase === 'live' && (
          <motion.div
            key="live"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <LiveSessionView />
          </motion.div>
        )}
        {phase === 'feedback' && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <FeedbackReport />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
