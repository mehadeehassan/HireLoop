import DashboardSessionGuard from '@/components/dashboard/shared/DashboardSessionGuard';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect(`/signin?callbackUrl=${encodeURIComponent('/dashboard')}`);
  }

  return <DashboardSessionGuard>{children}</DashboardSessionGuard>;
}
