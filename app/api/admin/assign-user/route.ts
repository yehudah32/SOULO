import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { adminClient } from '@/lib/supabase';
import { isAdminAuthed } from '@/lib/admin-auth';

export async function POST(request: Request) {
  if (!(await isAdminAuthed(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { sessionId, email, passkey } = await request.json() as {
      sessionId: string;
      email: string;
      passkey: string;
    };

    if (!sessionId || !email || !passkey) {
      return NextResponse.json({ error: 'Missing sessionId, email, or passkey' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPasskey = passkey.trim();

    // Find or create user
    let userId: string;

    const { data: existing } = await adminClient
      .from('users')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existing) {
      userId = existing.id;
    } else {
      // Hash the passkey before storing — never persist plaintext.
      const hashedPasskey = await bcrypt.hash(cleanPasskey, 10);
      const { data: created, error: createErr } = await adminClient
        .from('users')
        .insert({ email: cleanEmail, passkey: hashedPasskey, passkey_hashed: true })
        .select('id')
        .single();

      if (createErr || !created) {
        return NextResponse.json({ error: 'Failed to create user: ' + (createErr?.message || '') }, { status: 500 });
      }
      userId = created.id;
    }

    // Assign user to assessment
    const { error: updateErr } = await adminClient
      .from('assessment_results')
      .update({ user_id: userId })
      .eq('session_id', sessionId);

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to assign: ' + updateErr.message }, { status: 500 });
    }

    // Also assign in progress table if exists
    await adminClient
      .from('assessment_progress')
      .update({ user_id: userId })
      .eq('session_id', sessionId);

    return NextResponse.json({ ok: true, userId, email: cleanEmail });
  } catch (err) {
    console.error('[admin/assign-user] Error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
