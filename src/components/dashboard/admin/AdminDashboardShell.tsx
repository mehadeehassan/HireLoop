'use client';

import type { ReactNode } from 'react';
import { CircleHelp, Search } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import AdminNotificationMenu from '@/components/dashboard/shared/AdminNotificationMenu';

export default function AdminDashboardShell({
  pathname,
  children,
}: {
  pathname: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0d0d10] text-[#e7e7ec]">
      <AdminSidebar pathname={pathname} />

      <header className="fixed left-0 right-0 top-16 z-30 flex h-14 items-center gap-3 border-b border-white/[0.06] bg-[#0d0d10]/95 px-4 backdrop-blur lg:left-60 lg:top-0 lg:h-[68px] lg:px-7">
        <label className="relative min-w-0 flex-1 lg:max-w-[310px]">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#898991]"
          />
          <input
            type="search"
            aria-label="Global search"
            placeholder="Global search..."
            className="h-9 w-full rounded-md border border-white/[0.09] bg-[#111114] pl-9 pr-3 text-xs text-[#e7e7ec] outline-none placeholder:text-[#77777e] focus:border-[#8c62ff]/70"
          />
        </label>

        <div className="ml-auto flex items-center gap-1">
          <AdminNotificationMenu />
          <button
            type="button"
            aria-label="Help"
            className="flex size-9 items-center justify-center rounded-md text-[#a6a6ae] transition hover:bg-white/[0.06] hover:text-white"
          >
            <CircleHelp className="size-4" />
          </button>
        </div>
      </header>

      <main className="min-h-screen px-4 pb-10 pt-[130px] sm:px-6 lg:ml-60 lg:px-8 lg:pt-[68px]">
        {children}
      </main>
    </div>
  );
}
