'use client';

import type { DashboardRole } from './DashboardTypes';
import DashboardAvatar from './DashboardAvatar';

type UserLike = {
  name?: string | null;
  image?: string | null;
};

export default function SidebarProfileCard({
  role,
  user,
}: {
  role: DashboardRole;
  user?: UserLike;
}) {
  if (role === 'seeker') {
    return (
      <div className="mx-4 mt-5 flex h-14.5 items-center gap-3 rounded-lg border border-[#242a3b] bg-[#171d30] px-3">
        <DashboardAvatar src={user?.image} name={user?.name} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-medium text-[#eef0f5]">Seeker Portal</p>
          <p className="text-[12px] text-[#8f96aa]">Professional Tier</p>
        </div>
      </div>
    );
  }

  if (role === 'recruiter') {
    return (
      <div className="mx-4 mt-6 flex items-center gap-3 border-b border-[#252a3c] pb-4">
        <DashboardAvatar src={user?.image} name={user?.name} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-[#eef0f5]">
            {user?.name || 'Alex Sterling'}
          </p>
          <p className="text-[11px] text-[#aab0c1]">Recruiter</p>
          <span className="mt-1 inline-flex rounded-sm bg-[#194f3b] px-2 py-0.5 text-[10px] text-[#59d89b]">
            Premium account
          </span>
        </div>
      </div>
    );
  }

  return null;
}
