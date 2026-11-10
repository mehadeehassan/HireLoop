'use client';

import type { FormEvent } from 'react';

type JobSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSearch: (value: string) => void;
};

export default function JobSearchBar({ value, onChange, onSearch }: JobSearchBarProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(value.trim());
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className="flex flex-col gap-3 rounded-xl border border-white/6 bg-[#141416] p-3 sm:flex-row sm:items-center sm:p-4"
    >
      <label className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-lg border border-white/4 bg-[#1a1a1d] px-3 text-[#8d8d96]">
        <svg
          className="size-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <circle cx="10.8" cy="10.8" r="6.8" />
          <path d="m16 16 4.5 4.5" />
        </svg>
        <span className="sr-only">Search jobs</span>
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search by job title, company, keywords..."
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-[#ededf3] outline-none placeholder:text-[#777780]"
        />
      </label>
      <button
        type="submit"
        className="h-11 shrink-0 rounded-lg bg-white px-5 text-sm font-semibold text-[#171719] transition hover:bg-[#dedee3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8178ff]"
      >
        Search Jobs
      </button>
    </form>
  );
}
