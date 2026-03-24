import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const userId = req.cookies.get('soulo_user')?.value;

  if (!userId) {
    return NextResponse.json({ sessions: [], loggedIn: false });
  }

  const { data: sessions, error } = await adminClient
    .from('assessment_results')
    .select('session_id, leading_type, confidence, tritype, exchange_count, created_at, generated_results')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[auth/sessions] Error:', error.message);
    return NextResponse.json({ sessions: [], loggedIn: true, userId });
  }

  // Get user email
  const { data: user } = await adminClient
    .from('users')
    .select('email')
    .eq('id', userId)
    .single();

  return NextResponse.json({
    sessions: sessions ?? [],
    loggedIn: true,
    userId,
    email: user?.email ?? '',
  });
}
