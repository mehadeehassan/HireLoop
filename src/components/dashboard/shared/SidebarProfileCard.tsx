'use client';

import Link from 'next/link';
import type { DashboardRole } from './DashboardTypes';
import DashboardAvatar from './DashboardAvatar';
import { useDashboardProfile } from './DashboardProfileContext';

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
    premium: 'Premium',
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
  const profile = useDashboardProfile();

  if (role === 'seeker') {
    const seekerProfile: SeekerProfile | null = profile ? {
      name: profile.name,
      plan: profile.plan,
      image: profile.image,
    } : null;
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
    const recruiterProfile: RecruiterProfile | null = profile ? {
      recruiterName: profile.recruiterName,
      plan: profile.plan,
      image: profile.image,
    } : null;
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
