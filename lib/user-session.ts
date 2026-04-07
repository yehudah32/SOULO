// Server-side user session helpers.
//
// We sign the userId with an HMAC keyed by SOULO_USER_COOKIE_SECRET (or, for
// dev convenience, a secret derived from ADMIN_PASSWORD as a fallback) and
// store the result in an httpOnly cookie. Routes that handle user-scoped data
// MUST call verifyUserCookie() and reject when the cookie is missing or the
// signature doesn't match the requested userId.
//
// This file uses Web Crypto only — safe for both Node and Edge runtimes.

const COOKIE_NAME = 'soulo_user';
const SALT = 'soulo-user-cookie-v1';

function getSecret(): string {
  return (
    process.env.SOULO_USER_COOKIE_SECRET ||
    process.env.ADMIN_PASSWORD ||
    'soulo-dev-fallback-secret-do-not-use-in-prod'
  );
}

async function hmacHex(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSecret() + SALT),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/** Build the cookie value: `<userId>.<hmac>`. */
export async function signUserCookie(userId: string): Promise<string> {
  const sig = await hmacHex(userId);
  return `${userId}.${sig}`;
}

/**
 * Verify the soulo_user cookie on a request and return the verified userId,
 * or null if absent / tampered.
 */
export async function verifyUserCookie(request: Request): Promise<string | null> {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const raw = match?.[1];
  if (!raw) return null;
  const decoded = decodeURIComponent(raw);
  const dot = decoded.lastIndexOf('.');
  if (dot < 0) return null;
  const userId = decoded.slice(0, dot);
  const sig = decoded.slice(dot + 1);
  if (!userId || !sig) return null;
  const expected = await hmacHex(userId);
  return timingSafeEqualString(sig, expected) ? userId : null;
}

export const USER_COOKIE_NAME = COOKIE_NAME;
export const USER_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
