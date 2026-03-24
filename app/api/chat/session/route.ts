import { NextRequest, NextResponse } from 'next/server';
import { getSession, getLatestCompletedSession } from '@/lib/session-store';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  const latest = searchParams.get('latest');

  if (sessionId) {
    const data = getSession(sessionId);
    if (!data) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    return NextResponse.json({ sessionId, ...data });
  }

  if (latest === 'true') {
    const result = getLatestCompletedSession();
    if (!result) return NextResponse.json({ error: 'No completed session found' }, { status: 404 });
    return NextResponse.json({ sessionId: result.sessionId, ...result.data });
  }

  return NextResponse.json({ error: 'Missing sessionId or latest param' }, { status: 400 });
}
