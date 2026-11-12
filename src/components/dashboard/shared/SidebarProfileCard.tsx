'use client';

import Link from 'next/link';
import type { DashboardRole } from './DashboardTypes';
import DashboardAvatar from './DashboardAvatar';
import { useEffect, useState } from 'react';

type UserLike = {
  name?: string | null;
  image?: string | null;
};

type RecruiterProfile = {
  recruiterName: string;
  plan: string;
  image: string;
};

type SeekerProfile = {
  plan: string;
  name: string;
  image: string;
};

function getSeekerPlanLabel(plan: string) {
  const normalizedPlan = plan.trim().toLowerCase();
  const plans: Record<string, string> = {
    starter: 'Starter',
    free: 'Starter',
    growth: 'Growth',
    premium: 'Premium',
  };

  return plans[normalizedPlan] || 'Starter';
}

function getRecruiterPlanLabel(plan: string) {
  const normalizedPlan = plan.trim().toLowerCase();
  const labels: Record<string, string> = {
    starter: 'Free',
    free: 'Free',
    premium: 'Growth',
    growth: 'Growth',
  };

  return labels[normalizedPlan] || plan || 'Free';
}

export default function SidebarProfileCard({
  role,
  user,
}: {
  role: DashboardRole;
  user?: UserLike;
}) {
  const [recruiterProfile, setRecruiterProfile] = useState<RecruiterProfile | null>(null);
  const [seekerProfile, setSeekerProfile] = useState<SeekerProfile | null>(null);

  useEffect(() => {
    if (role !== 'recruiter' && role !== 'seeker') return;
    let active = true;
    async function loadProfile() {
      const isRecruiter = role === 'recruiter';
      const response = await fetch(
        isRecruiter ? '/api/recruiter/profile' : '/api/seeker/profile',
        { cache: 'no-store' },
      );
      if (!response.ok) throw new Error(`Could not load ${role} profile`);
      const data: unknown = await response.json();
      const profile =
        typeof data === 'object' && data !== null
          ? (data as { recruiterName?: unknown; plan?: unknown; name?: unknown; image?: unknown })
          : {};
      if (!active) return;

      if (isRecruiter) {
        setRecruiterProfile({
          recruiterName: typeof profile.recruiterName === 'string' ? profile.recruiterName : '',
          plan: typeof profile.plan === 'string' ? profile.plan : 'Starter',
          image: typeof profile.image === 'string' ? profile.image : '',
        });
      } else {
        setSeekerProfile({
          plan: typeof profile.plan === 'string' ? profile.plan : 'Starter',
          name: typeof profile.name === 'string' ? profile.name : '',
          image: typeof profile.image === 'string' ? profile.image : '',
        });
      }
    }
    loadProfile().catch((error) => console.error(`Could not load ${role} sidebar profile`, error));
    const updateEvent =
      role === 'recruiter' ? 'recruiter-profile-updated' : 'seeker-profile-updated';
    window.addEventListener(updateEvent, loadProfile);
    return () => {
      active = false;
      window.removeEventListener(updateEvent, loadProfile);
    };
  }, [role]);

  if (role === 'seeker') {
    const seekerPlan = getSeekerPlanLabel(seekerProfile?.plan || 'Starter');

    return (
      <div className="mx-4 mt-5 flex h-14.5 items-center gap-3 rounded-lg border border-[#242a3b] bg-[#171d30] px-3">
        <DashboardAvatar src={seekerProfile?.image || user?.image} name={seekerProfile?.name || user?.name} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-medium text-[#eef0f5]">
            {seekerProfile?.name || user?.name || 'Seeker'}
          </p>
          <Link
            href="/dashboard/seeker/upgrade"
            className="mt-0.5 inline-flex rounded-sm bg-[#194f3b] px-2 py-0.5 text-[10px] text-[#59d89b] transition hover:bg-[#21684e] hover:text-white"
            aria-label={`${seekerPlan} Tier. View all plans`}
          >
            {seekerPlan} Tier
          </Link>
        </div>
      </div>
    );
  }

  if (role === 'recruiter') {
    const recruiterPlan = recruiterProfile?.plan || 'Starter';

    return (
      <div className="mx-4 mt-6 flex items-center gap-3 border-b border-[#252a3c] pb-4">
        <DashboardAvatar
          key={recruiterProfile?.image || user?.image}
          src={recruiterProfile?.image || user?.image}
          name={recruiterProfile?.recruiterName || user?.name}
          size="lg"
        />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-[#eef0f5]">
            {recruiterProfile?.recruiterName || user?.name || 'Recruiter'}
          </p>
          <p className="text-[11px] text-[#aab0c1]">Recruiter</p>
          <Link
            href="/dashboard/recruiter/upgrade"
            className="mt-1 inline-flex rounded-sm bg-[#194f3b] px-2 py-0.5 text-[10px] text-[#59d89b] transition hover:bg-[#21684e] hover:text-white"
            aria-label={`${getRecruiterPlanLabel(recruiterPlan)} plan. View all plans`}
          >
            {getRecruiterPlanLabel(recruiterPlan)}
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
