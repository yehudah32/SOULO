import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { signUserCookie, USER_COOKIE_NAME, USER_COOKIE_MAX_AGE } from '@/lib/user-session';

// ── Rate limiter (in-memory, resets on server restart) ──
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(email);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(email, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(request: Request) {
  try {
    const { email, passkey, firstName, lastName } = await request.json() as {
      email?: string;
      passkey?: string;
      firstName?: string;
      lastName?: string;
    };

    if (!email?.trim() || !passkey?.trim()) {
      return NextResponse.json({ error: 'Email and save key are required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPasskey = passkey.trim();

    if (cleanPasskey.length < 4) {
      return NextResponse.json({ error: 'Save key must be at least 4 characters.' }, { status: 400 });
    }

    // Rate limit check
    if (!checkRateLimit(cleanEmail)) {
      return NextResponse.json({ error: 'Too many attempts. Please try again in a few minutes.' }, { status: 429 });
    }

    // Check if user exists
    const { data: existing, error: lookupError } = await adminClient
      .from('users')
      .select('id, email, passkey, passkey_hashed')
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
      let isValid = false;

      if (existing.passkey_hashed) {
        // Already hashed — use bcrypt compare
        isValid = await bcrypt.compare(cleanPasskey, existing.passkey);
      } else {
        // Legacy plaintext — compare directly, then migrate to hashed
        isValid = existing.passkey === cleanPasskey;
        if (isValid) {
          // Auto-migrate: hash the passkey and update
          const hashed = await bcrypt.hash(cleanPasskey, 10);
          await adminClient
            .from('users')
            .update({ passkey: hashed, passkey_hashed: true })
            .eq('id', existing.id);
          console.log('[auth/user] Auto-migrated passkey to bcrypt for:', cleanEmail);
        }
      }

      if (!isValid) {
        return NextResponse.json({ error: 'Incorrect save key for this email.' }, { status: 401 });
      }
      userId = existing.id;
    } else {
      // New user — create account with hashed passkey
      const hashed = await bcrypt.hash(cleanPasskey, 10);
      // Try with name fields first, fall back without if columns don't exist
      let created: { id: string } | null = null;
      let createError;
      const insertData: Record<string, unknown> = { email: cleanEmail, passkey: hashed, passkey_hashed: true };
      if (firstName?.trim()) insertData.first_name = firstName.trim();
      if (lastName?.trim()) insertData.last_name = lastName.trim();

      const res1 = await adminClient.from('users').insert(insertData).select('id').single();
      if (res1.error && (res1.error.message.includes('first_name') || res1.error.message.includes('last_name'))) {
        // Columns don't exist — retry without name fields
        const res2 = await adminClient.from('users').insert({ email: cleanEmail, passkey: hashed, passkey_hashed: true }).select('id').single();
        created = res2.data;
        createError = res2.error;
      } else {
        created = res1.data;
        createError = res1.error;
      }

      if (createError || !created) {
        console.error('[auth/user] Create error:', createError?.message);
        return NextResponse.json({ error: 'Could not create account. Please try again.' }, { status: 500 });
      }
      userId = created.id;
      isNew = true;
    }

    // Fetch user's completed assessment sessions
    const { data: sessions } = await adminClient
      .from('assessment_results')
      .select('session_id, leading_type, confidence, tritype, exchange_count, created_at, reveal_completed')
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

    // Issue signed httpOnly session cookie. Server-side routes that handle
    // user-scoped data verify this signature instead of trusting a userId
    // query parameter from the client.
    const cookieValue = await signUserCookie(userId);
    const res = NextResponse.json({
      userId,
      email: cleanEmail,
      firstName: firstName?.trim() || null,
      isNew,
      sessions: sessions ?? [],
      inProgressSession: inProgress || null,
    });
    res.cookies.set(USER_COOKIE_NAME, cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: USER_COOKIE_MAX_AGE,
    });
    return res;
  } catch (err) {
    console.error('[auth/user] Error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
