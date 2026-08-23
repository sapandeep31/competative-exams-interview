'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Loader2, LogIn, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { signIn } from '@/lib/auth-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message ?? 'Invalid email or password.');
        setLoading(false);
      } else {
        window.location.href = '/dashboard';
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-sm"
    >
      <Link
        href="/"
        className="inline-flex items-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-6 gap-1"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to home
      </Link>

      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-6">
        <div className="flex items-center gap-2.5 mb-6">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse" />
          <span className="font-bold text-sm tracking-tight text-zinc-100">
            BoardPrep AI
          </span>
          <Badge
            variant="outline"
            className="text-[10px] font-mono border-zinc-800 bg-zinc-900/80 text-zinc-400 px-1.5 py-0 ml-auto"
          >
            Sign In
          </Badge>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full h-9 px-3 rounded-md border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full h-9 px-3 rounded-md border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-9 text-xs font-semibold bg-zinc-100 text-zinc-950 hover:bg-white disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <LogIn className="h-3.5 w-3.5 mr-1.5" />
                Sign In
              </>
            )}
          </Button>
        </form>

        <p className="text-xs text-zinc-500 mt-4 text-center">
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Sign up
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
