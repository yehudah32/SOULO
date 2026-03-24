import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { email, passkey } = await request.json() as {
      email?: string;
      passkey?: string;
    };

    if (!email?.trim() || !passkey?.trim()) {
      return NextResponse.json({ error: 'Email and save key are required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPasskey = passkey.trim();

    if (cleanPasskey.length < 4) {
      return NextResponse.json({ error: 'Save key must be at least 4 characters.' }, { status: 400 });
    }

    // Check if user exists
    const { data: existing, error: lookupError } = await adminClient
      .from('users')
      .select('id, email, passkey')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (lookupError) {
      console.error('[auth/user] Lookup error:', lookupError.message);
      return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    let userId: string;
    let isNew = false;

    if (existing) {
      // User exists — verify passkey
      if (existing.passkey !== cleanPasskey) {
        return NextResponse.json({ error: 'Incorrect save key for this email.' }, { status: 401 });
      }
      userId = existing.id;
    } else {
      // New user — create account
      const { data: created, error: createError } = await adminClient
        .from('users')
        .insert({ email: cleanEmail, passkey: cleanPasskey })
        .select('id')
        .single();

      if (createError) {
        console.error('[auth/user] Create error:', createError.message);
        return NextResponse.json({ error: 'Could not create account. Please try again.' }, { status: 500 });
      }
      userId = created.id;
      isNew = true;
    }

    // Fetch user's completed assessment sessions
    const { data: sessions } = await adminClient
      .from('assessment_results')
      .select('session_id, leading_type, confidence, tritype, exchange_count, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Check for in-progress (incomplete) session
    const { data: inProgress } = await adminClient
      .from('assessment_progress')
      .select('session_id, exchange_count, current_stage, updated_at')
      .eq('user_id', userId)
      .eq('is_complete', false)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      userId,
      email: cleanEmail,
      isNew,
      sessions: sessions ?? [],
      inProgressSession: inProgress || null,
    });
  } catch (err) {
    console.error('[auth/user] Error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
