'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useSession } from '@/lib/auth-client';
import { useSavedJobIds } from './useSavedJobIds';
import { useSeekerDashboardData } from './useSeekerDashboardData';
import { getTimeAgo } from './seeker-data';
import SeekerMetricCard from './SeekerMetricCard';
import SeekerPageHeader from './SeekerPageHeader';

export default function SeekerDashboardHome() {
  const { data: session } = useSession();
  const { applications, loading, error } = useSeekerDashboardData({ includeJobs: false });
  const { jobIds } = useSavedJobIds();
  const interviews = applications.filter((application) =>
    /interview/i.test(application.status),
  ).length;
  const offers = applications.filter((application) =>
    /offer/i.test(application.status),
  ).length;
  const recentApplications = useMemo(
    () =>
      [...applications]
        .sort(
          (first, second) =>
            new Date(second.updatedAt || second.createdAt || 0).getTime() -
            new Date(first.updatedAt || first.createdAt || 0).getTime(),
        )
        .slice(0, 6),
    [applications],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-7">
      <SeekerPageHeader
        title={`Welcome back${session?.user.name ? `, ${session.user.name}` : ''}`}
        description="Track your job search and see what needs your attention."
        actions={
          <Link
            href="/dashboard/seeker/jobs"
            className="rounded-lg bg-white px-4 py-2.5 text-xs font-semibold text-[#171719] transition hover:bg-[#dedee3]"
          >
            Browse jobs
          </Link>
        }
      />

      {error && (
        <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-300">
          {error}
          <button type="button" onClick={() => window.location.reload()} className="underline">
            Retry
          </button>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Job search summary">
        <SeekerMetricCard label="Saved Jobs" value={jobIds.length} icon="bookmark" tone="text-white" />
        <SeekerMetricCard label="Applications Submitted" value={loading ? '—' : applications.length} icon="document" tone="text-[#aaa2ff]" />
        <SeekerMetricCard label="Interviews Scheduled" value={loading ? '—' : interviews} icon="calendar" tone="text-amber-400" />
        <SeekerMetricCard label="Offers Received" value={loading ? '—' : offers} icon="offer" tone="text-emerald-400" />
      </section>

      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[#f0f0f3]">Recent Activity</h2>
          <Link href="/dashboard/seeker/applied" className="text-[11px] text-[#aaa2ff] hover:text-white">
            View applications
          </Link>
        </div>
        <div className="overflow-hidden rounded-xl border border-[#26262b] bg-[#131316]">
          {loading ? (
            <div className="space-y-2 p-4" aria-label="Loading recent activity">
              {[0, 1, 2].map((item) => <div key={item} className="h-12 animate-pulse rounded-md bg-white/4" />)}
            </div>
          ) : recentApplications.length ? (
            <ul className="divide-y divide-[#242428]">
              {recentApplications.map((application) => (
                <li key={application.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#24242a] text-xs text-[#c8c4ff]" aria-hidden="true">
                    ↻
                  </span>
                  <p className="min-w-0 flex-1 text-xs leading-5 text-[#d9d9df]">
                    Application for <span className="font-medium text-white">{application.jobTitle}</span> at {application.company} updated to{' '}
                    <span className="text-[#aaa2ff]">{application.status}</span>
                  </p>
                  <time className="shrink-0 text-[10px] text-[#85858e]">
                    {getTimeAgo(application.updatedAt || application.createdAt)}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-medium text-[#d9d9df]">No activity yet</p>
              <p className="mt-1 text-xs text-[#85858e]">Your submitted applications will appear here.</p>
              <Link href="/dashboard/seeker/jobs" className="mt-4 inline-flex text-xs text-[#aaa2ff] hover:text-white">
                Explore open jobs →
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
