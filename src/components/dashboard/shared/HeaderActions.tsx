'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/lib/auth-client';
import RecruiterMessagesMenu from '../recruiter/RecruiterMessagesMenu';
import DashboardAvatar from './DashboardAvatar';
import type { DashboardRole } from './DashboardTypes';
import SeekerMessagesMenu from './SeekerMessagesMenu';
import SeekerNotificationMenu from './SeekerNotificationMenu';
import AdminNotificationMenu from './AdminNotificationMenu';

export default function HeaderActions({ role }: { role: DashboardRole }) {
  const { data: session } = useSession();
  const user = session?.user;
  const [recruiterImage, setRecruiterImage] = useState(user?.image || '');

  useEffect(() => {
    if (role !== 'recruiter') return;
    let active = true;

    async function loadRecruiterImage() {
      const response = await fetch('/api/recruiter/profile', { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load recruiter profile image.');
      const profile: unknown = await response.json();
      if (
        active &&
        typeof profile === 'object' &&
        profile !== null &&
        'image' in profile &&
        typeof profile.image === 'string'
      ) {
        setRecruiterImage(profile.image);
      }
    }

    function handleProfileUpdate() {
      loadRecruiterImage().catch((error) =>
        console.error('Could not refresh recruiter profile image', error),
      );
    }

    loadRecruiterImage().catch((error) =>
      console.error('Could not load recruiter profile image', error),
    );
    window.addEventListener('recruiter-profile-updated', handleProfileUpdate);
    return () => {
      active = false;
      window.removeEventListener('recruiter-profile-updated', handleProfileUpdate);
    };
  }, [role]);

  return (
    <div className="ml-auto flex items-center gap-5 text-[#8d96ab]">
      {role === 'seeker' && <SeekerMessagesMenu userId={user?.id || ''} />}

      {role === 'recruiter' && user?.id && <RecruiterMessagesMenu recruiterId={user.id} />}
      {role === 'recruiter' && (
        <DashboardAvatar
          key={recruiterImage || user?.image}
          src={recruiterImage || user?.image}
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
