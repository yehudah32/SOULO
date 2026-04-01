'use client';

import { useState, useEffect } from 'react';

/** Hook to read auth state from localStorage (client-side only) */
export function useAuth() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState<string | undefined>(undefined);
  const [userId, setUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const storedUserId = localStorage.getItem('soulo_user_id');
    const storedEmail = localStorage.getItem('soulo_email');
    if (storedUserId && storedEmail) {
      setLoggedIn(true);
      setEmail(storedEmail);
      setUserId(storedUserId);
    }
  }, []);

  return { loggedIn, email, userId };
}
