'use client';

import { useState } from 'react';

interface AssignUserFormProps {
  sessionId: string;
}

export default function AssignUserForm({ sessionId }: AssignUserFormProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [passkey, setPasskey] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);

  async function handleAssign() {
    if (!email.trim() || !passkey.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/assign-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, email: email.trim(), passkey: passkey.trim() }),
      });
      if (res.ok) {
        setResult('success');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setResult('error');
      }
    } catch {
      setResult('error');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="font-sans text-xs text-[#7A9E7E] hover:text-[#5A7A5E] ml-2"
      >
        Assign
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-1">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="font-sans text-xs border border-[#E0DAD4] rounded-lg px-2 py-1 w-36 focus:border-[#2563EB] focus:outline-none"
      />
      <input
        type="text"
        value={passkey}
        onChange={(e) => setPasskey(e.target.value)}
        placeholder="Save key"
        className="font-sans text-xs border border-[#E0DAD4] rounded-lg px-2 py-1 w-24 focus:border-[#2563EB] focus:outline-none"
      />
      <button
        onClick={handleAssign}
        disabled={loading || !email.trim() || !passkey.trim()}
        className="font-sans text-xs bg-[#2563EB] text-white px-3 py-1 rounded-lg hover:bg-[#1D4ED8] disabled:opacity-50"
      >
        {loading ? '...' : 'Save'}
      </button>
      <button
        onClick={() => setOpen(false)}
        className="font-sans text-xs text-[#9B9590] hover:text-[#6B6B6B]"
      >
        Cancel
      </button>
      {result === 'success' && <span className="font-sans text-xs text-[#7A9E7E]">Assigned!</span>}
      {result === 'error' && <span className="font-sans text-xs text-[#DC2626]">Failed</span>}
    </div>
  );
}
