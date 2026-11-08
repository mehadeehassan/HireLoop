'use client';

import Link from 'next/link';
import type { DashboardRole } from './DashboardTypes';
import DashboardIcon, { type DashboardIconName } from './DashboardIcon';

export type SidebarNavigationItem = {
  label: string;
  href: string;
  icon: DashboardIconName;
};

export const sidebarNavigation: Record<
  DashboardRole,
  SidebarNavigationItem[]
> = {
  seeker: [
    { label: 'Dashboard', href: '/dashboard/seeker', icon: 'grid' },
    { label: 'Jobs', href: '/dashboard/seeker/jobs', icon: 'briefcase' },
    { label: 'Saved Jobs', href: '/dashboard/seeker/saved', icon: 'bookmark' },
    { label: 'Applications', href: '/dashboard/seeker/applied', icon: 'document' },
    { label: 'Billing', href: '/dashboard/seeker/billing', icon: 'wallet' },
    { label: 'Settings', href: '/dashboard/seeker/settings', icon: 'settings' },
  ],
  recruiter: [
    { label: 'Dashboard', href: '/dashboard/recruiter', icon: 'grid' },
    { label: 'Manage Jobs', href: '/dashboard/recruiter/jobs', icon: 'briefcase' },
    { label: 'Applications', href: '/dashboard/recruiter/candidates', icon: 'users' },
    { label: 'Settings', href: '/dashboard/recruiter/settings', icon: 'settings' },
  ],
  admin: [
    { label: 'Dashboard', href: '/dashboard/admin', icon: 'grid' },
    { label: 'Users', href: '/dashboard/admin/users', icon: 'users' },
    { label: 'Companies', href: '/dashboard/admin/companies', icon: 'building' },
    { label: 'Jobs', href: '/dashboard/admin/jobs', icon: 'briefcase' },
    { label: 'Payments', href: '/dashboard/admin/payments', icon: 'wallet' },
    { label: 'Settings', href: '/dashboard/admin/settings', icon: 'settings' },
  ],
};

export default function SidebarNavigation({
  role,
  pathname,
  onNavigate,
}: {
  role: DashboardRole;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className={`flex-1 px-3 ${role === 'seeker' || role === 'recruiter' ? 'mt-4' : 'mt-5'}`}>
      <div className="space-y-1">
        {sidebarNavigation[role].map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== `/dashboard/${role}` && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex h-11 items-center gap-3 rounded-lg px-3 text-[13px] transition ${
                active
                  ? 'bg-[#20263c] text-[#f2f4fb]'
                  : 'text-[#9ba1b7] hover:bg-white/[0.035] hover:text-[#e8eaf2]'
              }`}
            >
              <DashboardIcon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
