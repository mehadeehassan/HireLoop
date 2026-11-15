import { requireDashboardRole } from '@/lib/dashboard-route-auth';
import type { ReactNode } from 'react';

export const instant = false;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireDashboardRole('admin');
  return children;
}
