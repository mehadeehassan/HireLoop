'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import DashboardPagination from '@/components/dashboard/DashboardPagination';
import DashboardIcon from '@/components/dashboard/DashboardIcon';
import { useSeekerDashboardData } from './useSeekerDashboardData';
import { getTimeAgo, type SeekerApplication } from './seeker-data';
import SeekerMetricCard from './SeekerMetricCard';
import SeekerPageHeader from './SeekerPageHeader';

const pageSize = 5;
const archivedApplicationsKey = 'hireloop:archived-applications';
const archivedApplicationsEvent = 'hireloop:archived-applications-change';

function isStatusArchived(status: string) {
  return /rejected|withdrawn|archived|closed/i.test(status);
}

function readArchivedApplicationIds() {
  const parsed: unknown = JSON.parse(localStorage.getItem(archivedApplicationsKey) || '[]');
  if (!Array.isArray(parsed) || !parsed.every((id): id is string => typeof id === 'string')) {
    throw new Error('Archived application data is invalid.');
  }
  return parsed;
}

function statusStyle(status: string) {
  const normalized = status.toLowerCase();
  if (/shortlist|interview|offer/i.test(normalized)) return 'border-blue-500/20 bg-blue-500/10 text-blue-300';
  if (/review/i.test(normalized)) return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
  if (/reject|withdraw|closed/i.test(normalized)) return 'border-red-500/20 bg-red-500/10 text-red-300';
  return 'border-white/10 bg-white/5 text-[#c5c5cc]';
}

