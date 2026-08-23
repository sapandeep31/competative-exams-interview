'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, User, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSession, signOut } from '@/lib/auth-client';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: session } = useSession();

  async function handleSignOut() {
    await signOut();
    window.location.href = '/';
  }

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100">
      {/* Top Nav */}
      <header className="h-14 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse" />
            <span className="font-bold text-sm tracking-tight text-zinc-100">
              BoardPrep AI
            </span>
          </Link>
          <Badge
            variant="outline"
            className="text-[10px] font-mono border-zinc-800 bg-zinc-900/80 text-zinc-400 px-1.5 py-0 hidden sm:inline-flex"
          >
            <LayoutDashboard className="h-2.5 w-2.5 mr-1" />
            Dashboard
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          {session?.user && (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <User className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{session.user.name || session.user.email}</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="h-8 text-xs text-zinc-400 hover:text-zinc-100 gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main>{children}</main>
    </div>
  );
}
