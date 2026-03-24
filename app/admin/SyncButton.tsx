'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function SyncButton() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSync = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await fetch('/api/admin/backfill', { method: 'POST' });
      const data = await res.json();
      setMessage(data.message ?? 'Done');
      setStatus('done');
      if (data.saved > 0) router.refresh();
    } catch {
      setMessage('Sync failed — check server logs');
      setStatus('error');
    }
  }, [router]);

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSync}
        disabled={status === 'loading'}
        className={`font-sans text-xs px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 ${
          status === 'done'
            ? 'border-[#7A9E7E] text-[#7A9E7E] bg-[#EFF6F0]'
            : status === 'error'
            ? 'border-red-300 text-red-500 bg-red-50'
            : 'border-[#D0CAC4] text-gray-700 hover:border-soulo-purple hover:text-soulo-purple'
        }`}
      >
        {status === 'loading' ? 'Syncing…' : status === 'done' ? '✓ Synced' : 'Sync in-memory sessions'}
      </button>
      {message && (
        <span className="font-sans text-xs text-gray-500">{message}</span>
      )}
    </div>
  );
}
