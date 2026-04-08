// Admin assessment simulator — SEND proxy.
//
// Thin wrapper around /api/chat. The admin simulator must hit the EXACT
// same code path as a real user so that everything fires:
//   - System prompt v2 (Whole Type Probing Strategy)
//   - History compression
//   - getResponseParts (forced_choice rescue)
//   - Validation + supervisor checks
//   - Disconfirmatory gate
//   - Phase manager
//   - Reverse shadow checkpoint
//   - Vector v1 + v2 shadow logging
//   - Tiebreaker detection
//   - lastQuestionContext capture
//   - Persistence to assessment_progress + assessment_results
//   - Yield updates and post-assessment evaluator
//
// Previously this route was a parallel implementation that had drifted
// significantly out of sync with the real chat route. The admin simulator
// was therefore testing OLD code, not what real users get.

export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session-store';
import { isAdminAuthed } from '@/lib/admin-auth';
import { adminClient } from '@/lib/supabase';

export async function POST(request: Request) {
  if (!(await isAdminAuthed(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { sessionId, message } = await request.json() as { sessionId: string; message: string };

    if (!sessionId || !message) {
      return NextResponse.json({ error: 'Missing sessionId or message' }, { status: 400 });
    }

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Build the messages array exactly as the real client (assessment page)
    // does — full conversation history plus the new user message at the end.
    // /api/chat reads this from request.body.messages.
    const messages = [
      ...session.conversationHistory.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.startsWith('localhost') ? 'http' : 'https';
    const chatUrl = `${protocol}://${host}/api/chat`;

    const res = await fetch(chatUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, sessionId }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('[admin/simulate/send] /api/chat failed:', res.status, errBody);
      return NextResponse.json({ error: 'Chat failed', detail: errBody }, { status: res.status });
    }

    const data = await res.json();

    // Augment with full session state for the admin inspector. The chat
    // route doesn't return this in its normal response — it's admin-only.
    const updatedSession = getSession(sessionId);

    // Pull the most recent shadow_mode_log entries for THIS exchange so the
    // simulator can show v1 + v2 predictions side-by-side in real time.
    // The shadow logger writes asynchronously after the chat returns; we
    // give it a tiny grace period before fetching.
    await new Promise((r) => setTimeout(r, 250));
    const { data: shadowRows } = await adminClient
      .from('shadow_mode_log')
      .select('phase, vector_top_type, vector_confidence, agreement, center_agreement, vector_type_scores, vector_center_scores, exchange_number, claude_top_type, claude_confidence')
      .eq('session_id', sessionId)
      .eq('exchange_number', updatedSession?.exchangeCount ?? 0)
      .order('id', { ascending: false });

    return NextResponse.json({
      response: data.response ?? data.message,
      message: data.message,
      internal: data.internal,
      response_parts: data.response_parts,
      isComplete: data.isComplete ?? false,
      stage: data.currentStage ?? data.stage,
      exchangeCount: updatedSession?.exchangeCount ?? 0,
      sessionState: updatedSession,
      shadowEntries: shadowRows ?? [],
    });
  } catch (err) {
    console.error('[admin/simulate/send] Error:', err);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
