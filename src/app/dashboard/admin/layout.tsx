import { auth } from '@/lib/auth';
import { isAccountActive } from '@/lib/admin-user-policy';
import { getDashboardRole } from '@/components/dashboard/shared/DashboardTypes';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

export const instant = false;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || !isAccountActive(session.user)) {
    redirect(`/signin?callbackUrl=${encodeURIComponent('/dashboard/admin')}`);
  }

  if (session.user.role !== 'admin') {
    redirect(`/dashboard/${getDashboardRole(session.user.role)}`);
  }

  return children;
}
