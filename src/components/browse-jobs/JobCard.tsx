import type { ReactNode } from 'react';
import Link from 'next/link';
import type { PublicJob } from '@/lib/public-jobs';
import { getJobApplyHref } from '@/lib/job-routes';
import JobSaveButton from './JobSaveButton';

function getCompanyInitials(company: string) {
  return company
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

function JobBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-white/[0.07] bg-[#1a1a1d] px-2 py-1 text-[10px] text-[#d6d6dd]">
      {children}
    </span>
  );
}

export default function JobCard({ job }: { job: PublicJob }) {
  return (
    <article className="relative flex min-h-39 gap-3.5 rounded-xl border border-white/6 bg-[#141416] p-4 transition hover:border-white/12 sm:gap-4 sm:p-5">
      <Link
        href={`/browse-jobs/${encodeURIComponent(job.id)}`}
        aria-label={`View details for ${job.title}`}
        className="absolute inset-0 z-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8178ff]"
      >
        <span className="sr-only">View job details</span>
      </Link>

      <div
        aria-hidden="true"
        className="relative z-10 mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-md border border-white/[0.07] bg-[#202024] text-xs font-semibold text-[#c2bdff]"
      >
        {getCompanyInitials(job.company) || 'J'}
      </div>

      <div className="pointer-events-none relative z-10 min-w-0 flex-1">
        <h2 className="truncate text-sm font-semibold tracking-[-0.2px] text-[#ededf3] sm:text-base">
          {job.title}
        </h2>
        <p className="mt-1 truncate text-xs text-[#92929b]">
          {job.company} <span className="px-1 text-[#55555c]">•</span> {job.location}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <JobBadge>
            <svg
              className="size-3 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
            >
              <rect x="3" y="6" width="18" height="13" rx="2" />
              <path d="M8 6V4h8v2M3 11h18" />
            </svg>
            {job.compensation}
          </JobBadge>
          <JobBadge>{job.type}</JobBadge>
          {job.workMode === 'Hybrid' && <JobBadge>{job.workMode}</JobBadge>}
          <Link
            href={getJobApplyHref(job.id)}
            className="pointer-events-auto relative z-20 inline-flex items-center gap-1.5 rounded-md border border-emerald-500/25 bg-emerald-500/8 px-2 py-1 text-[10px] font-medium text-emerald-400 transition hover:bg-emerald-500/15"
          >
            <svg
              className="size-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z" />
            </svg>
            Easy Apply
          </Link>
        </div>
      </div>

      <JobSaveButton jobId={job.id} className="relative z-20 -mt-1 -mr-1" />
    </article>
  );
}
