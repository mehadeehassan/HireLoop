'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import DashboardPagination from '../shared/DashboardPagination';
import { useSession } from '@/lib/auth-client';
import { applicationStatuses, type ApplicationStatus } from '@/lib/application-status';
import RecruiterApplicationMessage from './RecruiterApplicationMessage';

type Application = {
  id: string;
  name: string;
  initials: string;
  role: string;
  email: string;
  experience: string;
  status: ApplicationStatus;
  date: string;
  phone: string;
  location: string;
  skills: string[];
  summary: string;
  candidateId?: string;
  jobId?: string;
};

const statusStyles: Record<string, string> = {
  New: 'bg-[#2a2d50] text-[#9fa3ff]',
  Reviewed: 'bg-[#263a58] text-[#8ab8ff]',
  Shortlisted: 'bg-[#123a33] text-[#4fdda0]',
  Interview: 'bg-[#433518] text-[#ffd36a]',
  Rejected: 'bg-[#4a2832] text-[#ff8797]',
};

export default function ApplicationsTable() {
  const { data: session } = useSession();
  const [filter, setFilter] = useState('All');
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedApplication, setSelectedApplication] = useState<
    Application | null
  >(null);
  const [messageApplication, setMessageApplication] = useState<Application | null>(null);

  useEffect(() => {
    let active = true;
    async function loadApplications() {
      const response = await fetch('/api/recruiter/applications', { cache: 'no-store' });
      const data = response.ok ? await response.json() : null;
      if (active) {
        setApplications(data?.applications || []);
        setLoading(false);
      }
    }
    loadApplications();
    return () => {
      active = false;
    };
  }, []);
  const pageSize = 5;
  const visibleApplications = useMemo(
    () => applications.filter((application) => filter === 'All' || application.status === filter),
    [applications, filter],
  );
  const totalPages = Math.max(1, Math.ceil(visibleApplications.length / pageSize));
  const pagedApplications = visibleApplications.slice((page - 1) * pageSize, page * pageSize);

  async function updateStatus(id: string, status: Application['status']) {
    const response = await fetch(`/api/recruiter/applications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      toast.error('Application status update failed');
      return;
    }
    setApplications((current) =>
      current.map((application) =>
        application.id === id ? { ...application, status } : application,
      ),
    );
    toast.success(`Application status updated to ${status}`);
  }

  if (loading) {
    return <div className="flex h-44 items-center justify-center text-[11px] text-[#858da1]">Loading applications...</div>;
  }

  return (
    <div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {['All', ...applicationStatuses].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setFilter(item);
              setPage(1);
            }}
            className={`h-9 shrink-0 rounded-md px-3 text-[11px] ${filter === item ? 'bg-[#6258ff] text-white' : 'border border-[#252d43] text-[#9aa2b5]'}`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border border-[#252d43]">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-175 text-left">
            <thead>
              <tr className="h-10 border-b border-[#252d43] text-[9px] uppercase tracking-[.08em] text-[#8c94a8]">
                <th className="px-4">Applicant</th>
                <th>Position</th>
                <th>Experience</th>
                <th>Date</th>
                <th>Status</th>
                <th className="px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {pagedApplications.length === 0 && (
                <tr>
                  <td colSpan={6} className="h-44 text-center text-[11px] text-[#858da1]">
                    No applications found
                  </td>
                </tr>
              )}
              {pagedApplications.map((application) => (
                <tr key={application.id} className="border-b border-[#252d43] last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 items-center justify-center rounded-full bg-[#6258ff]/20 text-[10px] text-[#aeb1ff]">
                        {application.initials}
                      </span>
                      <div>
                        <p className="text-[11px] font-semibold text-[#edf0f7]">
                          {application.name}
                        </p>
                        <p className="mt-1 text-[9px] text-[#858da1]">{application.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-[10px] text-[#cfd4df]">{application.role}</td>
                  <td className="text-[10px] text-[#cfd4df]">{application.experience}</td>
                  <td className="text-[10px] text-[#cfd4df]">{application.date}</td>
                  <td>
                    <div className="relative inline-flex">
                      <select
                        aria-label={`Status for ${application.name}`}
                        value={application.status}
                        onChange={(event) =>
                          updateStatus(application.id, event.target.value as ApplicationStatus)
                        }
                        className={`h-7 appearance-none rounded-full border border-white/6 px-3 pr-7 text-[9px] outline-none transition focus:border-[#6258ff] ${statusStyles[application.status]}`}
                      >
                        {applicationStatuses.map((status) => (
                          <option key={status} className="bg-[#171e31] text-[#edf0f7]">
                            {status}
                          </option>
                        ))}
                      </select>
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 20 20"
                        fill="none"
                        className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2"
                      >
                        <path
                          d="M5.75 7.75 10 12l4.25-4.25"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </td>
                  <td className="space-x-3 px-4 text-right">
                    {application.candidateId && application.jobId && session?.user.id && (
                      <button
                        type="button"
                        onClick={() => setMessageApplication(application)}
                        className="text-[10px] text-[#aaa2ff]"
                      >
                        Message
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedApplication(application)}
                      className="text-[10px] text-[#7779ff]"
                    >
                      View profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-[#252d43] md:hidden">
          {pagedApplications.length === 0 && (
            <div className="flex h-44 items-center justify-center text-[11px] text-[#858da1]">
              No applications found
            </div>
          )}
          {pagedApplications.map((application) => (
            <div key={application.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-full bg-[#6258ff]/20 text-[10px]">
                    {application.initials}
                  </span>
                  <div>
                    <p className="text-[12px] font-semibold">{application.name}</p>
                    <p className="mt-1 text-[10px] text-[#858da1]">{application.role}</p>
                  </div>
                </div>
                <select
                  aria-label={`Status for ${application.name}`}
                  value={application.status}
                  onChange={(event) =>
                    updateStatus(application.id, event.target.value as ApplicationStatus)
                  }
                  className={`h-7 max-w-32 rounded-full border border-white/6 px-2 text-[9px] outline-none focus:border-[#6258ff] ${statusStyles[application.status]}`}
                >
                  {applicationStatuses.map((status) => (
                    <option key={status} className="bg-[#171e31] text-[#edf0f7]">
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-3 flex justify-between text-[10px] text-[#858da1]">
                <span>{application.experience}</span>
                <span>{application.date}</span>
              </div>
              <div className="mt-3 flex gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedApplication(application)}
                  className="text-[10px] text-[#7779ff]"
                >
                  View profile
                </button>
                {application.candidateId && application.jobId && session?.user.id && (
                  <button
                    type="button"
                    onClick={() => setMessageApplication(application)}
                    className="text-[10px] text-[#aaa2ff]"
                  >
                    Message
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <DashboardPagination page={page} totalPages={totalPages} onPageChange={setPage} />
      {selectedApplication && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedApplication.name} profile`}
        >
          <section className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-[#303a55] bg-[#111827] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="flex size-12 items-center justify-center rounded-full bg-[#6258ff]/20 text-[13px] font-semibold text-[#b6baff]">
                  {selectedApplication.initials}
                </span>
                <div>
                  <h2 className="text-[16px] font-semibold text-[#edf0f7]">
                    {selectedApplication.name}
                  </h2>
                  <p className="mt-1 text-[11px] text-[#9ba4b7]">{selectedApplication.role}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApplication(null)}
                className="size-8 rounded-md border border-[#303a55] text-[16px] text-[#aab1c1]"
                aria-label="Close profile"
              >
                ×
              </button>
            </div>
            <div className="mt-6 grid gap-3 rounded-md border border-[#252d43] bg-[#171e31]/70 p-4 sm:grid-cols-2">
              <ProfileDetail label="Email" value={selectedApplication.email} />
              <ProfileDetail label="Phone" value={selectedApplication.phone} />
              <ProfileDetail label="Location" value={selectedApplication.location} />
              <ProfileDetail label="Experience" value={selectedApplication.experience} />
            </div>
            <div className="mt-5">
              <p className="text-[10px] uppercase tracking-[.08em] text-[#858da1]">About</p>
              <p className="mt-2 text-[12px] leading-5 text-[#cfd4df]">
                {selectedApplication.summary}
              </p>
            </div>
            <div className="mt-5">
              <p className="text-[10px] uppercase tracking-[.08em] text-[#858da1]">Skills</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedApplication.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-[#6258ff]/15 px-3 py-1.5 text-[10px] text-[#b9bdff]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
            {selectedApplication.candidateId && selectedApplication.jobId && (
              <button
                type="button"
                onClick={() => setMessageApplication(selectedApplication)}
                className="mt-6 rounded-md bg-[#6258ff] px-4 py-2.5 text-[10px] font-medium text-white hover:bg-[#7168ff]"
              >
                Message applicant
              </button>
            )}
          </section>
        </div>
      )}
      {messageApplication?.candidateId && messageApplication.jobId && session?.user.id && (
        <RecruiterApplicationMessage
          application={{
            candidateId: messageApplication.candidateId,
            jobId: messageApplication.jobId,
            name: messageApplication.name,
            role: messageApplication.role,
          }}
          recruiterId={session.user.id}
          onClose={() => setMessageApplication(null)}
        />
      )}
    </div>
  );
}

function ProfileDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[.08em] text-[#858da1]">{label}</p>
      <p className="mt-1 break-all text-[11px] text-[#dfe3ec]">{value}</p>
    </div>
  );
}
