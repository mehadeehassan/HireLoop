import { getDashboardRole } from '@/components/dashboard/shared/DashboardTypes';
import { getDashboardSession } from '@/lib/dashboard-session';
import { redirect } from 'next/navigation';

export const instant = false;

export default async function DashboardIndexPage() {
  const session = await getDashboardSession();
  if (!session?.user) {
    redirect(`/signin?callbackUrl=${encodeURIComponent('/dashboard')}`);
  }
  redirect(`/dashboard/${getDashboardRole(session.user.role)}`);
}
