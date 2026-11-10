import Link from "next/link";
import { useState } from "react";
import type { PublicJob } from "@/lib/public-jobs";
import { getJobApplyHref } from "@/lib/job-routes";

type FeaturedJobsSectionProps = {
  jobs: PublicJob[];
  query: string;
  location: string;
  loading: boolean;
  error: string;
  hasFilters: boolean;
  onClearFilters: () => void;
  onRetry: () => void;
};

function JobCard({ job }: { job: PublicJob }) {
  return (
    <article className="flex min-h-53.5 flex-col rounded-[18px] border border-white/[0.035] bg-[#171719] p-5 transition duration-200 hover:-translate-y-1 hover:border-white/10 hover:bg-[#1b1b1e] sm:p-4.5">
      <h3 className="line-clamp-2 text-[18px] font-medium leading-tight tracking-[-0.45px] text-[#f2f2f5]">
        {job.title}
      </h3>
      <p className="mt-2 line-clamp-2 min-h-10 text-[12px] leading-[1.6] text-[#9999a2]">
        {job.description}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#242427] px-2 py-1 text-[10px] text-[#d3d3d8]">
          <svg
            className="size-3.5 shrink-0 text-[#e991ee]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
            <circle cx="12" cy="10" r="2" />
          </svg>
          <span className="truncate">{job.location}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#242427] px-2 py-1 text-[10px] text-[#d3d3d8]">
          <svg
            className="size-3.5 shrink-0 text-[#e991ee]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <rect x="3" y="7" width="18" height="13" rx="2" />
            <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7M3 12h18" />
          </svg>
          {job.workMode}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#242427] px-2 py-1 text-[10px] text-[#d3d3d8]">
          <svg
            className="size-3.5 shrink-0 text-[#e991ee]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="8.5" />
            <path d="M15.5 8.5c-.7-.7-1.6-1-2.8-1-1.5 0-2.5.8-2.5 1.9 0 3 5.5 1 5.5 4 0 1.2-1.1 2.1-2.8 2.1-1.2 0-2.3-.4-3-1.2M12.5 5.5v13" />
          </svg>
          {job.compensation}
        </span>
      </div>

      <div className="mt-auto pt-3">
        <Link
          href={getJobApplyHref(job.id)}
          className="inline-flex min-h-8 items-center gap-2 text-[11px] font-medium text-white transition hover:text-[#d4cfff]"
        >
          Apply Now <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}

function JobCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="min-h-53.5 animate-pulse rounded-[18px] border border-white/4 bg-[#151517] p-4.5"
    >
      <div className="h-5 w-3/4 rounded bg-white/10" />
      <div className="mt-3 h-3 w-full rounded bg-white/6" />
      <div className="mt-2 h-3 w-2/3 rounded bg-white/6" />
      <div className="mt-5 h-6 w-2/3 rounded-full bg-white/8" />
    </div>
  );
}

export default function FeaturedJobsSection({
  jobs,
  query,
  location,
  loading,
  error,
  hasFilters,
  onClearFilters,
  onRetry,
}: FeaturedJobsSectionProps) {
  const [expandedSearch, setExpandedSearch] = useState<string | null>(null);
  const searchKey = `${query.trim().toLowerCase()}|${location.trim().toLowerCase()}`;
  const showAll = expandedSearch === searchKey;

  return (
    <section
      id="open-roles"
      className="scroll-mt-8 bg-black px-4 py-16 sm:px-6 sm:py-20 lg:px-10 lg:py-22"
    >
      <div className="mx-auto max-w-310">
        <div className="mx-auto mb-9 max-w-xl text-center sm:mb-10">
          <p className="mb-3 inline-flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#b8b8c2]">
            <span className="size-1.5 bg-[#695cff]" aria-hidden="true" />
            Smart job discovery
            <span className="size-1.5 bg-[#695cff]" aria-hidden="true" />
          </p>
          <h2 className="text-[30px] font-medium leading-[1.12] tracking-[-1.3px] text-white sm:text-[38px]">
            The roles you&apos;d never
            <br className="hidden sm:block" /> find by searching
          </h2>
        </div>

        {loading ? (
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => <JobCardSkeleton key={index} />)}
          </div>
        ) : error ? (
          <div role="alert" className="rounded-2xl border border-red-300/15 bg-red-300/4 px-5 py-10 text-center">
            <p className="text-sm text-[#f0c2c2]">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 rounded-lg border border-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/5"
            >
              Try again
            </button>
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-white/8 bg-[#111113] px-5 py-12 text-center">
            <p className="text-base font-medium text-white">
              {hasFilters ? "No jobs match your search." : "No open roles right now."}
            </p>
            <p className="mt-2 text-sm text-[#92929b]">
              {hasFilters ? "Try another title or location." : "Check back soon for new opportunities."}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="mt-4 text-sm text-[#bcb5ff] hover:text-white"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {(showAll ? jobs : jobs.slice(0, 6)).map((job) => <JobCard key={job.id} job={job} />)}
            </div>

            {jobs.length > 6 && (
              <div className="mt-7 text-center">
                <button
                  type="button"
                  onClick={() => setExpandedSearch(showAll ? null : searchKey)}
                  className="min-h-10.5 rounded-lg bg-white px-4 text-[12px] font-medium text-[#111113] transition hover:bg-[#e8e8ed]"
                >
                  {showAll ? "Show featured jobs" : "View all open jobs"}
                </button>
              </div>
            )}
          </>
        )}

        {hasFilters && !loading && !error && jobs.length > 0 && (
          <p className="mt-4 text-center text-xs text-[#8f8f97]">
            Showing results for {[query, location].filter(Boolean).join(" · ")}
            <button type="button" onClick={onClearFilters} className="ml-2 text-[#bcb5ff] hover:text-white">
              Clear
            </button>
          </p>
        )}
      </div>
    </section>
  );
}
