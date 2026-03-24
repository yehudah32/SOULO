import { NextResponse } from 'next/server';
import { getSession, setSession, type SessionData } from '@/lib/session-store';
import { isAdminAuthed } from '@/lib/admin-auth';

export async function POST(request: Request) {
  if (!isAdminAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { sessionId, patch } = await request.json() as {
      sessionId: string;
      patch: Partial<SessionData>;
    };

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    setSession(sessionId, patch);
    const updated = getSession(sessionId);

    console.log('[admin/simulate/set-state] Patched session:', sessionId, Object.keys(patch));

    return NextResponse.json({ sessionState: updated });
  } catch (err) {
    console.error('[admin/simulate/set-state] Error:', err);
    return NextResponse.json({ error: 'Failed to set state' }, { status: 500 });
  }
}
