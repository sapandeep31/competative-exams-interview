import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { userProfiles } from '@/lib/schema';
import { encryptApiKey } from '@/lib/crypto';

/**
 * GET /api/user/profile
 * Returns the user's profile with API key status (never the raw key).
 */
export async function GET() {
  const session = await getAuthenticatedUser();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, session.user.id),
  });

  return NextResponse.json({
    userId: session.user.id,
    name: session.user.name,
    email: session.user.email,
    hasApiKey: !!profile?.geminiApiKeyEncrypted,
    createdAt: profile?.createdAt ?? null,
  });
}

/**
 * PUT /api/user/profile
 * Updates (or creates) the user's Gemini API key.
 * Body: { geminiApiKey: string }
 */
export async function PUT(request: Request) {
  const session = await getAuthenticatedUser();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { geminiApiKey } = body;

  if (!geminiApiKey || typeof geminiApiKey !== 'string' || !geminiApiKey.trim()) {
    return NextResponse.json({ error: 'geminiApiKey is required' }, { status: 400 });
  }

  const encrypted = encryptApiKey(geminiApiKey.trim());

  // Upsert: check if profile exists
  const existing = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, session.user.id),
  });

  if (existing) {
    await db
      .update(userProfiles)
      .set({ geminiApiKeyEncrypted: encrypted })
      .where(eq(userProfiles.userId, session.user.id));
  } else {
    await db.insert(userProfiles).values({
      userId: session.user.id,
      geminiApiKeyEncrypted: encrypted,
    });
  }

  return NextResponse.json({ success: true });
}
