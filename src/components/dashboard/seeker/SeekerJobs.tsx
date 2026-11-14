'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import Image from 'next/image';
import JobSaveButton from '@/components/browse-jobs/JobSaveButton';
import DashboardIcon from '@/components/dashboard/shared/DashboardIcon';
import { getJobApplyHref } from '@/lib/job-routes';
import { useSeekerDashboardData } from './useSeekerDashboardData';
import SeekerPageHeader from './SeekerPageHeader';

export default function SeekerJobs({ initialSearch = '' }: { initialSearch?: string }) {
  const { jobs, loading, error } = useSeekerDashboardData({ includeApplications: false });
  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return jobs.filter((job) => !query || `${job.title} ${job.company} ${job.location} ${job.category}`.toLowerCase().includes(query));
  }, [jobs, search]);
  const totalPages = Math.ceil(filteredJobs.length / pageSize);
  const pageJobs = filteredJobs.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-7">
      <SeekerPageHeader title="Find Jobs" description="Explore current opportunities matched to your next move." />
      <label className="mb-5 block max-w-lg">
        <span className="sr-only">Search jobs</span>
        <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search jobs, companies, or skills..." className="h-10 w-full rounded-lg border border-[#29292f] bg-[#131316] px-3 text-xs text-white outline-none placeholder:text-[#777780] focus:border-[#8178ff]" />
      </label>
      {error && <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-300">{error}</p>}
      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">{[0, 1, 2, 3].map((item) => <div key={item} className="h-40 animate-pulse rounded-xl bg-[#131316]" />)}</div>
      ) : pageJobs.length ? (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {pageJobs.map((job) => (
              <article key={job.id} className="rounded-xl border border-[#26262b] bg-[#131316] p-4">
                <div className="flex items-start gap-3">
                  <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#29292f] bg-[#19191e] text-[#c8c8d0]">{job.companyLogo ? <Image src={job.companyLogo} alt="" fill unoptimized className="object-cover" /> : <DashboardIcon name="briefcase" />}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/browse-jobs/${encodeURIComponent(job.id)}`} className="text-sm font-semibold text-[#ededf2] hover:text-white">{job.title}</Link>
                    <p className="mt-1 text-[11px] text-[#92929b]">{job.company}</p>
                  </div>
                  <JobSaveButton jobId={job.id} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-[10px] text-[#a2a2ab]">
                  <span className="rounded border border-[#2a2a30] px-2 py-1">{job.location}</span>
                  <span className="rounded border border-[#2a2a30] px-2 py-1">{job.type}</span>
                  <span className="rounded border border-[#2a2a30] px-2 py-1">{job.compensation}</span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-[#242428] pt-3">
                  <span className="text-[10px] text-[#85858e]">{job.category || job.department || 'Open opportunity'}</span>
                  <Link href={getJobApplyHref(job.id)} className="rounded-md bg-white px-3.5 py-2 text-[10px] font-semibold text-[#171719]">View & Apply</Link>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between text-[10px] text-[#85858e]">
            <span>{filteredJobs.length} open {filteredJobs.length === 1 ? 'role' : 'roles'}</span>
            {totalPages > 1 && <div className="flex gap-2"><button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded border border-[#303036] px-3 py-2 disabled:opacity-40">Previous</button><span className="px-2 py-2">{page} / {totalPages}</span><button type="button" disabled={page === totalPages} onClick={() => setPage((value) => value + 1)} className="rounded border border-[#303036] px-3 py-2 disabled:opacity-40">Next</button></div>}
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-[#26262b] bg-[#131316] px-5 py-14 text-center">
          <p className="text-sm text-white">{search ? 'No jobs match your search' : 'No open jobs are available right now'}</p>
          <p className="mt-1 text-xs text-[#85858e]">Try another search or check back later.</p>
        </div>
      )}
    </div>
  );
}
