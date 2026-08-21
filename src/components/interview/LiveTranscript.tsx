'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquareText, User, ShieldCheck } from 'lucide-react';
import type { TranscriptEntry } from '@/core/state/types';
import { cn } from '@/lib/utils';

interface LiveTranscriptProps {
  transcript: TranscriptEntry[];
  className?: string;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function LiveTranscript({ transcript, className }: LiveTranscriptProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom whenever transcript grows.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(id);
  }, [transcript]);

  return (
    <div
      className={cn(
        'surface-panel rounded-lg p-4 flex flex-col h-full border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-sm',
        className,
      )}
    >
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-zinc-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Real-time Exchange Transcript
          </h3>
        </div>
        <span className="text-[11px] font-mono text-zinc-400 bg-zinc-800/60 px-2 py-0.5 rounded border border-zinc-700/40">
          {transcript.length} {transcript.length === 1 ? 'turn' : 'turns'}
        </span>
      </div>

      <div
        ref={viewportRef}
        className="flex-1 overflow-y-auto custom-scroll pr-1.5 space-y-3"
      >
        <AnimatePresence initial={false}>
          {transcript.length === 0 ? (
            <div
              key="empty"
              className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500"
            >
              <div className="h-8 w-8 rounded-md bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mb-2">
                <MessageSquareText className="h-4 w-4 text-zinc-400" />
              </div>
              <p className="text-xs font-medium text-zinc-400">Board chamber is quiet</p>
              <p className="text-[11px] text-zinc-500 max-w-[220px] mt-0.5">
                Spoken dialogue will appear here live as you and the board interact.
              </p>
            </div>
          ) : (
            transcript.map((entry) => {
              const isUser = entry.role === 'user';
              return (
                <motion.div
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className={cn(
                    'flex flex-col',
                    isUser ? 'items-end' : 'items-start',
                  )}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] text-zinc-400 font-mono">
                    {isUser ? (
                      <>
                        <span className="text-zinc-500">{formatTime(entry.timestamp)}</span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 font-medium text-[10px] border border-emerald-500/20">
                          <User className="h-2.5 w-2.5" />
                          Candidate
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 font-medium text-[10px] border border-indigo-500/20">
                          <ShieldCheck className="h-2.5 w-2.5" />
                          Board Panel
                        </span>
                        <span className="text-zinc-500">{formatTime(entry.timestamp)}</span>
                      </>
                    )}
                  </div>
                  <div
                    className={cn(
                      'max-w-[92%] px-3 py-2 rounded-md text-[13px] leading-relaxed border transition-colors',
                      isUser
                        ? 'bg-zinc-800/80 border-zinc-700/70 text-zinc-100 rounded-tr-none'
                        : 'bg-zinc-900/90 border-zinc-800 text-zinc-200 rounded-tl-none',
                    )}
                  >
                    {entry.text}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
