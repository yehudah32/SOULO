'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import SouloNav from '@/components/ui/soulo-nav';

export default function GlobalNav() {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState<string | undefined>(undefined);

  useEffect(() => {
    const userId = localStorage.getItem('soulo_user_id');
    const storedEmail = localStorage.getItem('soulo_email');
    if (userId && storedEmail) {
      setLoggedIn(true);
      setEmail(storedEmail);
    }
  }, []);

  // Hide on admin pages and results (results has its own nav)
  if (pathname?.startsWith('/admin')) return null;
  if (pathname?.startsWith('/results')) return null;
  // Hide on pages that render their own SouloNav
  if (pathname?.startsWith('/assessment')) return null;
  if (pathname === '/') return null;
  if (pathname === '/login') return null;

  return (
    <SouloNav
      loggedIn={loggedIn}
      userEmail={email}
      hasResults={false}
      showPortalTabs={false}
    />
  );
}
