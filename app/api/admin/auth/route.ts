import { NextRequest, NextResponse } from 'next/server';
import { computeAdminToken, ADMIN_COOKIE_NAME, timingSafeEqualString } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    return NextResponse.json(
      { error: 'ADMIN_PASSWORD not configured in environment' },
      { status: 500 }
    );
  }

  // Constant-time compare so a wrong password can't be distinguished by timing.
  if (typeof password !== 'string' || !timingSafeEqualString(password, expected)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  // Store an opaque, deterministic token derived from the password — never the
  // password itself. Middleware re-derives and compares in constant time.
  const token = await computeAdminToken(expected);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });
  return res;
}
