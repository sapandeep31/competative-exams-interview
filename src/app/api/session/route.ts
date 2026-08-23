import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_MODEL } from '@/core/gemini/live-config';
import { getRandomGeminiApiKey } from '@/lib/gemini-keys';
import { getAuthenticatedUser, getUserApiKey } from '@/lib/auth-helpers';

export const runtime = 'nodejs';

/**
 * POST /api/session
 *
 * Brokers the Gemini API key for the client. Priority:
 * 1. Authenticated user's stored (encrypted) API key from DB
 * 2. Explicit key sent in request body
 * 3. Random server-side env key
 *
 * Returns: { apiKey, model, endpoint } so the client can open the WebSocket
 * directly to Gemini's Live API endpoint.
 */
export async function POST(req: NextRequest) {
  let body: { apiKey?: string } = {};
  try {
    body = await req.json();
  } catch {
    // Empty / invalid body is fine — we'll fall back.
  }

  // Try authenticated user's stored key first
  let apiKey: string | undefined;
  const session = await getAuthenticatedUser();
  if (session?.user) {
    apiKey = await getUserApiKey(session.user.id);
  }

  // Fall back to body-supplied or env keys
  if (!apiKey) {
    apiKey = getRandomGeminiApiKey(body.apiKey);
  }

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'No Gemini API key available. Add one from your dashboard or set GEMINI_API_KEYS in .env.local.',
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    apiKey,
    model: DEFAULT_MODEL,
    endpoint:
      'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent',
  });
}
