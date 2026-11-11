'use client';

import HeaderActions from '@/components/dashboard/shared/HeaderActions';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export default function SeekerTopbar() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  function searchJobs(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('search', query.trim());
    router.push(`/dashboard/seeker/jobs${params.size ? `?${params}` : ''}`);
  }

  return (
    <header className="fixed left-0 right-0 top-16 z-30 hidden h-12 items-center border-b border-[#1e1e23] bg-[#0d0d10] px-5 lg:left-52 lg:top-0 lg:flex lg:h-14 lg:px-6">
      <form onSubmit={searchJobs} className="relative w-full max-w-80">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#85858e]"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search jobs"
          placeholder="Search for opportunities..."
          className="h-8.5 w-full rounded-md border border-[#29292f] bg-[#111114] pl-9 pr-3 text-[10px] text-white outline-none placeholder:text-[#777780] focus:border-[#8178ff]"
        />
      </form>
      <HeaderActions role="seeker" />
    </header>
  );
}
