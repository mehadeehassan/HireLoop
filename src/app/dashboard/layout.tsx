import DashboardSessionGuard from '@/components/dashboard/shared/DashboardSessionGuard';
import type { ReactNode } from 'react';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardSessionGuard>{children}</DashboardSessionGuard>;
}
