import { getDashboardRole, type DashboardRole } from '@/components/dashboard/shared/DashboardTypes';
import { isAccountActive } from '@/lib/admin-user-policy';
import { getDashboardSession } from '@/lib/dashboard-session';
import { redirect } from 'next/navigation';

export async function requireDashboardRole(role: DashboardRole) {
  const callbackPath = `/dashboard/${role}`;
  const session = await getDashboardSession();

  if (!session?.user || (role === 'admin' && !isAccountActive(session.user))) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }

  if (session.user.role !== role) {
    redirect(`/dashboard/${getDashboardRole(session.user.role)}`);
  }

  return session;
}
