"use client";

import type { FormEvent } from "react";

type HeroSectionProps = {
  newJobsThisMonth: number;
  query: string;
  location: string;
  popularSearches: string[];
  onQueryChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onSearch: () => void;
};

export default function HeroSection({
  newJobsThisMonth,
  query,
  location,
  popularSearches,
  onQueryChange,
  onLocationChange,
  onSearch,
}: HeroSectionProps) {
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch();
  }

  function selectPopularSearch(search: string) {
    onQueryChange(search);
    onLocationChange("");
    onSearch();
  }

  return (
    <section className="relative mx-auto min-h-135 max-w-360 overflow-hidden sm:min-h-137.5 md:min-h-117.5">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-18.5 h-107.5 w-225 -translate-x-1/2 opacity-60"
        style={{
          backgroundImage: "url('/images/home-hero-dots.png')",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center top",
          backgroundSize: "900px 430px",
        }}
      />

      <div className="relative z-10 px-4 pt-10.5 text-center sm:px-6 md:pt-9.5 lg:pt-10">
        <div className="relative mx-auto flex h-7 w-full max-w-115 items-center justify-center before:absolute before:left-0 before:right-0 before:top-1/2 before:h-px before:bg-white/8">
          <div className="relative z-10 flex h-6 items-center gap-1.5 rounded-full border border-white/9 bg-[#0b0b0e] px-2.5">
            <span className="flex size-3.75 items-center justify-center rounded-sm bg-[#df7a3a]" aria-hidden="true">
              <svg
                className="size-2.75 text-[#171419]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" />
                <rect x="3" y="7" width="18" height="12" rx="2.5" />
                <path d="M9 7v12M15 7v12M3 12h18M10 12v2h4v-2" />
              </svg>
            </span>
            <p className="whitespace-nowrap font-mono text-[9px] uppercase leading-none tracking-[0.04em] text-[#777987]">
              <span className="mr-1 font-bold text-white">{newJobsThisMonth.toLocaleString()}+</span>
              new jobs this month
            </p>
          </div>
        </div>

        <h1 className="mt-4 font-sans text-[26px] font-bold leading-[1.15] tracking-[-1px] text-[#f4f4f7] sm:text-[34px] lg:text-[32px]">
          Find Your Dream Job Today
        </h1>
        <p className="mx-auto mt-2 max-w-130 font-sans text-[12px] leading-4.5 text-[#9899a9] sm:text-[13px] lg:max-w-155">
          Hireloop connects top talent with world-class companies. Browse thousands of
          <br className="hidden sm:block" /> curated opportunities and land your next role faster.
        </p>

        <form
          onSubmit={submitSearch}
          action="#open-roles"
          className="mx-auto mt-5 flex max-w-120 flex-wrap items-center rounded-[10px] border border-white/9 bg-[#17171f]/95 p-1.25 shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
        >
          <label className="order-1 flex h-10 min-w-0 flex-[1_1_65%] items-center gap-2 px-3 sm:flex-1">
            <svg
              className="size-4 shrink-0 text-[#9a9ba7]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              maxLength={100}
              aria-label="Job title, skill, or company"
              className="min-w-0 flex-1 bg-transparent font-sans text-[11px] text-white outline-none placeholder:text-[#777987]"
              placeholder="Job title, skill or company"
            />
          </label>

          <div className="hidden h-7 w-px bg-white/[0.07] sm:block" />

          <label className="order-3 flex h-10 basis-full items-center gap-2 border-t border-white/[0.07] px-3 sm:order-2 sm:h-13 sm:basis-auto sm:flex-[0.9] sm:border-t-0 sm:pl-3">
            <svg
              className="size-4 shrink-0 text-[#9a9ba7]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="8" />
              <path d="M12 4v16M4 12h16M6 7.5c3.6 2 8.4 2 12 0M6 16.5c3.6-2 8.4-2 12 0" />
            </svg>
            <input
              value={location}
              onChange={(event) => onLocationChange(event.target.value)}
              maxLength={100}
              aria-label="Location"
              className="min-w-0 flex-1 bg-transparent font-sans text-[11px] text-white outline-none placeholder:text-[#777987]"
              placeholder="Location or Remote"
            />
          </label>

          <button
            type="submit"
            aria-label="Search jobs"
            className="order-2 flex size-10.5 shrink-0 items-center justify-center rounded-lg bg-[#6258ff] text-white shadow-[inset_0_3px_10px_rgba(255,255,255,0.18)] sm:order-3"
          >
            <svg
              className="size-4.25"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="6" />
              <path d="m16 16 4 4" />
            </svg>
          </button>
        </form>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-2">
          {popularSearches.map((search, index) => (
            <span key={search} className="flex items-center">
              {index > 0 && <span className="mr-2 text-[10px] text-[#4d4d58]">/</span>}
              <button
                type="button"
                onClick={() => selectPopularSearch(search)}
                className="rounded-full bg-white/2.5 px-2.5 py-1 font-sans text-[9px] text-[#a8a8b4] transition hover:bg-white/8 hover:text-white"
              >
                {search}
              </button>
            </span>
          ))}
        </div>
      </div>

      <div
        aria-hidden="true"
        className="world-globe absolute left-1/2 top-68.75 h-90 w-180 -translate-x-1/2 rounded-t-[360px] sm:top-71.25 md:top-62.5 md:h-97.5 md:w-190 md:rounded-t-[390px] lg:top-62.5 lg:h-107.5 lg:w-295 lg:rounded-t-[590px]"
      />

      <p className="absolute left-1/2 top-102.5 z-20 w-[calc(100%-32px)] max-w-130 -translate-x-1/2 text-center font-sans text-[16px] font-medium leading-5.5 tracking-[-0.4px] text-[#aeb4db] md:top-97.5 md:w-auto md:max-w-none md:text-[21px] md:leading-6.5 md:tracking-[-0.6px]">
        <span className="block">Assisting over 15,000 job seekers</span>
        <span className="block">find their dream positions.</span>
      </p>
    </section>
  );
}
