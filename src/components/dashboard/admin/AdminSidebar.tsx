'use client';

import {
  Building2,
  BriefcaseBusiness,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authClient, useSession } from '@/lib/auth-client';
import DashboardAvatar from '@/components/dashboard/shared/DashboardAvatar';
import { clearHireLoopBrowserState } from '@/lib/user-storage';

const navigation = [
  { label: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard },
  { label: 'Users', href: '/dashboard/admin/users', icon: Users },
  { label: 'Companies', href: '/dashboard/admin/companies', icon: Building2 },
  { label: 'Jobs', href: '/dashboard/admin/jobs', icon: BriefcaseBusiness },
  { label: 'Payments', href: '/dashboard/admin/payments', icon: CreditCard },
  { label: 'Settings', href: '/dashboard/admin/settings', icon: Settings },
] satisfies Array<{ label: string; href: string; icon: LucideIcon }>;

function SidebarContent({
  pathname,
  userName,
  userImage,
  onNavigate,
  onSignOut,
}: {
  pathname: string;
  userName?: string | null;
  userImage?: string | null;
  onNavigate: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[68px] items-center gap-3 border-b border-white/[0.07] px-5">
        <Link href="/" onClick={onNavigate} aria-label="HireLoop home">
          <Image
            src="/images/logo.png"
            alt="HireLoop"
            width={154}
            height={44}
            priority
            className="h-auto w-[112px]"
          />
        </Link>
      </div>
      <p className="px-5 pb-2 pt-3 text-[10px] font-medium uppercase tracking-[0.13em] text-[#77777f]">
        Admin Console
      </p>

      <nav aria-label="Admin navigation" className="flex-1 px-2">
        <ul className="space-y-1">
          {navigation.map(({ label, href, icon: Icon }) => {
            const active =
              pathname === href ||
              (href !== '/dashboard/admin' && pathname.startsWith(`${href}/`));

            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex h-9.5 items-center gap-2.5 rounded-md px-3 text-xs transition-colors ${
                    active
                      ? 'bg-[#222227] text-white before:absolute before:bottom-2 before:left-0 before:top-2 before:w-[2px] before:rounded-r before:bg-[#9b71ff]'
                      : 'text-[#a0a0a8] hover:bg-white/[0.055] hover:text-white'
                  }`}
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.8} />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/[0.07] p-3">
        <div className="mb-2 flex min-w-0 items-center gap-2.5 rounded-md px-2 py-2">
          <DashboardAvatar src={userImage} name={userName} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium text-[#e7e7ec]">
              {userName || 'Admin'}
            </p>
            <p className="text-[10px] text-[#77777f]">Administrator</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-xs text-[#a0a0a8] transition-colors hover:bg-white/[0.055] hover:text-[#ff8181]"
        >
          <LogOut aria-hidden="true" className="size-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function AdminSidebar({ pathname }: { pathname: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = session?.user;

  async function signOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          clearHireLoopBrowserState();
          router.replace('/');
          router.refresh();
        },
      },
    });
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-white/[0.07] bg-[#08080a] lg:flex">
        <SidebarContent
          pathname={pathname}
          userName={user?.name}
          userImage={user?.image}
          onNavigate={() => undefined}
          onSignOut={signOut}
        />
      </aside>

      <div className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-white/[0.07] bg-[#08080a] px-4 lg:hidden">
        <Link href="/" aria-label="HireLoop home">
          <Image
            src="/images/logo.png"
            alt="HireLoop"
            width={154}
            height={44}
            priority
            className="h-auto w-28"
          />
        </Link>
        <button
          type="button"
          aria-label={mobileOpen ? 'Close admin navigation' : 'Open admin navigation'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
          className="flex size-10 items-center justify-center rounded-md text-[#c5c5cc] transition hover:bg-white/[0.06]"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close admin navigation"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/70"
          />
          <aside className="absolute inset-y-0 left-0 w-[min(82vw,280px)] border-r border-white/[0.08] bg-[#08080a]">
            <button
              type="button"
              aria-label="Close admin navigation"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 z-10 flex size-8 items-center justify-center rounded-md text-[#a0a0a8] hover:bg-white/[0.06]"
            >
              <X className="size-4" />
            </button>
            <SidebarContent
              pathname={pathname}
              userName={user?.name}
              userImage={user?.image}
              onNavigate={() => setMobileOpen(false)}
              onSignOut={signOut}
            />
          </aside>
        </div>
      )}
    </>
  );
}
