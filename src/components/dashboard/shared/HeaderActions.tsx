'use client';

import { useSession } from '@/lib/auth-client';
import RecruiterMessagesMenu from '../recruiter/RecruiterMessagesMenu';
import DashboardAvatar from './DashboardAvatar';
import type { DashboardRole } from './DashboardTypes';
import SeekerMessagesMenu from './SeekerMessagesMenu';
import SeekerNotificationMenu from './SeekerNotificationMenu';

function NotificationIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4.75"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </svg>
  );
}

export default function HeaderActions({ role }: { role: DashboardRole }) {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <div className="ml-auto flex items-center gap-5 text-[#8d96ab]">
      {role === 'seeker' && <SeekerMessagesMenu userId={user?.id || ''} />}

      {role === 'recruiter' && user?.id && <RecruiterMessagesMenu recruiterId={user.id} />}

      {role === 'seeker' && <SeekerNotificationMenu />}

      {role === 'admin' && (
        <button
          type="button"
          aria-label="Notifications"
          className="relative transition hover:text-[#e8ebf3]"
        >
          <NotificationIcon />
          <span className="absolute -right-px top-0 size-1.25 rounded-full border border-[#101626] bg-[#ec4e67]" />
        </button>
      )}

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
