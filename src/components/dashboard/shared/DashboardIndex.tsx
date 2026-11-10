'use client';

import { getDashboardRole } from './DashboardTypes';
import { useSession } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardIndex() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (isPending || !session?.user) return;
    router.replace(`/dashboard/${getDashboardRole(session.user.role)}`);
  }, [isPending, router, session?.user]);

  return <div className="min-h-screen bg-[#0d0d10]" aria-label="Loading dashboard" />;
}
