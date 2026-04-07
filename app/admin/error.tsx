'use client';

import { useEffect } from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[admin] Error boundary caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5] px-6">
      <div className="max-w-md text-center">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-[#9B9590] mb-2">
          Admin error
        </p>
        <h1 className="font-serif text-2xl text-[#2C2C2C] mb-3">Something went wrong.</h1>
        <p className="font-sans text-sm text-[#6B6B6B] mb-6">
          The admin panel hit an unexpected error. The details have been logged.
        </p>
        {error?.digest && (
          <p className="font-mono text-[0.65rem] text-[#9B9590] mb-6">ref: {error.digest}</p>
        )}
        <button
          onClick={() => reset()}
          className="px-5 py-2 rounded-full bg-[#2C2C2C] text-white font-sans text-sm hover:bg-black transition"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
