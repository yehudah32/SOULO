'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserSession {
  session_id: string;
  leading_type: number;
  confidence: number;
  tritype: string | null;
  created_at: string;
}

export default function Home() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<UserSession[]>([]);

  // Hydration guard — only show interactive elements after mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Sign-in form state
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPasskey, setLoginPasskey] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  async function handleLogin() {
    if (!loginEmail.trim() || !loginPasskey.trim()) {
      setLoginError('Email and save key are required.');
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/auth/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim(), passkey: loginPasskey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Login failed.');
        return;
      }
      // Priority 1: Has completed sessions → go to results
      if (data.sessions && data.sessions.length > 0) {
        router.push(`/results?userId=${encodeURIComponent(data.userId)}`);
        return;
      }

      // Priority 2: Has in-progress session → resume assessment
      if (data.inProgressSession) {
        const p = data.inProgressSession;
        router.push(
          `/assessment?resume=${encodeURIComponent(p.session_id)}` +
          `&userId=${encodeURIComponent(data.userId)}` +
          `&email=${encodeURIComponent(data.email)}`
        );
        return;
      }

      // Priority 3: No sessions at all — stay on page
      setLoggedIn(true);
      setUserEmail(data.email);
      setUserId(data.userId);
      setSessions([]);
      setShowLogin(false);
    } catch {
      setLoginError('Something went wrong. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  }

  function handleViewResults() {
    if (userId) {
      router.push(`/results?userId=${encodeURIComponent(userId)}`);
    } else {
      router.push('/results');
    }
  }

  const hasCompletedSession = sessions.length > 0;

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF8F5] landing-bg">
      {/* Subtle animation layers */}
      <div className="landing-glow" />
      <div className="landing-drift landing-drift--a" />
      <div className="landing-drift landing-drift--b" />
      <div className="landing-drift landing-drift--c" />
      <div className="landing-drift landing-drift--d" />

      {/* Nav */}
      <nav className="relative z-10 w-full px-6 py-4 border-b border-black/5 bg-white/80 backdrop-blur-sm flex items-center justify-between">
        <span className="font-serif text-xl font-semibold text-[#2563EB] tracking-tight">
          Soulo
        </span>
        <div className="flex items-center gap-4">
          {loggedIn && hasCompletedSession && (
            <button
              onClick={handleViewResults}
              className="font-sans text-sm text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
            >
              My Results
            </button>
          )}
          {loggedIn && (
            <span className="font-sans text-xs text-[#9B9590]">{userEmail}</span>
          )}
          {mounted && !loggedIn && (
            <button
              onClick={() => setShowLogin(true)}
              className="font-sans text-sm text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-20">
        <div className="max-w-xl w-full text-center flex flex-col items-center gap-6">
          <h1 className="font-serif text-5xl font-bold leading-tight text-[#2C2C2C]">
            Defy Your Number
          </h1>

          <p className="font-serif italic text-lg text-[#2563EB]">
            Live Your Spirit.
          </p>

          <p className="text-base text-[#6B6B6B] font-sans leading-relaxed max-w-md">
            Most Enneagram tests ask you to pick between options and tally a score.
            This is different. Soulo holds a real conversation — listening,
            adapting, and going deeper — to help you understand not just your type,
            but the pattern that drives everything you do.
          </p>

          <p className="text-sm text-[#9B9590] font-sans leading-relaxed max-w-sm">
            You are not a number. You are never a number.
            You are a defiant spirit.
          </p>

          {loggedIn && userId ? (
            <button
              onClick={() => router.push(
                `/assessment?userId=${encodeURIComponent(userId)}&email=${encodeURIComponent(userEmail)}`
              )}
              className="mt-4 inline-block bg-[#2563EB] text-white font-sans font-semibold text-base px-10 py-4 rounded-2xl shadow-sm transition-all duration-200 hover:bg-[#1D4ED8] hover:shadow-md active:bg-[#1E40AF]"
            >
              Begin New Assessment
            </button>
          ) : (
            <button
              onClick={() => {
                // Mark this as a fresh start so assessment page doesn't show resume
                sessionStorage.setItem('soulo_fresh_start', 'true');
                router.push('/assessment');
              }}
              className="mt-4 inline-block bg-[#2563EB] text-white font-sans font-semibold text-base px-10 py-4 rounded-2xl shadow-sm transition-all duration-200 hover:bg-[#1D4ED8] hover:shadow-md active:bg-[#1E40AF]"
            >
              Begin Your Assessment
            </button>
          )}

          <p className="text-xs text-[#9B9590] font-sans">
            15–20 minutes &middot; Adaptive &middot; No right or wrong answers
          </p>

          {/* Returning user — logged in but nothing found */}
          {loggedIn && !hasCompletedSession && (
            <p className="mt-4 font-sans text-sm text-[#9B9590]">
              Welcome back, {userEmail}. No saved progress found — start a new assessment above.
            </p>
          )}

          {/* Not logged in — sign in option (only after mount to avoid hydration mismatch) */}
          {mounted && !loggedIn && !showLogin && (
            <button
              onClick={() => setShowLogin(true)}
              className="mt-2 font-sans text-sm text-[#9B9590] hover:text-[#6B6B6B] underline underline-offset-2 transition-colors"
            >
              Sign in to resume or view your results
            </button>
          )}

          {/* Inline login form */}
          {mounted && !loggedIn && showLogin && (
            <div className="mt-4 w-full max-w-sm border border-[#E8E4E0] rounded-2xl bg-white p-6 flex flex-col gap-3">
              <p className="font-sans text-sm font-semibold text-[#2C2C2C]">Sign in to resume or view results</p>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="Email"
                className="w-full rounded-xl px-4 py-2.5 border border-[#E0DAD4] font-sans text-sm text-[#2C2C2C] placeholder-[#9B9590] bg-[#FAF8F5] focus:border-[#2563EB] focus:outline-none transition-colors"
              />
              <input
                type="text"
                value={loginPasskey}
                onChange={(e) => setLoginPasskey(e.target.value)}
                placeholder="Save key"
                onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
                className="w-full rounded-xl px-4 py-2.5 border border-[#E0DAD4] font-sans text-sm text-[#2C2C2C] placeholder-[#9B9590] bg-[#FAF8F5] focus:border-[#2563EB] focus:outline-none transition-colors"
              />
              {loginError && (
                <p className="font-sans text-xs text-[#1E3A8A]">{loginError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleLogin}
                  disabled={loginLoading || !loginEmail.trim() || !loginPasskey.trim()}
                  className="flex-1 font-sans text-sm bg-[#2563EB] text-white py-2.5 rounded-xl font-semibold hover:bg-[#1D4ED8] disabled:opacity-40 transition-colors"
                >
                  {loginLoading ? 'Signing in...' : 'Sign In'}
                </button>
                <button
                  onClick={() => { setShowLogin(false); setLoginError(''); }}
                  className="font-sans text-sm text-[#9B9590] px-3 hover:text-[#6B6B6B]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#E8E4E0] px-6 py-4 flex items-center justify-between bg-white/40 backdrop-blur-sm">
        <p className="font-sans text-xs text-[#9B9590]">
          Based on the Defiant Spirit methodology by Dr. Baruch HaLevi
        </p>
        <Link
          href="/admin/login"
          className="font-sans text-xs text-[#D0CAC4] hover:text-[#9B9590] transition-colors"
        >
          Admin
        </Link>
      </footer>
    </div>
  );
}
