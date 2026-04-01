// Centralized auth state management — localStorage-based persistent login

const KEYS = {
  userId: 'soulo_user_id',
  email: 'soulo_email',
  activeSession: 'soulo_active_session_id',
  revealPrefix: 'soulo_reveal_complete_',
} as const;

export interface AuthState {
  userId: string | null;
  email: string | null;
  activeSessionId: string | null;
}

/** Read current auth state from localStorage */
export function getAuthState(): AuthState {
  if (typeof window === 'undefined') return { userId: null, email: null, activeSessionId: null };
  return {
    userId: localStorage.getItem(KEYS.userId),
    email: localStorage.getItem(KEYS.email),
    activeSessionId: localStorage.getItem(KEYS.activeSession),
  };
}

/** Check if user is logged in */
export function isLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(KEYS.userId) && !!localStorage.getItem(KEYS.email);
}

/** Store auth state after successful login. Clears stale data if switching accounts. */
export function setAuthState(userId: string, email: string, sessionId?: string) {
  if (typeof window === 'undefined') return;

  // Clear stale data if switching to a different user
  const existingUserId = localStorage.getItem(KEYS.userId);
  if (existingUserId && existingUserId !== userId) {
    clearAllAuthData();
  }

  localStorage.setItem(KEYS.userId, userId);
  localStorage.setItem(KEYS.email, email);
  if (sessionId) {
    localStorage.setItem(KEYS.activeSession, sessionId);
  }
}

/** Update the active session ID (e.g., after assessment completion) */
export function setActiveSession(sessionId: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEYS.activeSession, sessionId);
}

/** Mark a session's reveal as completed */
export function setRevealComplete(sessionId: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEYS.revealPrefix + sessionId, 'true');
}

/** Check if a session's reveal is completed (client cache) */
export function isRevealComplete(sessionId: string): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(KEYS.revealPrefix + sessionId) === 'true';
}

/** Clear ALL auth data — used for logout */
export function clearAllAuthData() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEYS.userId);
  localStorage.removeItem(KEYS.email);
  localStorage.removeItem(KEYS.activeSession);
  // Clear all reveal flags
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(KEYS.revealPrefix)) keysToRemove.push(key);
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
  // Also clear sessionStorage fresh_start flag
  sessionStorage.removeItem('soulo_fresh_start');
}

/** Full logout — clears data and redirects to home */
export function logout() {
  clearAllAuthData();
  window.location.href = '/';
}
