import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { interviews } from '@/lib/schema';

/**
 * GET /api/user/interviews
 * Lists all interviews for the authenticated user, newest first.
 */
export async function GET() {
  const session = await getAuthenticatedUser();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = await db
    .select({
      id: interviews.id,
      candidateName: interviews.candidateName,
      examCategory: interviews.examCategory,
      simulationMode: interviews.simulationMode,
      inputMode: interviews.inputMode,
      overallScore: interviews.overallScore,
      verdict: interviews.verdict,
      durationSeconds: interviews.durationSeconds,
      createdAt: interviews.createdAt,
    })
    .from(interviews)
    .where(eq(interviews.userId, session.user.id))
    .orderBy(desc(interviews.createdAt));

  return NextResponse.json({ interviews: results });
}

/**
 * POST /api/user/interviews
 * Saves a completed interview with its feedback.
 * Body: {
 *   candidateName, examCategory, simulationMode, inputMode,
 *   overallScore, verdict, durationSeconds, feedbackJson, configJson
 * }
 */
export async function POST(request: Request) {
  const session = await getAuthenticatedUser();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const {
    candidateName,
    examCategory,
    simulationMode,
    inputMode = 'audio_only',
    overallScore,
    verdict,
    durationSeconds,
    feedbackJson,
    configJson,
  } = body;

  if (!candidateName || !examCategory || !simulationMode) {
    return NextResponse.json(
      { error: 'candidateName, examCategory, and simulationMode are required.' },
      { status: 400 },
    );
  }

  const [inserted] = await db
    .insert(interviews)
    .values({
      userId: session.user.id,
      candidateName,
      examCategory,
      simulationMode,
      inputMode,
      overallScore: overallScore ?? null,
      verdict: verdict ?? null,
      durationSeconds: durationSeconds ?? 0,
      feedbackJson: feedbackJson ?? null,
      configJson: configJson ?? null,
    })
    .returning({ id: interviews.id });

  return NextResponse.json({ id: inserted.id }, { status: 201 });
}
