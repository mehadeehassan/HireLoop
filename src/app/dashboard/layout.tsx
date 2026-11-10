'use client';

import DashboardShell from '@/components/dashboard/shared/DashboardShell';
import { getDashboardRole } from '@/components/dashboard/shared/DashboardTypes';
import { useSession } from '@/lib/auth-client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const role = getDashboardRole(session?.user?.role);
  const pathRole = pathname.split('/')[2];

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.replace(`/signin?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }

    if (!isPending && pathRole && pathRole !== role) {
      const rest = pathname.split('/').slice(3).join('/');
      router.replace(`/dashboard/${role}${rest ? `/${rest}` : ''}`);
    }
  }, [isPending, pathname, pathRole, role, router, session?.user]);

  if (isPending || !session?.user) {
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
