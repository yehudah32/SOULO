export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase';

export async function PATCH(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
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
