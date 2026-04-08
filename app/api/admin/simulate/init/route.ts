// Admin assessment simulator — INIT proxy.
//
// This is a thin wrapper around /api/chat/init. The simulator must run the
// EXACT same code path as a real user assessment so that:
//   1. The system prompt v2 (with Whole Type Probing Strategy) is in effect
//   2. Vector v2 shadow logging fires for every turn
//   3. Tiebreaker detection runs
//   4. lastQuestionContext is captured
//   5. All validation, supervisor, and persistence side effects happen
//
// Previously this route had its own parallel Claude call with the OLD
// system prompt — that drift meant simulator data did NOT reflect what real
// users got. We now forward to /api/chat/init via fetch and augment the
// response with sessionState for the inspector panel.

export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session-store';
import { isAdminAuthed } from '@/lib/admin-auth';

export async function POST(request: Request) {
  if (!(await isAdminAuthed(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Forward an empty body to /api/chat/init — same as a real user clicking
    // "start assessment". The init route handles VECTOR_MODE, hybrid setup,
    // pre-written opening, etc.
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.startsWith('localhost') ? 'http' : 'https';
    const initUrl = `${protocol}://${host}/api/chat/init`;

    const res = await fetch(initUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Empty body — admin simulator does not pass email/userId/demographics
      // so the session is anonymous. This mirrors a brand-new user's flow.
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('[admin/simulate/init] /api/chat/init failed:', res.status, errBody);
      return NextResponse.json({ error: 'Init failed', detail: errBody }, { status: res.status });
    }

    const data = await res.json();

    // Augment with full session state so the admin inspector panel can
    // display internal hypothesis, vector scores, etc. /api/chat/init does
    // not normally return this — it's an admin-only field.
    const session = getSession(data.sessionId);

    return NextResponse.json({
      sessionId: data.sessionId,
      response: data.response,
      message: data.message,
      internal: data.internal,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response_parts: (data.internal as any)?.response_parts ?? null,
      currentSection: data.currentSection,
      sessionState: session,
      vectorV2State: session?.vectorScoresV2 ?? null,
    });
  } catch (err) {
    console.error('[admin/simulate/init] Error:', err);
    return NextResponse.json({ error: 'Failed to init simulation session' }, { status: 500 });
  }
}
