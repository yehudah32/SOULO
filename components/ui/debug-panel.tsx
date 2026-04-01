'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Bug, ChevronDown, ChevronUp, Trash2, LogOut } from 'lucide-react';

// Only render in development
const IS_DEV = process.env.NODE_ENV === 'development';

export default function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [authState, setAuthState] = useState<Record<string, string | null>>({});
  const [allKeys, setAllKeys] = useState<Record<string, string>>({});
  const pathname = usePathname();

  useEffect(() => {
    if (!IS_DEV) return;
    const refresh = () => {
      setAuthState({
        userId: localStorage.getItem('soulo_user_id'),
        email: localStorage.getItem('soulo_email'),
        activeSession: localStorage.getItem('soulo_active_session_id'),
      });

      const keys: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('soulo_')) {
          keys[key] = localStorage.getItem(key) || '';
        }
      }
      setAllKeys(keys);
    };

    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!IS_DEV) return null;

  const clearAuth = () => {
    Object.keys(allKeys).forEach(k => localStorage.removeItem(k));
    sessionStorage.clear();
    setAuthState({});
    setAllKeys({});
  };

  const forceLogout = () => {
    clearAuth();
    window.location.href = '/';
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] font-mono text-[0.65rem]">
      {/* Toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 bg-[#1a1a2e] text-[#00ff88] px-3 py-1.5 rounded-full shadow-lg border border-[#00ff88]/20 hover:border-[#00ff88]/40 transition-colors"
      >
        <Bug size={12} />
        <span>Debug</span>
        {open ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute bottom-10 right-0 w-80 bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl shadow-2xl overflow-hidden">
          <div className="p-3 border-b border-[#2a2a4a] flex items-center justify-between">
            <span className="text-[#00ff88] font-semibold">Soulo Debug</span>
            <span className="text-[#666] text-[0.55rem]">{pathname}</span>
          </div>

          {/* Auth state */}
          <div className="p-3 border-b border-[#2a2a4a]">
            <p className="text-[#888] mb-1.5">Auth State</p>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-[#666]">Logged in</span>
                <span className={authState.userId ? 'text-[#00ff88]' : 'text-[#ff4444]'}>
                  {authState.userId ? 'Yes' : 'No'}
                </span>
              </div>
              {authState.email && (
                <div className="flex justify-between">
                  <span className="text-[#666]">Email</span>
                  <span className="text-[#aaa] truncate max-w-[150px]">{authState.email}</span>
                </div>
              )}
              {authState.userId && (
                <div className="flex justify-between">
                  <span className="text-[#666]">User ID</span>
                  <span className="text-[#aaa] truncate max-w-[150px]">{authState.userId}</span>
                </div>
              )}
              {authState.activeSession && (
                <div className="flex justify-between">
                  <span className="text-[#666]">Session</span>
                  <span className="text-[#aaa] truncate max-w-[150px]">{authState.activeSession}</span>
                </div>
              )}
            </div>
          </div>

          {/* All localStorage keys */}
          <div className="p-3 border-b border-[#2a2a4a] max-h-32 overflow-y-auto">
            <p className="text-[#888] mb-1.5">localStorage ({Object.keys(allKeys).length} keys)</p>
            {Object.entries(allKeys).map(([k, v]) => (
              <div key={k} className="flex justify-between text-[0.55rem] py-0.5">
                <span className="text-[#666] truncate max-w-[120px]">{k.replace('soulo_', '')}</span>
                <span className="text-[#aaa] truncate max-w-[140px]">{v}</span>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="p-3 flex gap-2">
            <button
              onClick={clearAuth}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#2a2a4a] text-[#ff8844] hover:bg-[#3a3a5a] transition-colors"
            >
              <Trash2 size={10} />
              Clear Auth
            </button>
            <button
              onClick={forceLogout}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#2a2a4a] text-[#ff4444] hover:bg-[#3a3a5a] transition-colors"
            >
              <LogOut size={10} />
              Force Logout
            </button>
            <button
              onClick={() => window.location.href = '/results'}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#2a2a4a] text-[#4488ff] hover:bg-[#3a3a5a] transition-colors"
            >
              → Results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
