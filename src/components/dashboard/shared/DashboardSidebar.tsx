'use client';

import type { DashboardRole } from './DashboardTypes';
import { authClient, useSession } from '@/lib/auth-client';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import DashboardAvatar from './DashboardAvatar';
import DashboardIcon from './DashboardIcon';
import SidebarNavigation from './SidebarNavigation';
import SidebarProfileCard from './SidebarProfileCard';

export default function DashboardSidebar({
  role,
  pathname,
}: {
  role: DashboardRole;
  pathname: string;
}) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = useSession();
  const user = session?.user;

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.replace('/');
          router.refresh();
        },
      },
    });
  }

  function SidebarContent({ mobile = false }: { mobile?: boolean }) {
    const closeMobile = () => mobile && setMobileOpen(false);

    return (
      <>
        <div className={`flex h-20.5 items-center px-6 ${mobile ? '' : 'border-b border-[#252a3c]'}`}>
          <Link href="/" onClick={closeMobile} aria-label="HireLoop home">
            <Image
              src="/images/logo.png"
              alt="HireLoop"
              width={154}
              height={44}
              priority
              className="h-auto w-32.5"
            />
          </Link>
        </div>

        <SidebarProfileCard role={role} user={user} />
        <SidebarNavigation role={role} pathname={pathname} onNavigate={closeMobile} />

        {role === 'seeker' && (
          <div className="px-3 pb-3">
            <Link
              href="/dashboard/seeker/settings#resume"
              className="flex h-11 items-center justify-center rounded-[7px] bg-[#eef0f4] text-[13px] font-semibold text-[#171923]"
            >
              Post Resume
            </Link>
          </div>
        )}

        <div className="border-t border-[#252a3c] p-4">
          {role === 'admin' && (
            <div className="mb-3 flex items-center gap-3 px-2">
              <DashboardAvatar src={user?.image} name={user?.name} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{user?.name || 'Admin'}</p>
                <p className="text-[10px] text-[#7e879f]">Role: Admin</p>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className={`flex h-10 w-full items-center gap-3 text-xs transition hover:text-[#ff7474] ${
              role === 'seeker' ? 'rounded-[7px] px-3 text-[#9ba1b7]' : 'px-2 text-[#9ba1b7]'
            }`}
          >
            <DashboardIcon name="logout" />
            Logout
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <aside className={`fixed inset-y-0 left-0 z-40 hidden flex-col lg:flex ${role === 'seeker' ? 'w-52 bg-[#08080a]' : 'w-65 bg-[#101626]'}`}>
        {SidebarContent({})}
      </aside>

      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between bg-[#101626] px-4 lg:hidden">
        <Image
          src="/images/logo.png"
          alt="HireLoop"
          width={154}
          height={44}
          priority
          className="h-auto w-29"
        />
        <button
          type="button"
          aria-label="Open navigation"
          onClick={() => setMobileOpen(true)}
          className="flex size-10 items-center justify-center rounded-lg border border-white/10"
        >
          <span className="text-xl leading-none">≡</span>
        </button>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/70"
            onClick={() => setMobileOpen(false)}
          />
          <aside className={`absolute inset-y-0 left-0 flex w-70 flex-col overflow-y-auto overscroll-contain ${role === 'seeker' ? 'bg-[#08080a]' : 'bg-[#101626]'}`}>
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 z-10 size-9 text-[#9ba1b7]"
            >
              ×
            </button>
            {SidebarContent({ mobile: true })}
          </aside>
        </div>
      )}
    </>
  );
}
