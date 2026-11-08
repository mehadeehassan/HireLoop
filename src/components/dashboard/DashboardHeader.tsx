'use client';

import type { DashboardRole } from './DashboardTypes';
import HeaderActions from './HeaderActions';

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className="absolute left-4 size-4.75 text-[#9aa2b7]"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

export default function DashboardHeader({ role }: { role: DashboardRole }) {
  const placeholder =
    role === 'admin'
      ? 'Global search...'
      : role === 'recruiter'
        ? 'Search candidates...'
        : 'Search for opportunities...';

  return (
    <header className="fixed left-65 right-0 top-0 z-30 hidden h-20.5 items-center bg-[#101626] px-8 lg:flex">
      <label className="relative flex w-full max-w-155 items-center">
        <SearchIcon />
        <input
          type="search"
          aria-label={role === 'admin' ? 'Global search' : 'Search dashboard'}
          placeholder={placeholder}
          className="h-10.5 w-full rounded-lg border border-white/2.5 bg-[#192137] pl-12 pr-4 text-[13px] text-[#e8ebf3] outline-none placeholder:text-[#8e96aa] focus:border-[#6258ff]/40"
        />
      </label>
      <HeaderActions role={role} />
    </header>
  );
}
