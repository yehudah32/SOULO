export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase';
import { verifyUserCookie } from '@/lib/user-session';
import { isAdminAuthed } from '@/lib/admin-auth';

export async function PATCH(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    // Caller must own the session (or be an admin). Anonymous rows
    // (user_id null) remain writable by anyone with the sessionId, since
    // they predate the user-account flow.
    const adminOk = await isAdminAuthed(req);
    if (!adminOk) {
      const cookieUserId = await verifyUserCookie(req);
      const { data: row } = await adminClient
        .from('assessment_results')
        .select('user_id')
        .eq('session_id', sessionId)
        .maybeSingle();
      const rowUserId = (row as { user_id?: string | null } | null)?.user_id ?? null;
      if (rowUserId && rowUserId !== cookieUserId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    await adminClient
      .from('assessment_results')
      .update({ reveal_completed: true })
      .eq('session_id', sessionId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[reveal-complete] error:', err);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
