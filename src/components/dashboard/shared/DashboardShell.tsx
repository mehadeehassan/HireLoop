'use client';

import type { ReactNode } from 'react';
import type { DashboardRole } from './DashboardTypes';
import DashboardHeader from './DashboardHeader';
import DashboardSidebar from './DashboardSidebar';

export default function DashboardShell({
  role,
  pathname,
  children,
}: {
  role: DashboardRole;
  pathname: string;
  children: ReactNode;
}) {
  return (
    <div className={`min-h-screen text-[#e6e8ef] ${role === 'seeker' ? 'bg-[#0d0d10]' : 'bg-[#080c1b]'}`}>
      <DashboardSidebar role={role} pathname={pathname} />
      <DashboardHeader role={role} />
      <main className={`min-h-screen pt-16 ${role === 'seeker' ? 'lg:ml-52 lg:pt-14' : 'lg:ml-65 lg:pt-20.5'}`}>
        {children}
      </main>
    </div>
  );
}
