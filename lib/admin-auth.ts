// Edge-runtime-safe admin auth helpers.
// Used by /api/admin/auth (Node runtime) and middleware.ts (Edge runtime),
// so we rely on the Web Crypto API (crypto.subtle) instead of node:crypto.

const SALT = 'soulo-admin-cookie-v1';

/**
 * Derive a deterministic, opaque token from the admin password.
 * The token is what we store in the cookie — never the password itself.
 * SHA-256 of (password + salt), hex-encoded.
 */
export async function computeAdminToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`${password}${SALT}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Constant-time string comparison. Avoids early-exit timing leaks that
 * `===` would expose when validating the admin cookie.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export const ADMIN_COOKIE_NAME = 'admin_authed';

/**
 * Async server-side check for API routes that need to verify the admin cookie.
 * Replaces the previous synchronous helper that compared the cookie value
 * directly to ADMIN_PASSWORD.
 */
export async function isAdminAuthed(request: Request): Promise<boolean> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(new RegExp(`${ADMIN_COOKIE_NAME}=([^;]+)`));
  const token = match?.[1];
  if (!token) return false;
  const expected = await computeAdminToken(password);
  return timingSafeEqualString(token, expected);
}
