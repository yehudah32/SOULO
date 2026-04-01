'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SouloNav from '@/components/ui/soulo-nav';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [passkey, setPasskey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignIn() {
    if (!email.trim() || !passkey.trim()) {
      setError('Email and save key are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), passkey: passkey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Sign in failed.');
        setLoading(false);
        return;
      }

      // Store user info for session
      if (typeof window !== 'undefined') {
        localStorage.setItem('soulo_user_id', data.userId);
        localStorage.setItem('soulo_email', data.email);
        if (data.firstName) localStorage.setItem('soulo_first_name', data.firstName);
      }

      // Smart routing based on what the user has
      const completedSessions = (data.sessions || []).filter((s: { leading_type: number }) => s.leading_type > 0);

      if (completedSessions.length > 0) {
        const latest = completedSessions[0] as { session_id: string; reveal_completed?: boolean };
        // Check DB flag OR client-side localStorage flag
        const clientRevealDone = typeof window !== 'undefined' && localStorage.getItem('soulo_reveal_complete_' + latest.session_id) === 'true';
        if (latest.reveal_completed || clientRevealDone) {
          // Already viewed results → go straight to portal mode
          if (typeof window !== 'undefined') {
            localStorage.setItem('soulo_active_session_id', latest.session_id);
          }
          router.push(`/results?sessionId=${encodeURIComponent(latest.session_id)}`);
        } else {
          // Has results but hasn't completed reveal → go to results reveal
          router.push(`/results?userId=${encodeURIComponent(data.userId)}`);
        }
      } else {
        // No completed results — check localStorage for an active session with results
        const storedSid = typeof window !== 'undefined' ? localStorage.getItem('soulo_active_session_id') : null;
        if (storedSid) {
          const clientRevealDone = typeof window !== 'undefined' && localStorage.getItem('soulo_reveal_complete_' + storedSid) === 'true';
          if (clientRevealDone) {
            router.push(`/results?sessionId=${encodeURIComponent(storedSid)}`);
            return;
          }
        }

        if (data.inProgressSession) {
          // Has in-progress assessment → resume it
          if (typeof window !== 'undefined') {
            localStorage.setItem('soulo_active_session_id', data.inProgressSession.session_id);
          }
          router.push('/assessment');
        } else {
          // Account exists but nothing started → go to assessment
          router.push('/assessment');
        }
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col">
      <SouloNav loggedIn={false} />

      <div className="flex-1 flex items-center justify-center px-5 py-16">
        <div className="max-w-[420px] w-full flex flex-col items-center gap-8">

          {/* Header */}
          <div className="text-center">
            <h1 className="font-serif text-[1.8rem] font-bold text-[#2C2C2C] leading-tight">Welcome to Soulo</h1>
            <p className="font-sans text-[0.85rem] text-[#6B6B6B] mt-2 leading-relaxed">
              Sign in to view your results, or start a new assessment.
            </p>
          </div>

          {/* Sign In Form */}
          <div className="w-full border border-[#E8E4E0] rounded-2xl bg-white p-6 flex flex-col gap-3 shadow-sm">
            <p className="font-sans text-xs uppercase tracking-wider text-[#9B9590] font-semibold mb-1">Sign In</p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-xl px-4 py-2.5 border border-[#E0DAD4] font-sans text-sm text-[#2C2C2C] placeholder-[#9B9590] bg-[#FAF8F5] focus:border-[#2563EB] focus:outline-none transition-colors"
            />
            <input
              type="text"
              value={passkey}
              onChange={(e) => setPasskey(e.target.value)}
              placeholder="Save key"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSignIn(); }}
              className="w-full rounded-xl px-4 py-2.5 border border-[#E0DAD4] font-sans text-sm text-[#2C2C2C] placeholder-[#9B9590] bg-[#FAF8F5] focus:border-[#2563EB] focus:outline-none transition-colors"
            />
            {error && (
              <p className="font-sans text-xs text-[#DC2626]">{error}</p>
            )}
            <button
              onClick={handleSignIn}
              disabled={loading || !email.trim() || !passkey.trim()}
              className="w-full font-sans text-sm bg-[#2563EB] text-white py-2.5 rounded-xl font-semibold hover:bg-[#1D4ED8] disabled:opacity-40 transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-[#E8E4E0]" />
            <span className="font-sans text-xs text-[#9B9590]">or</span>
            <div className="flex-1 h-px bg-[#E8E4E0]" />
          </div>

          {/* New Assessment CTA */}
          <div className="w-full border border-[#E8E4E0] rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="font-serif text-[1.05rem] font-semibold text-[#2C2C2C] mb-1">New here?</p>
            <p className="font-sans text-[0.8rem] text-[#6B6B6B] mb-4 leading-relaxed">
              Begin your personality assessment. No account needed to start.
            </p>
            <Link
              href="/assessment"
              className="inline-block w-full font-sans text-sm bg-[#2C2C2C] text-white py-2.5 rounded-xl font-semibold hover:bg-[#1a1a1a] transition-colors text-center"
            >
              Begin Assessment
            </Link>
          </div>

          {/* Footer link */}
          <p className="font-sans text-xs text-[#9B9590]">
            Already took the assessment? Sign in above to access your results.
          </p>
        </div>
      </div>
    </div>
  );
}
