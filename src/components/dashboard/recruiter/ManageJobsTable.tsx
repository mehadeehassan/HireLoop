'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import DashboardPagination from '../DashboardPagination';
import AddJobForm from './AddJobForm';
import type { RecruiterJob } from './recruiter-data';

export default function ManageJobsTable() {
  const [jobs, setJobs] = useState<RecruiterJob[]>([]);
  const [editingJob, setEditingJob] = useState<RecruiterJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetch(`/api/recruiter/jobs?page=${page}&limit=6`)
      .then((response) =>
        response.ok ? response.json() : { jobs: [], pagination: { totalPages: 1 } },
      )
      .then((data: { jobs: RecruiterJob[]; pagination: { totalPages: number } }) => {
        setJobs(data.jobs);
        setTotalPages(data.pagination.totalPages);
      })
      .finally(() => setLoading(false));
  }, [page]);

  async function removeJob(id: string) {
    const response = await fetch(`/api/recruiter/jobs/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      toast.error('Job could not be deleted');
      return;
    }
    setJobs((current) => current.filter((job) => job.id !== id));
    if (jobs.length === 1 && page > 1) setPage((current) => current - 1);
    toast.success('Job deleted successfully');
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#252d43] bg-[#111827]/55">
      {loading && <p className="p-5 text-[12px] text-[#8f96aa]">Loading job posts...</p>}
      {!loading && jobs.length === 0 && (
        <div className="p-8 text-center">
          <p className="text-[13px] text-[#aab1c1]">No job posts yet.</p>
        </div>
      )}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-225 border-collapse text-left">
          <thead>
            <tr className="h-10 border-b border-[#252d43] text-[9px] uppercase tracking-[.08em] text-[#8c94a8]">
              <th className="px-4">Job Title & Dept</th>
              <th>Company & Location</th>
              <th>Type</th>
              <th>Compensation</th>
              <th>Applicants</th>
              <th>Status</th>
              <th>Deadline</th>
              <th className="px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <JobRow
                key={job.id}
                job={job}
                onEdit={() => setEditingJob(job)}
                onRemove={() => removeJob(job.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-[#252d43] md:hidden">
        {jobs.map((job) => (
          <div key={job.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-[#edf0f7]">{job.title}</p>
                <p className="mt-1 text-[11px] text-[#858da1]">{job.department}</p>
              </div>
              <Status status={job.status} />
            </div>
            <p className="mt-3 text-[11px] text-[#aab1c1]">
              {job.company} · {job.location}
            </p>
            <div className="mt-3 flex items-center justify-between text-[11px]">
              <span className="text-[#858da1]">{job.applicants} applicants</span>
              <div className="flex items-center gap-3">
                <ActionButton label={`Edit ${job.title}`} onClick={() => setEditingJob(job)}>
                  <EditIcon />
                </ActionButton>
                <ActionButton
                  label={`Delete ${job.title}`}
                  onClick={() => removeJob(job.id)}
                  danger
                >
                  <DeleteIcon />
                </ActionButton>
              </div>
            </div>
          </div>
        ))}
      </div>
      <DashboardPagination page={page} totalPages={totalPages} onPageChange={setPage} />
      {editingJob && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/75 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Edit ${editingJob.title}`}
        >
          <div className="relative max-h-[92vh] w-full max-w-205 overflow-y-auto rounded-lg border border-[#252d43] bg-[#0d1322] shadow-[0_20px_70px_rgba(0,0,0,.65)]">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#252d43] bg-[#101626] px-5 py-4">
              <div>
                <p className="text-[10px] text-[#7779ff]">Manage Jobs › Update Job Post</p>
                <h2 className="mt-1 text-[18px] font-semibold text-[#f0f2f7]">Update Job Post</h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingJob(null)}
                aria-label="Close edit dialog"
                className="flex size-9 items-center justify-center rounded-md border border-[#252d43] text-lg text-[#9aa2b5]"
              >
                ×
              </button>
            </div>
            <AddJobForm
              key={editingJob.id}
              mode="edit"
              initialJob={editingJob}
              onSave={(updatedJob) => {
                setJobs((current) =>
                  current.map((job) =>
                    job.id === editingJob.id ? { ...job, ...updatedJob } : job,
                  ),
                );
                setEditingJob(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function JobRow({
  job,
  onEdit,
  onRemove,
}: {
  job: RecruiterJob;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <tr className="border-b border-[#252d43] last:border-0">
      <td className="px-4 py-3">
        <p className="text-[11px] font-semibold text-[#e8ebf2]">{job.title}</p>
        <p className="mt-1 text-[9px] text-[#7770ff]">{job.department}</p>
      </td>
      <td>
        <p className="text-[10px] text-[#cfd4df]">{job.company}</p>
        <p className="mt-1 text-[9px] text-[#858da1]">{job.location}</p>
      </td>
      <td className="text-[10px] text-[#cfd4df]">{job.type}</td>
      <td className="text-[10px] text-[#cfd4df]">{job.compensation}</td>
      <td className="text-[10px] text-[#cfd4df]">{job.applicants} Candidates</td>
      <td>
        <Status status={job.status} />
      </td>
      <td className="text-[10px] text-[#d0d5df]">{job.deadline}</td>
      <td className="px-4 text-right">
        <div className="flex justify-end gap-2">
          <ActionButton label={`Edit ${job.title}`} onClick={onEdit}>
            <EditIcon />
          </ActionButton>
          <ActionButton label={`Delete ${job.title}`} onClick={onRemove} danger>
            <DeleteIcon />
          </ActionButton>
        </div>
      </td>
    </tr>
  );
}

function Status({ status }: { status: RecruiterJob['status'] }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-[9px] ${status === 'Active' ? 'bg-[#123a33] text-[#4fdda0]' : 'bg-[#343b50] text-[#aab1c1]'}`}
    >
      ● {status}
    </span>
  );
}

function ActionButton({
  label,
  onClick,
  danger = false,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex size-8 items-center justify-center rounded-md border transition ${
        danger
          ? 'border-[#ff7474]/20 text-[#ff7474] hover:bg-[#ff7474]/10'
          : 'border-[#6258ff]/20 bg-[#6258ff]/10 text-[#7779ff] hover:bg-[#6258ff]/20'
      }`}
    >
      {children}
    </button>
  );
}

function EditIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 10v6M14 10v6" />
    </svg>
  );
}
