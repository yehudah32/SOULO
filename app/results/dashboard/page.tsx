'use client';

import { useEffect, useState, useRef, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ResultsDashboard from '@/components/assessment/ResultsDashboard';

function isValidResults(r: Record<string, unknown>): boolean {
  const coreType = (r.leading_type || r.core_type) as number;
  if (!coreType || coreType === 0) return false;
  return true;
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [results, setResults] = useState<Record<string, unknown> | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);

  const loadResultsByUser = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/results/by-user?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && isValidResults(data.results)) {
          setSessionId(data.sessionId);
          setResults(data.results);
          setLoading(false);
          return true;
        }
      }
    } catch { /* fall through */ }
    return false;
  }, []);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    async function load() {
      // Strategy 1: userId from URL
      const uid = searchParams.get('userId');
      if (uid) {
        if (await loadResultsByUser(uid)) return;
      }

      // Strategy 2: sessionId from URL or sessionStorage
      const sid = searchParams.get('sessionId') || (typeof window !== 'undefined' ? sessionStorage.getItem('soulo_session_id') : null);
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
        } catch { /* fall through */ }
      }

      setLoading(false);
    }

    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5]">
        <p className="font-serif italic text-[#9B9590]">Loading your dashboard...</p>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5]">
        <div className="text-center">
          <p className="font-serif text-xl text-[#2C2C2C] mb-4">No results found</p>
          <button onClick={() => router.push('/results')} className="font-sans text-sm text-[#2563EB] hover:underline">
            Go to Results
          </button>
        </div>
      </div>
    );
  }

  // Nuclear sanitize: recursively walk every value and convert any
  // object with {react, respond} keys into a string, at ANY depth.
  function nukeSanitize(val: unknown): unknown {
    if (val === null || val === undefined) return val;
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return val;
    if (Array.isArray(val)) return val.map(nukeSanitize);
    if (typeof val === 'object') {
      const o = val as Record<string, unknown>;
      // If this specific object has react+respond keys, convert to string
      if ('react' in o && 'respond' in o) {
        const parts: string[] = [];
        if (typeof o.react === 'string' && o.react) parts.push(o.react);
        if (typeof o.respond === 'string' && o.respond) parts.push(o.respond);
        return parts.join(' | ') || '';
      }
      // Otherwise recurse into all keys
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(o)) {
        out[k] = nukeSanitize(v);
      }
      return out;
    }
    return val;
  }

  const sanitized = nukeSanitize(results) as Record<string, unknown>;

  // Extract react/respond into top-level fields if not already strings
  if (typeof sanitized.react_pattern !== 'string' || !sanitized.react_pattern) {
    const ds = (typeof results.defiant_spirit === 'object' && results.defiant_spirit) as Record<string, unknown> | null;
    if (ds) {
      sanitized.react_pattern = typeof ds.react === 'string' ? ds.react : typeof ds.react_pattern_observed === 'string' ? ds.react_pattern_observed : '';
      sanitized.respond_pathway = typeof ds.respond === 'string' ? ds.respond : typeof ds.respond_glimpsed === 'string' ? ds.respond_glimpsed : '';
    }
  }

  return <ResultsDashboard results={sanitized} sessionId={sessionId} />;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#FAF8F5]"><p className="font-serif italic text-[#9B9590]">Loading...</p></div>}>
      <DashboardContent />
    </Suspense>
  );
}
