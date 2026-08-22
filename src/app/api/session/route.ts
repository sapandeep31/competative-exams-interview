import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_MODEL } from '@/core/gemini/live-config';

import { getRandomGeminiApiKey } from '@/lib/gemini-keys';

export const runtime = 'nodejs';

/**
 * POST /api/session
 *
 * Brokers the Gemini API key for the client. The client never reads
 * process.env directly — it sends an optional user-supplied key here, and
 * we fall back to a random server-side GEMINI_API_KEY from available env keys.
 *
 * Returns: { apiKey, model, endpoint } so the client can open the WebSocket
 * directly to Gemini's Live API endpoint.
 */
export async function POST(req: NextRequest) {
  let body: { apiKey?: string } = {};
  try {
    body = await req.json();
  } catch {
    // Empty / invalid body is fine — we'll fall back to the env var.
  }

  const apiKey = getRandomGeminiApiKey(body.apiKey);
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'No Gemini API key available. Set GEMINI_API_KEYS in .env.local or provide one in the setup screen.',
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
