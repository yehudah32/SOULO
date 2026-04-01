'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

function DashboardRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Redirect to /results with same query params — portal now lives there
    const params = searchParams.toString();
    router.replace(`/results${params ? '?' + params : ''}`);
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen bg-[#FAF8F5] items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 border-[#2563EB] border-t-transparent animate-spin" />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen bg-[#FAF8F5] items-center justify-center"><div className="w-10 h-10 rounded-full border-2 border-[#2563EB] border-t-transparent animate-spin" /></div>}>
      <DashboardRedirect />
    </Suspense>
  );
}
