'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Loader2, UserPlus, ArrowLeft, ExternalLink, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { signUp } from '@/lib/auth-client';

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (!geminiApiKey.trim()) {
      setError('Please provide your Gemini API key.');
      return;
    }

    setLoading(true);

    try {
      // 1. Create account via Better Auth
      const result = await signUp.email({ name, email, password });

      if (result.error) {
        setError(result.error.message ?? 'Failed to create account.');
        setLoading(false);
        return;
      }

      // 2. Store the API key via our profile endpoint
      const profileRes = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geminiApiKey: geminiApiKey.trim() }),
      });

      if (!profileRes.ok) {
        // Account created but key storage failed — not fatal, they can add it later
        console.warn('Failed to save API key, user can add it from dashboard.');
      }

      window.location.href = '/dashboard';
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
            Sign Up
          </Badge>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full h-9 px-3 rounded-md border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>

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
              placeholder="Min. 8 characters"
              className="w-full h-9 px-3 rounded-md border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Key className="h-3 w-3 text-amber-400" />
                Gemini API Key
              </span>
            </label>
            <input
              type="password"
              required
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full h-9 px-3 rounded-md border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
            />
            <a
              href="https://aistudio.google.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors mt-1.5 gap-1"
            >
              Get your free API key from Google AI Studio
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
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
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Create Account
              </>
            )}
          </Button>
        </form>

        <p className="text-xs text-zinc-500 mt-4 text-center">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
