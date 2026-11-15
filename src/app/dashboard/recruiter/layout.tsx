import { requireDashboardRole } from '@/lib/dashboard-route-auth';
import type { ReactNode } from 'react';

export const instant = false;

export default async function RecruiterLayout({ children }: { children: ReactNode }) {
  await requireDashboardRole('recruiter');
  return children;
}
