import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { interviews } from '@/lib/schema';

/**
 * GET /api/user/interviews/[id]
 * Returns a single interview by ID, with ownership check.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAuthenticatedUser();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const interview = await db.query.interviews.findFirst({
    where: and(
      eq(interviews.id, id),
      eq(interviews.userId, session.user.id),
    ),
  });

  if (!interview) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(interview);
}
