'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TranscriptEntry } from '@/core/state/types';
import { cn } from '@/lib/utils';

interface LiveTranscriptProps {
  transcript: TranscriptEntry[];
  className?: string;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function LiveTranscript({ transcript, className }: LiveTranscriptProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom whenever transcript grows.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    // Defer one frame so the new bubble has rendered.
    const id = requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(id);
  }, [transcript]);

  return (
    <div
      className={cn(
        'glass-panel rounded-2xl p-4 h-72 sm:h-80 flex flex-col',
        className,
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-300">Live Transcript</h3>
        <span className="text-xs text-slate-500">
          {transcript.length} messages
        </span>
      </div>
      <div
        ref={viewportRef}
        className="flex-1 overflow-y-auto custom-scroll pr-2"
      >
        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {transcript.length === 0 && (
              <div
                key="empty"
                className="text-center text-sm text-slate-500 py-8"
              >
                Transcript will appear here as the conversation unfolds.
              </div>
            )}
            {transcript.map((entry) => {
              const isUser = entry.role === 'user';
              return (
                <motion.div
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className={cn(
                    'flex flex-col max-w-[85%]',
                    isUser ? 'self-end items-end' : 'self-start items-start',
                  )}
                >
                  <div className="flex items-center gap-2 mb-1 text-[10px] uppercase tracking-wide text-slate-500">
                    <span>{isUser ? 'You' : 'Interviewer'}</span>
                    <span aria-hidden>·</span>
                    <span>{formatTime(entry.timestamp)}</span>
                  </div>
                  <div
                    className={cn(
                      'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-md backdrop-blur-md border break-words',
                      isUser
                        ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-50 rounded-br-md'
                        : 'bg-indigo-500/15 border-indigo-400/30 text-indigo-50 rounded-bl-md',
                    )}
                  >
                    {entry.text}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
