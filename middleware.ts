import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, computeAdminToken, timingSafeEqualString } from '@/lib/admin-auth';

// Defense-in-depth security headers applied to every response.
function applySecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect all /admin routes except /admin/login
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const cookie = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const password = process.env.ADMIN_PASSWORD;

    let ok = false;
    if (password && cookie) {
      const expected = await computeAdminToken(password);
      ok = timingSafeEqualString(cookie, expected);
    }

    if (!ok) {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('from', pathname);
      return applySecurityHeaders(NextResponse.redirect(loginUrl));
    }
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  // Run on every path so headers apply globally; admin protection still gated by the
  // pathname check inside the function above.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
