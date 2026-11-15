'use client';

import { useSession } from '@/lib/auth-client';
import RecruiterMessagesMenu from '../recruiter/RecruiterMessagesMenu';
import DashboardAvatar from './DashboardAvatar';
import type { DashboardRole } from './DashboardTypes';
import SeekerMessagesMenu from './SeekerMessagesMenu';
import SeekerNotificationMenu from './SeekerNotificationMenu';
import AdminNotificationMenu from './AdminNotificationMenu';
import { useDashboardProfile } from './DashboardProfileContext';

export default function HeaderActions({ role }: { role: DashboardRole }) {
  const { data: session } = useSession();
  const user = session?.user;
  const profile = useDashboardProfile();

  return (
    <div className="ml-auto flex items-center gap-5 text-[#8d96ab]">
      {role === 'seeker' && <SeekerMessagesMenu userId={user?.id || ''} />}

      {role === 'recruiter' && user?.id && <RecruiterMessagesMenu recruiterId={user.id} />}
      {role === 'recruiter' && (
        <DashboardAvatar
          key={profile?.image || user?.image}
          src={profile?.image || user?.image}
          name={user?.name}
          size="sm"
        />
      )}

      {role === 'seeker' && <SeekerNotificationMenu />}

      {role === 'admin' && <AdminNotificationMenu />}

      {role === 'admin' && (
        <button
          type="button"
          aria-label="Help"
          className="flex size-4.75 items-center justify-center rounded-full border border-current text-[12px] font-semibold transition hover:text-[#e8ebf3]"
        >
          ?
        </button>
      )}

      {role === 'seeker' && (
        <>
          <DashboardAvatar src={user?.image} name={user?.name} size="sm" />
        </>
      )}
    </div>
  );
}
