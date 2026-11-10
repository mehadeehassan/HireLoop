'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import Image from 'next/image';
import JobSaveButton from '@/components/browse-jobs/JobSaveButton';
import DashboardIcon from '@/components/dashboard/DashboardIcon';
import type { PublicJob } from '@/lib/public-jobs';
import { getJobApplyHref } from '@/lib/job-routes';
import { getTimeAgo } from './seeker-data';
import { useSavedJobIds } from './useSavedJobIds';
import { useSeekerDashboardData } from './useSeekerDashboardData';
import SeekerMetricCard from './SeekerMetricCard';
import SeekerPageHeader from './SeekerPageHeader';

function getDaysUntilDeadline(deadline?: string | null) {
  if (!deadline) return null;
  const timestamp = new Date(deadline).getTime();
  if (Number.isNaN(timestamp)) return null;
  const remaining = timestamp - Date.now();
  return remaining < 0 ? -1 : Math.ceil(remaining / 86_400_000);
}

export default function SeekerSavedJobs() {
  const { jobs, loading, error } = useSeekerDashboardData();
  const { jobIds, savedAt } = useSavedJobIds();
  const [category, setCategory] = useState('All Saved');
  const [sort, setSort] = useState('Recently Saved');
  const savedJobs = useMemo(() => {
    const saved = jobs.filter((job) => jobIds.includes(job.id));
    const filtered = category === 'All Saved'
      ? saved
      : saved.filter((job) => (job.category || job.department) === category);
    return filtered.sort((first, second) => {
      if (sort === 'Title') return first.title.localeCompare(second.title);
      const firstSavedAt = savedAt[first.id];
      const secondSavedAt = savedAt[second.id];
      if (firstSavedAt && secondSavedAt) return secondSavedAt.localeCompare(firstSavedAt);
      if (firstSavedAt) return -1;
      if (secondSavedAt) return 1;
      return jobIds.indexOf(second.id) - jobIds.indexOf(first.id);
    });
  }, [jobs, jobIds, category, savedAt, sort]);
  const categories = useMemo(
    () => [...new Set(jobs.filter((job) => jobIds.includes(job.id)).map((job) => job.category || job.department).filter(Boolean))],
    [jobs, jobIds],
  );
  const closingSoonCount = jobs.filter((job) => {
    if (!jobIds.includes(job.id)) return false;
    const days = getDaysUntilDeadline(job.deadline);
    return days !== null && days >= 0 && days <= 7;
  }).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-7">
      <SeekerPageHeader
        title="Saved Jobs"
        description="Manage and track your bookmarked opportunities."
        actions={
          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:min-w-64">
            <SeekerMetricCard label="Total Saved" value={jobIds.length} icon="bookmark" tone="text-white" />
            <SeekerMetricCard label="Closing Soon" value={loading ? '—' : closingSoonCount} icon="calendar" tone="text-amber-400" />
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#26262b] bg-[#131316] p-3">
        <div className="flex flex-wrap gap-1.5">
          {['All Saved', ...categories].map((item) => (
            <button key={item} type="button" onClick={() => setCategory(item)} className={`rounded-md px-3 py-2 text-[10px] transition ${category === item ? 'bg-[#25252b] text-white' : 'text-[#92929b] hover:bg-white/5 hover:text-white'}`}>
              {item}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-[10px] text-[#85858e]">
          Sort by
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-md border border-[#2b2b31] bg-[#17171b] px-2.5 py-2 text-[#dedee3] outline-none">
            <option>Recently Saved</option>
            <option>Title</option>
          </select>
        </label>
      </div>

      {error && <ErrorBanner message={error} />}
      {loading ? <LoadingList /> : savedJobs.length ? (
        <div className="space-y-3">
          {savedJobs.map((job) => <SavedJobCard key={job.id} job={job} savedAt={savedAt[job.id]} />)}
        </div>
      ) : (
        <div className="rounded-xl border border-[#26262b] bg-[#131316] px-5 py-16 text-center">
          <span className="mx-auto flex size-11 items-center justify-center rounded-lg bg-white/5 text-[#aaa2ff]"><DashboardIcon name="bookmark" /></span>
          <h2 className="mt-4 text-sm font-medium text-white">{jobIds.length ? 'Saved jobs are unavailable' : 'No saved jobs yet'}</h2>
          <p className="mt-1 text-xs text-[#85858e]">Save jobs while browsing and they will show up here.</p>
          <Link href="/dashboard/seeker/jobs" className="mt-4 inline-flex rounded-lg bg-white px-4 py-2.5 text-xs font-semibold text-[#171719]">Explore jobs</Link>
        </div>
      )}
    </div>
  );
}

function SavedJobCard({ job, savedAt }: { job: PublicJob; savedAt?: string }) {
  const daysUntilDeadline = getDaysUntilDeadline(job.deadline);

  return (
    <article className="flex flex-wrap items-center gap-4 rounded-xl border border-[#26262b] bg-[#131316] p-4 sm:px-5">
      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#29292f] bg-[#19191e] text-[#c8c8d0]">
        {job.companyLogo ? <Image src={job.companyLogo} alt="" width={40} height={40} unoptimized className="size-full object-cover" /> : <DashboardIcon name="briefcase" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/browse-jobs/${encodeURIComponent(job.id)}`} className="text-sm font-semibold text-[#ededf2] hover:text-white">{job.title}</Link>
          {job.verifiedEmployer && <span className="rounded bg-white/6 px-1.5 py-0.5 text-[8px] uppercase tracking-wide text-[#8f909a]">Verified</span>}
        </div>
        <p className="mt-1 text-[11px] text-[#92929b]">{job.company}</p>
        <p className="mt-1 text-[9px] text-[#777780]">
          {savedAt ? `Saved ${getTimeAgo(savedAt)}` : 'Saved previously'}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-[#a2a2ab]">
          <span className="rounded border border-[#2a2a30] px-2 py-1">{job.location}</span>
          <span className="rounded border border-[#2a2a30] px-2 py-1">{job.compensation}</span>
          <span className="rounded border border-[#2a2a30] px-2 py-1">{job.type}</span>
          {daysUntilDeadline !== null && daysUntilDeadline >= 0 && daysUntilDeadline <= 7 && (
            <span className="rounded border border-amber-500/20 px-2 py-1 text-amber-300">
              {daysUntilDeadline === 0 ? 'Closes today' : `Closes in ${daysUntilDeadline} days`}
            </span>
          )}
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <JobSaveButton jobId={job.id} />
        <Link href={getJobApplyHref(job.id)} className="rounded-md bg-white px-3.5 py-2 text-[10px] font-semibold text-[#171719] hover:bg-[#dedee3]">View & Apply</Link>
      </div>
    </article>
  );
}

function LoadingList() {
  return <div className="space-y-3">{[0, 1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl border border-[#26262b] bg-[#131316]" />)}</div>;
}

function ErrorBanner({ message }: { message: string }) {
  return <p role="alert" className="mb-4 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-300">{message}</p>;
}