export default function SeekerApplications() {
  const { applications, loading, error } = useSeekerDashboardData({ includeJobs: false });
  const [tab, setTab] = useState<'Active' | 'Archived'>('Active');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [archivedIds, setArchivedIds] = useState<string[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<SeekerApplication | null>(null);

  useEffect(() => {
    function syncArchivedApplications() {
      try {
        setArchivedIds(readArchivedApplicationIds());
      } catch (archiveError) {
        console.error('Could not read archived seeker applications', archiveError);
        toast.error('Your locally archived applications could not be loaded.');
      }
    }

    syncArchivedApplications();
    window.addEventListener(archivedApplicationsEvent, syncArchivedApplications);
    window.addEventListener('storage', syncArchivedApplications);
    return () => {
      window.removeEventListener(archivedApplicationsEvent, syncArchivedApplications);
      window.removeEventListener('storage', syncArchivedApplications);
    };
  }, []);

  const visibleApplications = useMemo(() => applications.filter((application) => {
    const archived =
      isStatusArchived(application.status) || archivedIds.includes(application.id);
    const matchesTab = archived === (tab === 'Archived');
    const query = search.trim().toLowerCase();
    return matchesTab && (!query || `${application.jobTitle} ${application.company} ${application.status}`.toLowerCase().includes(query));
  }), [applications, archivedIds, tab, search]);
  const interviews = applications.filter((application) => /interview/i.test(application.status)).length;
  const shortlisted = applications.filter((application) => /shortlist/i.test(application.status)).length;
  const successRate = applications.length
    ? `${Math.round((applications.filter((application) => /offer/i.test(application.status)).length / applications.length) * 100)}%`
    : '0%';
  const totalPages = Math.ceil(visibleApplications.length / pageSize);
  const currentPage = Math.min(page, Math.max(totalPages, 1));
  const pageItems = visibleApplications.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function setApplicationArchived(application: SeekerApplication, archived: boolean) {
    try {
      const nextIds = new Set(readArchivedApplicationIds());
      if (archived) nextIds.add(application.id);
      else nextIds.delete(application.id);

      const updatedIds = [...nextIds];
      localStorage.setItem(archivedApplicationsKey, JSON.stringify(updatedIds));
      setArchivedIds(updatedIds);
      window.dispatchEvent(new Event(archivedApplicationsEvent));
      setTab(archived ? 'Archived' : 'Active');
      setPage(1);
      toast.success(archived ? 'Application archived on this device.' : 'Application restored.');
    } catch (archiveError) {
      console.error('Could not update locally archived seeker applications', archiveError);
      toast.error('Could not update the archived applications on this device.');
    }
  }

  function exportCsv() {
    const rows = [
      ['Job Title', 'Company', 'Applied', 'Status'],
      ...visibleApplications.map((application) => [
        application.jobTitle,
        application.company,
        application.date || application.createdAt || '',
        application.status,
      ]),
    ];
    const csv = rows.map((row) => row.map((field) => `"${String(field).replaceAll('"', '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = 'hireloop-applications.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-7">
      <SeekerPageHeader
        title="My Applications"
        description="Track your job applications and interview progress."
        actions={
          <div className="flex items-center gap-2 rounded-lg border border-[#29292f] bg-[#131316] p-1">
            {(['Active', 'Archived'] as const).map((value) => (
              <button key={value} type="button" onClick={() => { setTab(value); setPage(1); }} className={`rounded-md px-3 py-2 text-[10px] ${tab === value ? 'bg-[#25252b] text-white' : 'text-[#92929b] hover:text-white'}`}>{value}</button>
            ))}
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SeekerMetricCard label="Total Applied" value={loading ? '—' : applications.length} icon="document" tone="text-[#aaa2ff]" />
        <SeekerMetricCard label="Shortlisted" value={loading ? '—' : shortlisted} icon="users" tone="text-blue-400" />
        <SeekerMetricCard label="Interviews" value={loading ? '—' : interviews} icon="calendar" tone="text-amber-400" />
        <SeekerMetricCard label="Offer Rate" value={loading ? '—' : successRate} icon="offer" tone="text-emerald-400" />
      </section>

      <section className="mt-5 overflow-hidden rounded-xl border border-[#26262b] bg-[#131316]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#26262b] p-4">
          <label className="relative w-full max-w-sm">
            <span className="sr-only">Search applications</span>
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search applications..." className="h-9 w-full rounded-md border border-[#2b2b31] bg-[#101013] px-3 text-xs text-white outline-none placeholder:text-[#777780] focus:border-[#8178ff]" />
          </label>
          <button type="button" onClick={exportCsv} disabled={!visibleApplications.length} className="flex items-center gap-2 rounded-md border border-[#303036] px-3 py-2 text-[10px] text-[#dedee3] hover:bg-white/5 disabled:opacity-40">
            <span aria-hidden="true">↓</span> Export CSV
          </button>
        </div>
        {error && <p role="alert" className="m-4 rounded-md bg-red-500/5 p-3 text-xs text-red-300">{error}</p>}
        {loading ? (
          <div className="space-y-px">{[0, 1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse bg-white/[0.025]" />)}</div>
        ) : pageItems.length ? (
          <>
            <div className="hidden grid-cols-[minmax(180px,1.3fr)_minmax(110px,1fr)_minmax(95px,.75fr)_minmax(90px,.65fr)_minmax(130px,auto)] gap-3 bg-[#19191e] px-4 py-3 text-[9px] uppercase tracking-wide text-[#85858e] sm:grid sm:px-5">
              <span>Job Title</span><span>Company</span><span>Applied</span><span>Status</span><span className="text-right">Action</span>
            </div>
            <ul className="divide-y divide-[#242428]">
              {pageItems.map((application) => (
                <li key={application.id} className="grid gap-2 px-4 py-4 sm:grid-cols-[minmax(180px,1.3fr)_minmax(110px,1fr)_minmax(95px,.75fr)_minmax(90px,.65fr)_minmax(130px,auto)] sm:items-center sm:gap-3 sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#24242a] text-[#c8c8d0]"><DashboardIcon name="briefcase" className="size-4" /></span>
                    <div className="min-w-0"><p className="truncate text-xs font-medium text-[#e7e7ec]">{application.jobTitle}</p><p className="mt-1 text-[9px] text-[#85858e]">{application.type || 'Job'}{application.workMode ? ` · ${application.workMode}` : ''}</p></div>
                  </div>
                  <p className="truncate text-[11px] text-[#c7c7ce]">{application.company}</p>
                  <time className="text-[10px] text-[#92929b]">{getTimeAgo(application.createdAt)}</time>
                  <span className={`w-fit rounded-full border px-2.5 py-1 text-[9px] ${statusStyle(application.status)}`}>{application.status}</span>
                  <div className="flex items-center gap-3 sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedApplication(application)}
                      className="text-left text-[10px] text-[#c7c7ce] hover:text-white"
                    >
                      Details
                    </button>
                    {tab === 'Active' && !isStatusArchived(application.status) && (
                      <button
                        type="button"
                        onClick={() => setApplicationArchived(application, true)}
                        className="text-[10px] text-[#92929b] hover:text-white"
                      >
                        Archive
                      </button>
                    )}
                    {tab === 'Archived' && archivedIds.includes(application.id) && (
                      <button
                        type="button"
                        onClick={() => setApplicationArchived(application, false)}
                        className="text-[10px] text-[#aaa2ff] hover:text-white"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#26262b] px-4 py-2">
              <p className="text-[10px] text-[#85858e]">Showing {visibleApplications.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, visibleApplications.length)} of {visibleApplications.length} applications</p>
              <DashboardPagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </>
        ) : (
          <div className="px-5 py-14 text-center">
            <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-white/[0.05] text-[#aaa2ff]"><DashboardIcon name="document" /></span>
            <p className="mt-3 text-sm font-medium text-white">{search ? 'No matching applications' : tab === 'Active' ? 'No applications yet' : 'No archived applications'}</p>
            <p className="mt-1 text-xs text-[#85858e]">Applications you submit will appear here with their latest status.</p>
            {!applications.length && <Link href="/dashboard/seeker/jobs" className="mt-4 inline-flex text-xs text-[#aaa2ff]">Find a job →</Link>}
          </div>
        )}
      </section>
      {selectedApplication && (
        <ApplicationDetailsDialog
          application={selectedApplication}
          onClose={() => setSelectedApplication(null)}
        />
      )}
    </div>
  );
}

function ApplicationDetailsDialog({
  application,
  onClose,
}: {
  application: SeekerApplication;
  onClose: () => void;
}) {
  const details = [
    { label: 'Applicant', value: application.name },
    { label: 'Email', value: application.email },
    { label: 'Phone', value: application.phone },
    { label: 'Location', value: application.location },
    { label: 'Experience', value: application.experience },
    {
      label: 'Skills',
      value: Array.isArray(application.skills)
        ? application.skills.join(', ')
        : application.skills,
    },
  ].filter((detail): detail is { label: string; value: string } => Boolean(detail.value?.trim()));

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="application-details-title"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-white/[0.08] bg-[#111113] p-5 shadow-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-[#92929b]">Application details</p>
            <h2 id="application-details-title" className="mt-1 text-lg font-semibold text-white">
              {application.jobTitle}
            </h2>
            <p className="mt-1 text-xs text-[#a2a2ab]">{application.company}</p>
          </div>
          <button
            type="button"
            aria-label="Close application details"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-md border border-white/[0.08] text-lg text-[#aaa] hover:bg-white/5"
          >
            ×
          </button>
        </div>

        <dl className="mt-5 grid gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 sm:grid-cols-2">
          <div>
            <dt className="text-[9px] uppercase tracking-wide text-[#85858e]">Status</dt>
            <dd className="mt-1 text-xs text-[#ededf2]">{application.status}</dd>
          </div>
          <div>
            <dt className="text-[9px] uppercase tracking-wide text-[#85858e]">Applied</dt>
            <dd className="mt-1 text-xs text-[#ededf2]">
              {application.date || getTimeAgo(application.createdAt)}
            </dd>
          </div>
          {details.map(({ label, value }) => (
            <div key={label} className="min-w-0">
              <dt className="text-[9px] uppercase tracking-wide text-[#85858e]">{label}</dt>
              <dd className="mt-1 break-words text-xs text-[#ededf2]">{value}</dd>
            </div>
          ))}
          {application.coverLetter && (
            <div className="sm:col-span-2">
              <dt className="text-[9px] uppercase tracking-wide text-[#85858e]">Cover letter</dt>
              <dd className="mt-1 whitespace-pre-wrap text-xs leading-5 text-[#ededf2]">
                {application.coverLetter}
              </dd>
            </div>
          )}
        </dl>

        {application.jobId ? (
          <Link
            href={`/browse-jobs/${encodeURIComponent(application.jobId)}`}
            onClick={onClose}
            className="mt-5 inline-flex rounded-md border border-white/[0.08] px-3 py-2 text-[10px] text-[#dedee3] hover:bg-white/5"
          >
            View job posting
          </Link>
        ) : (
          <p className="mt-4 text-[10px] text-[#92929b]">
            The original job posting is unavailable for this application.
          </p>
        )}
      </section>
    </div>
  );
}
