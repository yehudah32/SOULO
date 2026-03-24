'use client';

import { useEffect, useState, useRef, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ResultsReveal from '@/components/assessment/ResultsReveal';

// Check if results are real (not empty/broken Type 0 data)
function isValidResults(r: Record<string, unknown>): boolean {
  const coreType = (r.leading_type || r.core_type) as number;
  if (!coreType || coreType === 0) return false;
  return true;
}

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [results, setResults] = useState<Record<string, unknown> | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);
  const loadedRef = useRef(false);

  // Multiple sessions
  const [sessionList, setSessionList] = useState<Array<{ session_id: string; leading_type: number; confidence: number; tritype: string; exchange_count: number; created_at: string }>>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerUserId, setPickerUserId] = useState<string | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPasskey, setLoginPasskey] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const loadResultsBySession = useCallback(async (sid: string) => {
    try {
      const res = await fetch(`/api/results/by-user?sessionId=${encodeURIComponent(sid)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && isValidResults(data.results)) {
          setSessionId(data.sessionId || sid);
          setResults(data.results);
          setLoading(false);
          setNeedsLogin(false);
          setShowPicker(false);
          return true;
        }
      }
    } catch { /* fall through */ }
    return false;
  }, []);

  const loadResultsByUser = useCallback(async (userId: string) => {
    try {
      // First check how many sessions this user has
      const listRes = await fetch(`/api/results/by-user?userId=${encodeURIComponent(userId)}&list=true`);
      if (listRes.ok) {
        const listData = await listRes.json();
        const sessions = (listData.sessions || []).filter((s: { leading_type: number }) => s.leading_type > 0);

        if (sessions.length > 1) {
          // Multiple sessions — show picker
          setSessionList(sessions);
          setPickerUserId(userId);
          setShowPicker(true);
          setLoading(false);
          setNeedsLogin(false);
          return true;
        }
      }

      // Single session or list failed — load latest directly
      const res = await fetch(`/api/results/by-user?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && isValidResults(data.results)) {
          setSessionId(data.sessionId);
          setResults(data.results);
          setLoading(false);
          setNeedsLogin(false);
          return true;
        }
      }
    } catch { /* fall through */ }
    return false;
  }, []);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    async function loadResults() {
      // Strategy 1: sessionId from URL or sessionStorage
      const sid =
        searchParams.get('sessionId') ||
        (typeof window !== 'undefined' ? sessionStorage.getItem('soulo_session_id') : null);

      if (sid) {
        setSessionId(sid);
        // Try loading existing results first (fast, no generation)
        try {
          const byUserRes = await fetch(`/api/results/by-user?sessionId=${encodeURIComponent(sid)}`);
          if (byUserRes.ok) {
            const byUserData = await byUserRes.json();
            if (byUserData.results && isValidResults(byUserData.results)) {
              setSessionId(byUserData.sessionId || sid);
              setResults(byUserData.results);
              setLoading(false);
              return;
            }
          }
        } catch { /* fall through */ }

        // Try generating if not found
        try {
          const res = await fetch('/api/results/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: sid }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.results && isValidResults(data.results)) {
              setResults(data.results);
              setLoading(false);
              return;
            }
          }
        } catch { /* fall through */ }

        // Session doesn't have results — clear stale sessionStorage
        if (typeof window !== 'undefined' && !searchParams.get('sessionId')) {
          sessionStorage.removeItem('soulo_session_id');
        }
      }

      // Strategy 2: userId from URL param
      const uid = searchParams.get('userId');
      if (uid) {
        if (await loadResultsByUser(uid)) return;
      }

      // Strategy 3: sessionId exists but in-memory session gone — try Supabase
      if (sid) {
        try {
          const res = await fetch(`/api/results/by-user?sessionId=${encodeURIComponent(sid)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.results && isValidResults(data.results)) {
              setSessionId(data.sessionId || sid);
              setResults(data.results);
              setLoading(false);
              return;
            }
          }
        } catch {
          // Fall through
        }
      }

      // No valid results found — clear stale session data and prompt login
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('soulo_session_id');
        sessionStorage.removeItem('soulo_email');
      }
      setNeedsLogin(true);
      setLoading(false);
    }

    loadResults();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        setLoginLoading(false);
        return;
      }

      // Try loading results for this user
      setLoading(true);
      const found = await loadResultsByUser(data.userId);
      if (!found) {
        setLoginError('No completed assessments found for this account.');
        setLoading(false);
        setNeedsLogin(true);
      }
    } catch {
      setLoginError('Something went wrong. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#FAF8F5] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-[#2563EB] border-t-transparent animate-spin" />
          <p className="font-sans text-sm text-[#6B6B6B]">Preparing your results…</p>
        </div>
      </div>
    );
  }

  // Session picker — user has multiple completed assessments
  if (showPicker && sessionList.length > 1 && !results) {
    const TYPE_NAMES: Record<number, string> = {
      1: 'Reformer', 2: 'Helper', 3: 'Achiever', 4: 'Individualist',
      5: 'Investigator', 6: 'Loyalist', 7: 'Enthusiast', 8: 'Challenger', 9: 'Peacemaker',
    };
    return (
      <div className="flex min-h-screen bg-[#FAF8F5] items-center justify-center px-5">
        <div className="max-w-[520px] w-full flex flex-col items-center text-center gap-6">
          <h1 className="font-serif text-[1.6rem] font-bold text-[#2C2C2C]">Your Assessments</h1>
          <p className="font-sans text-sm text-[#6B6B6B] leading-relaxed">
            You have {sessionList.length} completed assessments. Select which one to view.
          </p>
          <div className="w-full flex flex-col gap-3">
            {sessionList.map((s, i) => (
              <button
                key={s.session_id}
                onClick={async () => {
                  setLoading(true);
                  setShowPicker(false);
                  await loadResultsBySession(s.session_id);
                }}
                className="w-full bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_20px_rgba(37,99,235,0.12)] border border-transparent hover:border-[#2563EB]/20 transition-all text-left flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-full bg-[#2563EB] flex items-center justify-center flex-shrink-0">
                  <span className="font-serif text-xl font-bold text-white">{s.leading_type}</span>
                </div>
                <div className="flex-1">
                  <p className="font-serif text-[1rem] font-semibold text-[#2C2C2C]">
                    Type {s.leading_type} — {TYPE_NAMES[s.leading_type] || ''}
                  </p>
                  <p className="font-sans text-xs text-[#9B9590] mt-0.5">
                    {Math.round(s.confidence * 100)}% confidence
                    {s.tritype ? ` · Tritype ${s.tritype}` : ''}
                    {` · ${s.exchange_count} questions`}
                  </p>
                  <p className="font-sans text-xs text-[#D0CAC4] mt-0.5">
                    {new Date(s.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    {i === 0 ? ' (latest)' : ''}
                  </p>
                </div>
                <span className="font-sans text-sm text-[#2563EB]">&rarr;</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Login prompt
  if (needsLogin && !results) {
    return (
      <div className="flex min-h-screen bg-[#FAF8F5] items-center justify-center px-5">
        <div className="max-w-[400px] w-full flex flex-col items-center text-center gap-6">
          <h1 className="font-serif text-[1.6rem] font-bold text-[#2C2C2C]">View Your Results</h1>
          <p className="font-sans text-sm text-[#6B6B6B] leading-relaxed">
            Sign in with your email and save key to access your assessment results.
          </p>

          <div className="w-full border border-[#E8E4E0] rounded-2xl bg-white p-6 flex flex-col gap-3">
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
              <p className="font-sans text-xs text-[#DC2626]">{loginError}</p>
            )}
            <button
              onClick={handleLogin}
              disabled={loginLoading || !loginEmail.trim() || !loginPasskey.trim()}
              className="w-full font-sans text-sm bg-[#2563EB] text-white py-2.5 rounded-xl font-semibold hover:bg-[#1D4ED8] disabled:opacity-40 transition-colors"
            >
              {loginLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => router.push('/assessment')}
              className="font-sans text-sm text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
            >
              Take Assessment
            </button>
            <button
              onClick={() => router.push('/')}
              className="font-sans text-sm text-[#9B9590] hover:text-[#6B6B6B] transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!results || !sessionId) {
    return (
      <div className="flex min-h-screen bg-[#FAF8F5] items-center justify-center px-5">
        <div className="max-w-[480px] w-full flex flex-col items-center text-center gap-6">
          <h1 className="font-serif text-[1.8rem] font-bold text-[#2C2C2C]">No Results Found</h1>
          <p className="font-sans text-[#6B6B6B] leading-relaxed">
            We couldn&apos;t find your assessment results.
          </p>
          <button
            onClick={() => router.push('/assessment')}
            className="font-serif text-white bg-[#2563EB] rounded-2xl px-8 py-[0.875rem] hover:bg-[#1D4ED8] transition-colors"
          >
            Start New Assessment
          </button>
        </div>
      </div>
    );
  }

  return <ResultsReveal results={results} sessionId={sessionId} />;
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen bg-[#FAF8F5] items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-[#2563EB] border-t-transparent animate-spin" />
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
