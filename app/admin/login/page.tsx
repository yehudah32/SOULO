'use client';

import { useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');

      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        // Full page navigation so the cookie is sent on the server-component fetch
        window.location.href = searchParams.get('from') || '/admin';
      } else {
        setError('Incorrect password');
        setLoading(false);
      }
    },
    [password, router, searchParams]
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5]">
      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-8 w-full max-w-[360px] flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <p className="font-serif text-[1.2rem] font-semibold text-[#2563EB]">Soulo Admin</p>
          <p className="font-sans text-sm text-[#6B6B6B]">Assessment dashboard — restricted access.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="rounded-2xl px-4 py-3 border border-[#E0DAD4] font-sans text-sm text-[#2C2C2C] placeholder-[#9B9590] bg-[#FAF8F5] focus:border-[#2563EB] focus:outline-none transition-colors"
          />
          {error && (
            <p className="font-sans text-xs text-red-500 px-1">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="font-serif text-white bg-[#2563EB] rounded-2xl py-3 text-sm font-semibold hover:bg-[#1D4ED8] active:bg-[#1E40AF] disabled:opacity-40 transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
