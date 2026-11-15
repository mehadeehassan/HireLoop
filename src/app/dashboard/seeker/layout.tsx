import { requireDashboardRole } from '@/lib/dashboard-route-auth';
import type { ReactNode } from 'react';

export const instant = false;

export default async function SeekerLayout({ children }: { children: ReactNode }) {
  await requireDashboardRole('seeker');
  return children;
}
