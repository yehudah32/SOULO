import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase';
import { initSession, setSession } from '@/lib/session-store';

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }

  const { data, error } = await adminClient
    .from('assessment_progress')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // If session is already complete, don't resume — redirect to results
  if (data.is_complete) {
    return NextResponse.json({ error: 'Session already complete', isComplete: true }, { status: 410 });
  }

  // Look up user email if we have a user_id
  let email = '';
  if (data.user_id) {
    const { data: user } = await adminClient
      .from('users')
      .select('email')
      .eq('id', data.user_id)
      .single();
    if (user) email = user.email;
  }

  // Reconstruct the in-memory session from saved progress
  initSession(sessionId);
  setSession(sessionId, {
    userId: data.user_id || '',
    email,
    conversationHistory: data.conversation_history || [],
    internalState: data.internal_state || null,
    exchangeCount: data.exchange_count || 0,
    currentStage: data.current_stage || 1,
    lastQuestionFormat: data.last_question_format || '',
    isComplete: false,
  });

  return NextResponse.json({
    sessionId,
    userId: data.user_id || '',
    email,
    conversationHistory: data.conversation_history || [],
    internalState: data.internal_state || null,
    exchangeCount: data.exchange_count || 0,
    currentStage: data.current_stage || 1,
    isComplete: false,
  });
}
