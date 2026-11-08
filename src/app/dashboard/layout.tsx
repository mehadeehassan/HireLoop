'use client';

import DashboardShell from '@/components/dashboard/DashboardShell';
import type { DashboardRole } from '@/components/dashboard/DashboardTypes';
import { useSession } from '@/lib/auth-client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const role = (session?.user?.role as DashboardRole | undefined) || 'seeker';
  const pathRole = pathname.split('/')[2] as DashboardRole | undefined;

  useEffect(() => {
    if (!isPending && pathRole && pathRole !== role) {
      const rest = pathname.split('/').slice(3).join('/');
      router.replace(`/dashboard/${role}${rest ? `/${rest}` : ''}`);
    }
  }, [isPending, pathname, pathRole, role, router]);

  if (isPending) {
    return <div className="min-h-screen bg-[#080c1b]" />;
  }

  if (pathRole && pathRole !== role) {
    return <div className="min-h-screen bg-[#080c1b]" />;
  }

  return (
    <DashboardShell role={role} pathname={pathname}>
      {children}
    </DashboardShell>
  );
}
