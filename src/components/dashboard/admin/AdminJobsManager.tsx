'use client';

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Eye,
  LoaderCircle,
  MapPin,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import type {
  AdminJob,
  AdminJobListItem,
  AdminJobsList,
} from '@/lib/admin-job-contract';
import { isAdminJob, isAdminJobsList, isRecord } from '@/lib/admin-job-contract';

type SortField =
  | 'title'
  | 'company'
  | 'recruiter'
  | 'category'
  | 'location'
  | 'type'
  | 'status'
  | 'createdAt'
  | 'deadline'
  | 'applications';
type Filters = {
  search: string;
  status: string;
  category: string;
  location: string;
  type: string;
  recruiter: string;
};
type JobModal = { jobId: string; mode: 'view' | 'edit' } | null;
type DeleteTarget = Pick<AdminJobListItem, 'id' | 'title'>;

const initialFilters: Filters = {
  search: '',
  status: 'all',
  category: '',
  location: '',
  type: '',
  recruiter: '',
};
const pageSize = 10;
const inputClass =
  'h-10 w-full rounded-md border border-white/[0.09] bg-[#111114] px-3 text-xs text-[#e7e7ec] outline-none transition placeholder:text-[#73737c] focus:border-[#9b71ff]/70';
const selectClass = `${inputClass} pr-8`;

function getErrorMessage(value: unknown, fallback: string) {
  return isRecord(value) && typeof value.error === 'string' ? value.error : fallback;
}

async function getResponsePayload(response: Response) {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('The job service returned an invalid response.');
  }
  if (!response.ok) throw new Error(getErrorMessage(payload, 'The job request failed.'));
  return payload;
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function getJobStatusStyle(status: string | null) {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300';
    case 'closed':
      return 'border-white/[0.09] bg-white/[0.04] text-[#aaaab3]';
    case 'expired':
      return 'border-amber-400/20 bg-amber-400/[0.08] text-amber-300';
    case 'draft':
      return 'border-violet-400/20 bg-violet-400/[0.08] text-violet-300';
    default:
      return 'border-white/[0.09] bg-white/[0.04] text-[#aaaab3]';
  }
}

function getStatusAction(job: AdminJobListItem) {
  const status = job.status?.toLowerCase();
  if (status === 'active') return { status: 'Closed', label: 'Close job' };
  if (status === 'closed' || status === 'expired') {
    return { status: 'Active', label: 'Reopen job' };
  }
  return null;
}

function SortButton({
  label,
  field,
  currentSort,
  direction,
  onSort,
}: {
  label: string;
  field: SortField;
  currentSort: SortField;
  direction: 'asc' | 'desc';
  onSort: (field: SortField) => void;
}) {
  const active = field === currentSort;
  const Icon = active ? (direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      aria-label={`Sort by ${label}${active ? `, currently ${direction}ending` : ''}`}
      className="inline-flex items-center gap-1 whitespace-nowrap transition hover:text-[#e5e5ea]"
    >
      {label}
      <Icon aria-hidden="true" className={`size-3 ${active ? 'text-[#b49aff]' : 'text-[#66666e]'}`} />
    </button>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  note,
}: {
  label: string;
  value: number | null;
  icon: typeof BriefcaseBusiness;
  accent: string;
  note: string;
}) {
  return (
    <div className="rounded-lg border border-white/[0.07] bg-[#111114] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] text-[#85858d]">{label}</p>
          <p className="mt-2 text-[25px] font-semibold tracking-tight text-[#ededf2]">
            {value === null ? '—' : value.toLocaleString()}
          </p>
        </div>
        <span className={`flex size-9 items-center justify-center rounded-md ${accent}`}>
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </div>
      <p className="mt-2 text-[10px] text-[#71717a]">{note}</p>
    </div>
  );
}

function AdminJobEditForm({
  job,
  onCancel,
  onSaved,
}: {
  job: AdminJob;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [remoteAllowed, setRemoteAllowed] = useState(job.remote);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const formData = new FormData(event.currentTarget);
    const payload: Record<string, string | boolean> = {
      title: String(formData.get('title') || '').trim(),
      company: String(formData.get('company') || '').trim(),
      category: String(formData.get('category') || '').trim(),
      department: String(formData.get('department') || '').trim(),
      location: String(formData.get('location') || '').trim(),
      type: String(formData.get('type') || '').trim(),
      compensation: String(formData.get('compensation') || '').trim(),
      deadline: String(formData.get('deadline') || '').trim(),
      responsibility: String(formData.get('responsibility') || '').trim(),
      qualifications: String(formData.get('qualifications') || '').trim(),
    };
    if (remoteAllowed !== job.remote) {
      payload.remote = remoteAllowed === true;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/jobs/${encodeURIComponent(job.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await getResponsePayload(response);
      toast.success('Job updated.');
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update this job.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-[11px] text-[#a2a2aa]">Job title *</span>
          <input
            name="title"
            required
            maxLength={180}
            defaultValue={job.title}
            className={inputClass}
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-[11px] text-[#a2a2aa]">Company *</span>
          <input
            name="company"
            required
            maxLength={160}
            defaultValue={job.company}
            className={inputClass}
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-[11px] text-[#a2a2aa]">Category</span>
          <input
            name="category"
            maxLength={100}
            defaultValue={job.category || ''}
            className={inputClass}
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-[11px] text-[#a2a2aa]">Department</span>
          <input
            name="department"
            maxLength={100}
            defaultValue={job.department || job.category || ''}
            className={inputClass}
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-[11px] text-[#a2a2aa]">Location</span>
          <input
            name="location"
            maxLength={160}
            defaultValue={job.location || ''}
            className={inputClass}
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-[11px] text-[#a2a2aa]">Job type</span>
          <input
            name="type"
            maxLength={60}
            defaultValue={job.type || ''}
            className={inputClass}
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-[11px] text-[#a2a2aa]">Compensation</span>
          <input
            name="compensation"
            maxLength={120}
            defaultValue={job.compensation || ''}
            className={inputClass}
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-[11px] text-[#a2a2aa]">Application deadline</span>
          <input
            name="deadline"
            maxLength={40}
            defaultValue={job.deadline || ''}
            className={inputClass}
          />
        </label>
        <label className="flex min-h-10 items-center gap-2.5 rounded-md border border-white/[0.08] px-3 text-xs text-[#b8b8c0] sm:col-span-2">
          <input
            type="checkbox"
            name="remote"
            checked={remoteAllowed === true}
            onChange={(event) => setRemoteAllowed(event.target.checked)}
            className="size-4 accent-[#9b71ff]"
          />
          Remote work allowed
        </label>
        <label className="space-y-1.5 sm:col-span-2">
          <span className="text-[11px] text-[#a2a2aa]">Responsibilities</span>
          <textarea
            name="responsibility"
            maxLength={5000}
            rows={4}
            defaultValue={job.responsibility || ''}
            className={`${inputClass} h-auto min-h-24 resize-y py-2.5`}
          />
        </label>
        <label className="space-y-1.5 sm:col-span-2">
          <span className="text-[11px] text-[#a2a2aa]">Qualifications and requirements</span>
          <textarea
            name="qualifications"
            maxLength={5000}
            rows={4}
            defaultValue={job.qualifications || ''}
            className={`${inputClass} h-auto min-h-24 resize-y py-2.5`}
          />
        </label>
      </div>
      <div className="flex justify-end gap-2 border-t border-white/[0.07] pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="h-9 rounded-md border border-white/[0.09] px-3 text-xs text-[#b4b4bc] transition hover:bg-white/[0.04] disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-[#8058e8] px-4 text-xs font-medium text-white transition hover:bg-[#916ff0] disabled:opacity-50"
        >
          {saving ? <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" /> : <Check aria-hidden="true" className="size-3.5" />}
          Save changes
        </button>
      </div>
    </form>
  );
}

function DetailValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.08em] text-[#777780]">{label}</p>
      <p className="mt-1 break-words text-xs text-[#d3d3da]">{value || '—'}</p>
    </div>
  );
}

export default function AdminJobsManager() {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [searchDraft, setSearchDraft] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [data, setData] = useState<AdminJobsList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [modal, setModal] = useState<JobModal>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [detail, setDetail] = useState<AdminJob | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setFilters((current) =>
        current.search === searchDraft ? current : { ...current, search: searchDraft.trim() },
      );
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchDraft]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      status: filters.status,
      sortBy,
      sortDirection,
    });
    for (const key of ['search', 'category', 'location', 'type', 'recruiter'] as const) {
      if (filters[key]) params.set(key, filters[key]);
    }
    return params.toString();
  }, [filters, page, sortBy, sortDirection]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      fetch(`/api/admin/jobs?${queryString}`, { signal: controller.signal, cache: 'no-store' })
        .then(getResponsePayload)
        .then((payload: unknown) => {
          if (!isAdminJobsList(payload)) throw new Error('The job list response was invalid.');
          setData(payload);
        })
        .catch((requestError: unknown) => {
          if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
          const message = requestError instanceof Error ? requestError.message : 'Could not load jobs.';
          setError(message);
          toast.error(message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [queryString, refreshVersion]);

  useEffect(() => {
    const jobId = modal?.jobId;
    if (!jobId) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setDetailLoading(true);
      setDetailError(null);
      fetch(`/api/admin/jobs/${encodeURIComponent(jobId)}`, {
        signal: controller.signal,
        cache: 'no-store',
      })
        .then(getResponsePayload)
        .then((payload: unknown) => {
          if (!isRecord(payload) || !isAdminJob(payload.job)) {
            throw new Error('The job details response was invalid.');
          }
          setDetail(payload.job);
        })
        .catch((requestError: unknown) => {
          if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
          const message = requestError instanceof Error ? requestError.message : 'Could not load job details.';
          setDetailError(message);
          toast.error(message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setDetailLoading(false);
        });
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [modal?.jobId]);

  function updateFilter(key: keyof Filters, value: string) {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function changeSort(field: SortField) {
    setPage(1);
    if (sortBy === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDirection(field === 'title' || field === 'company' ? 'asc' : 'desc');
    }
  }

  async function changeStatus(job: AdminJobListItem) {
    const action = getStatusAction(job);
    if (!action || pendingJobId) return;
    setPendingJobId(job.id);
    try {
      const response = await fetch(`/api/admin/jobs/${encodeURIComponent(job.id)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action.status }),
      });
      await getResponsePayload(response);
      toast.success(action.status === 'Closed' ? 'Job closed.' : 'Job reopened.');
      setModal(null);
      setRefreshVersion((value) => value + 1);
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : 'Could not update job status.');
    } finally {
      setPendingJobId(null);
    }
  }

  async function deleteJob(job: DeleteTarget) {
    if (pendingJobId) return;
    setPendingJobId(job.id);
    try {
      const response = await fetch(`/api/admin/jobs/${encodeURIComponent(job.id)}`, {
        method: 'DELETE',
      });
      const payload = await getResponsePayload(response);
      if (!isRecord(payload) || payload.success !== true || payload.deleted !== true) {
        throw new Error('The job delete response was invalid.');
      }
      toast.success('Job deleted. Applications and quota history were retained.');
      setDeleteTarget(null);
      setModal(null);
      setRefreshVersion((value) => value + 1);
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : 'Could not delete this job.');
    } finally {
      setPendingJobId(null);
    }
  }

  function requestDelete(job: DeleteTarget) {
    setModal(null);
    setDeleteTarget(job);
  }

  function onJobSaved() {
    setModal(null);
    setRefreshVersion((value) => value + 1);
  }

  function clearFilters() {
    setSearchDraft('');
    setFilters(initialFilters);
    setPage(1);
  }

  const modalJob = detail?.id === modal?.jobId ? detail : null;
  const pageCount = data?.pagination.totalPages ?? 1;
  const showEmpty = !loading && !error && data?.jobs.length === 0;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[#a889ff]">
            Admin Console <span className="mx-1.5 text-[#55555d]">/</span> Operations
          </p>
          <h1 className="text-[25px] font-semibold tracking-tight text-[#ededf2] sm:text-[28px]">
            Manage Jobs
          </h1>
          <p className="mt-1.5 max-w-2xl text-xs leading-5 text-[#85858d]">
            Review all recruiter job listings, inspect applications, and manage listing status.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[#909098]">
          <span className="flex size-8 items-center justify-center rounded-md border border-white/[0.08] bg-[#111114]">
            <BriefcaseBusiness aria-hidden="true" className="size-4 text-[#b49aff]" />
          </span>
          <span>
            <strong className="font-semibold text-[#e3e3e9]">
              {data?.summary.totalJobs.toLocaleString() ?? '—'}
            </strong>{' '}
            total listings
          </span>
        </div>
      </section>

      <section aria-label="Job statistics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="All job listings"
          value={data?.summary.totalJobs ?? null}
          icon={BriefcaseBusiness}
          accent="bg-violet-400/10 text-violet-300"
          note="Every recruiter-posted job"
        />
        <StatCard
          label="Active jobs"
          value={data?.summary.activeJobs ?? null}
          icon={Check}
          accent="bg-emerald-400/10 text-emerald-300"
          note="Currently open to applications"
        />
        <StatCard
          label="Closed or expired"
          value={data?.summary.closedJobs ?? null}
          icon={Clock3}
          accent="bg-amber-400/10 text-amber-300"
          note="Closed and expired listings"
        />
        <StatCard
          label="Applications"
          value={data?.summary.totalApplications ?? null}
          icon={Users}
          accent="bg-sky-400/10 text-sky-300"
          note="Real applications; dummy records excluded"
        />
      </section>

      <section className="overflow-hidden rounded-lg border border-white/[0.07] bg-[#111114]">
        <div className="flex flex-col gap-4 border-b border-white/[0.07] p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-sm font-semibold text-[#e3e3e9]">All job listings</h2>
              <p className="mt-1 text-[10px] text-[#777780]">
                Status updates do not alter recruiter usage or application records.
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-md border border-white/[0.07] bg-[#0d0d10] p-1">
              {[
                ['all', 'All jobs'],
                ['active', 'Active'],
                ['closed', 'Closed'],
              ].map(([status, label]) => (
                <button
                  type="button"
                  key={status}
                  aria-pressed={filters.status === status}
                  onClick={() => updateFilter('status', status)}
                  className={`h-7 rounded px-2.5 text-[10px] transition ${
                    filters.status === status
                      ? 'bg-[#27222f] text-[#d4c3ff]'
                      : 'text-[#85858d] hover:text-[#dedee4]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
            <label className="relative sm:col-span-2 xl:col-span-2">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#777780]"
              />
              <input
                type="search"
                value={searchDraft}
                onChange={(event) => {
                  setSearchDraft(event.target.value);
                  setPage(1);
                }}
                aria-label="Search job title or company"
                placeholder="Search title or company..."
                className={`${inputClass} pl-9`}
              />
            </label>
            <select
              aria-label="Filter by status"
              value={filters.status}
              onChange={(event) => updateFilter('status', event.target.value)}
              className={selectClass}
            >
              <option value="all">Any status</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
              <option value="draft">Draft</option>
              <option value="expired">Expired</option>
            </select>
            <select
              aria-label="Filter by category"
              value={filters.category}
              onChange={(event) => updateFilter('category', event.target.value)}
              className={selectClass}
            >
              <option value="">All categories</option>
              {(data?.filterOptions.categories ?? []).map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <select
              aria-label="Filter by location"
              value={filters.location}
              onChange={(event) => updateFilter('location', event.target.value)}
              className={selectClass}
            >
              <option value="">All locations</option>
              {(data?.filterOptions.locations ?? []).map((location) => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
            <select
              aria-label="Filter by job type"
              value={filters.type}
              onChange={(event) => updateFilter('type', event.target.value)}
              className={selectClass}
            >
              <option value="">All job types</option>
              {(data?.filterOptions.types ?? []).map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <input
              aria-label="Filter by recruiter"
              value={filters.recruiter}
              onChange={(event) => updateFilter('recruiter', event.target.value)}
              placeholder="Recruiter name or ID"
              className={inputClass}
            />
            <div className="flex gap-2 sm:col-span-2 xl:col-span-6">
              <button
                type="button"
                onClick={clearFilters}
                disabled={
                  filters.status === 'all' &&
                  !filters.category &&
                  !filters.location &&
                  !filters.type &&
                  !filters.recruiter &&
                  !searchDraft
                }
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[10px] text-[#9999a2] transition hover:bg-white/[0.04] hover:text-white disabled:opacity-40"
              >
                <RotateCcw aria-hidden="true" className="size-3" />
                Clear filters
              </button>
              {data && (
                <span className="ml-auto self-center text-[10px] text-[#73737c]">
                  {data.pagination.total.toLocaleString()} matching listings
                </span>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="m-4 flex items-start gap-2 rounded-md border border-rose-400/20 bg-rose-400/[0.06] px-3 py-2.5 text-xs text-rose-200"
          >
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setRefreshVersion((value) => value + 1)}
              className="ml-auto shrink-0 font-medium text-rose-100 underline underline-offset-2"
            >
              Retry
            </button>
          </div>
        )}

        {showEmpty ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
            <span className="flex size-12 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.025]">
              <BriefcaseBusiness aria-hidden="true" className="size-5 text-[#767680]" />
            </span>
            <h3 className="mt-4 text-sm font-medium text-[#d4d4db]">No jobs found</h3>
            <p className="mt-1 max-w-sm text-xs leading-5 text-[#777780]">
              {filters.search || filters.status !== 'all' || filters.category || filters.location ||
              filters.type || filters.recruiter
                ? 'Try adjusting your filters or search terms.'
                : 'No recruiter job listings are available yet.'}
            </p>
          </div>
        ) : !data && loading ? (
          <div className="space-y-3 p-5" aria-label="Loading jobs">
            {[0, 1, 2, 3, 4].map((row) => (
              <div key={row} className="h-11 animate-pulse rounded bg-white/[0.025]" />
            ))}
          </div>
        ) : data ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.07] text-[9px] uppercase tracking-[0.08em] text-[#777780]">
                    <th className="px-4 py-3 font-medium sm:px-5">
                      <SortButton label="Job title" field="title" currentSort={sortBy} direction={sortDirection} onSort={changeSort} />
                    </th>
                    <th className="px-3 py-3 font-medium">
                      <SortButton label="Company" field="company" currentSort={sortBy} direction={sortDirection} onSort={changeSort} />
                    </th>
                    <th className="px-3 py-3 font-medium">
                      <SortButton label="Recruiter" field="recruiter" currentSort={sortBy} direction={sortDirection} onSort={changeSort} />
                    </th>
                    <th className="px-3 py-3 font-medium">
                      <SortButton label="Category" field="category" currentSort={sortBy} direction={sortDirection} onSort={changeSort} />
                    </th>
                    <th className="px-3 py-3 font-medium">
                      <SortButton label="Location" field="location" currentSort={sortBy} direction={sortDirection} onSort={changeSort} />
                    </th>
                    <th className="px-3 py-3 font-medium">
                      <SortButton label="Type" field="type" currentSort={sortBy} direction={sortDirection} onSort={changeSort} />
                    </th>
                    <th className="px-3 py-3 font-medium">
                      <SortButton label="Applications" field="applications" currentSort={sortBy} direction={sortDirection} onSort={changeSort} />
                    </th>
                    <th className="px-3 py-3 font-medium">
                      <SortButton label="Status" field="status" currentSort={sortBy} direction={sortDirection} onSort={changeSort} />
                    </th>
                    <th className="px-3 py-3 font-medium">
                      <SortButton label="Posted" field="createdAt" currentSort={sortBy} direction={sortDirection} onSort={changeSort} />
                    </th>
                    <th className="px-3 py-3 font-medium">
                      <SortButton label="Deadline" field="deadline" currentSort={sortBy} direction={sortDirection} onSort={changeSort} />
                    </th>
                    <th className="px-4 py-3 text-right font-medium sm:px-5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.jobs.map((job) => {
                    const statusAction = getStatusAction(job);
                    return (
                      <tr
                        key={job.id}
                        className="border-b border-white/[0.05] last:border-0 transition-colors hover:bg-white/[0.018]"
                      >
                        <td className="max-w-[200px] px-4 py-3.5 sm:px-5">
                          <button
                            type="button"
                            onClick={() => setModal({ jobId: job.id, mode: 'view' })}
                            className="block max-w-full truncate text-left text-[11px] font-medium text-[#e2e2e8] transition hover:text-[#c2aaff]"
                            title={job.title}
                          >
                            {job.title || 'Untitled job'}
                          </button>
                          <p className="mt-1 truncate text-[9px] text-[#777780]">
                            {job.compensation || 'Compensation not specified'}
                          </p>
                        </td>
                        <td className="max-w-[150px] px-3 py-3.5">
                          <span className="block truncate text-[10px] text-[#c5c5cd]" title={job.company}>
                            {job.company || '—'}
                          </span>
                        </td>
                        <td className="max-w-[160px] px-3 py-3.5">
                          <span className="block truncate text-[10px] text-[#c5c5cd]">
                            {job.recruiter?.name || 'Former account'}
                          </span>
                          <span className="mt-1 block max-w-[145px] truncate text-[9px] text-[#777780]">
                            {job.recruiterId || 'No recruiter ID'}
                          </span>
                        </td>
                        <td className="max-w-[145px] px-3 py-3.5">
                          <span className="block truncate text-[10px] text-[#a8a8b0]">
                            {job.category || job.department || '—'}
                          </span>
                        </td>
                        <td className="max-w-[155px] px-3 py-3.5">
                          <span className="flex items-center gap-1 truncate text-[10px] text-[#a8a8b0]">
                            <MapPin aria-hidden="true" className="size-3 shrink-0 text-[#777780]" />
                            {job.location || '—'}
                          </span>
                          <span className="mt-1 block text-[9px] text-[#777780]">
                            {job.remote === true ? 'Remote allowed' : job.remote === false ? 'On-site' : 'Remote not specified'}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 text-[10px] text-[#a8a8b0]">{job.type || '—'}</td>
                        <td className="px-3 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-[10px] text-[#d4d4db]">
                            <Users aria-hidden="true" className="size-3 text-[#85858d]" />
                            {job.applicationCount.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-3 py-3.5">
                          <span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-medium ${getJobStatusStyle(job.status)}`}>
                            {job.status || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 text-[10px] text-[#96969e]">
                          {formatDate(job.createdAt)}
                        </td>
                        <td className="px-3 py-3.5 text-[10px] text-[#96969e]">
                          {formatDate(job.deadline)}
                        </td>
                        <td className="px-4 py-3.5 sm:px-5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              aria-label={`View ${job.title}`}
                              onClick={() => setModal({ jobId: job.id, mode: 'view' })}
                              className="flex size-7 items-center justify-center rounded text-[#92929b] transition hover:bg-white/[0.07] hover:text-white"
                            >
                              <Eye aria-hidden="true" className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Edit ${job.title}`}
                              onClick={() => setModal({ jobId: job.id, mode: 'edit' })}
                              className="flex size-7 items-center justify-center rounded text-[#92929b] transition hover:bg-violet-400/10 hover:text-violet-200"
                            >
                              <Pencil aria-hidden="true" className="size-3.5" />
                            </button>
                            {statusAction && (
                              <button
                                type="button"
                                aria-label={statusAction.label}
                                title={statusAction.label}
                                disabled={pendingJobId === job.id}
                                onClick={() => void changeStatus(job)}
                                className="flex size-7 items-center justify-center rounded text-[#92929b] transition hover:bg-amber-400/10 hover:text-amber-200 disabled:opacity-50"
                              >
                                {pendingJobId === job.id ? (
                                  <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                                ) : (
                                  <RotateCcw aria-hidden="true" className="size-3.5" />
                                )}
                              </button>
                            )}
                            <button
                              type="button"
                              aria-label={`Delete ${job.title}`}
                              title="Delete job"
                              disabled={pendingJobId !== null}
                              onClick={() => requestDelete(job)}
                              className="flex size-7 items-center justify-center rounded text-[#92929b] transition hover:bg-rose-400/10 hover:text-rose-200 disabled:opacity-50"
                            >
                              <Trash2 aria-hidden="true" className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-white/[0.07] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-[10px] text-[#777780]">
                {data.pagination.total === 0
                  ? 'No listings'
                  : `Showing ${(page - 1) * pageSize + 1}–${Math.min(
                      page * pageSize,
                      data.pagination.total,
                    )} of ${data.pagination.total.toLocaleString()} listings`}
                {loading && <span className="ml-2 text-[#a889ff]">Updating…</span>}
              </p>
              <div className="flex items-center gap-2">
                <label className="mr-2 text-[10px] text-[#777780]">
                  Page {page} of {pageCount}
                </label>
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  className="flex size-7 items-center justify-center rounded border border-white/[0.08] text-[#aaaab3] transition hover:bg-white/[0.05] disabled:opacity-35"
                >
                  <ChevronLeft aria-hidden="true" className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Next page"
                  disabled={page >= pageCount || loading}
                  onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                  className="flex size-7 items-center justify-center rounded border border-white/[0.08] text-[#aaaab3] transition hover:bg-white/[0.05] disabled:opacity-35"
                >
                  <ChevronRight aria-hidden="true" className="size-3.5" />
                </button>
              </div>
            </div>
          </>
        ) : null}
      </section>

      {modal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-3 backdrop-blur-[2px] sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModal(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-job-modal-title"
            className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-white/[0.1] bg-[#111114] shadow-2xl shadow-black/50"
          >
            <header className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-[#a889ff]">
                  {modal.mode === 'edit' ? 'Job management' : 'Listing details'}
                </p>
                <h2 id="admin-job-modal-title" className="mt-1 truncate text-base font-semibold text-[#ededf2]">
                  {modalJob?.title || (modal.mode === 'edit' ? 'Edit job' : 'Job details')}
                </h2>
                {modalJob && <p className="mt-1 truncate text-[11px] text-[#8b8b94]">{modalJob.company}</p>}
              </div>
              <button
                type="button"
                aria-label="Close job dialog"
                onClick={() => setModal(null)}
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-[#9999a2] transition hover:bg-white/[0.06] hover:text-white"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </header>

            <div className="overflow-y-auto px-4 py-5 sm:px-6">
              {detailError ? (
                <div role="alert" className="rounded-md border border-rose-400/20 bg-rose-400/[0.06] p-4 text-xs text-rose-200">
                  {detailError}
                </div>
              ) : detailLoading || !modalJob ? (
                <div className="flex min-h-48 items-center justify-center gap-2 text-xs text-[#9a9aa3]">
                  <LoaderCircle aria-hidden="true" className="size-4 animate-spin text-[#b49aff]" />
                  Loading job details…
                </div>
              ) : modal.mode === 'edit' ? (
                <AdminJobEditForm
                  key={`edit-${modalJob.id}`}
                  job={modalJob}
                  onCancel={() => setModal({ jobId: modalJob.id, mode: 'view' })}
                  onSaved={onJobSaved}
                />
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailValue label="Job title" value={modalJob.title} />
                    <DetailValue label="Company" value={modalJob.company} />
                    <DetailValue label="Category" value={modalJob.category || modalJob.department || '—'} />
                    <DetailValue label="Location" value={modalJob.location || '—'} />
                    <DetailValue label="Job type" value={modalJob.type || '—'} />
                    <DetailValue label="Compensation" value={modalJob.compensation || '—'} />
                    <DetailValue label="Remote status" value={modalJob.remote === true ? 'Remote allowed' : modalJob.remote === false ? 'On-site' : 'Not specified'} />
                    <DetailValue label="Status" value={modalJob.status || 'Unknown'} />
                    <DetailValue label="Applications" value={modalJob.applicationCount.toLocaleString()} />
                    <DetailValue label="Posted" value={formatDate(modalJob.createdAt)} />
                    <DetailValue label="Deadline" value={formatDate(modalJob.deadline)} />
                    <DetailValue label="Last updated" value={formatDate(modalJob.updatedAt)} />
                  </div>

                  <div className="rounded-md border border-white/[0.07] bg-[#0d0d10] p-3.5">
                    <p className="text-[10px] uppercase tracking-[0.08em] text-[#777780]">Recruiter</p>
                    <p className="mt-1.5 text-xs font-medium text-[#d6d6dd]">
                      {modalJob.recruiter?.name || 'Former account'}
                    </p>
                    <p className="mt-1 break-all text-[10px] text-[#8a8a93]">
                      {modalJob.recruiter?.email || modalJob.recruiterId}
                    </p>
                    <p className="mt-1 break-all text-[9px] text-[#6f6f78]">
                      Recruiter ID: {modalJob.recruiterId || '—'}
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-md border border-white/[0.07] bg-[#0d0d10] p-3.5">
                      <h3 className="text-[11px] font-medium text-[#d5d5dc]">Responsibilities</h3>
                      <p className="mt-2 whitespace-pre-wrap text-[11px] leading-5 text-[#9999a2]">
                        {modalJob.responsibility || 'No responsibilities provided.'}
                      </p>
                    </div>
                    <div className="rounded-md border border-white/[0.07] bg-[#0d0d10] p-3.5">
                      <h3 className="text-[11px] font-medium text-[#d5d5dc]">Qualifications & requirements</h3>
                      <p className="mt-2 whitespace-pre-wrap text-[11px] leading-5 text-[#9999a2]">
                        {modalJob.qualifications || 'No qualifications provided.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2 border-t border-white/[0.07] pt-4">
                    <button
                      type="button"
                      disabled={pendingJobId === modalJob.id}
                      onClick={() => requestDelete(modalJob)}
                      className="mr-auto inline-flex h-9 items-center gap-2 rounded-md border border-rose-400/20 px-3 text-xs text-rose-200 transition hover:bg-rose-400/[0.08] disabled:opacity-50"
                    >
                      <Trash2 aria-hidden="true" className="size-3.5" />
                      Delete job
                    </button>
                    {getStatusAction(modalJob) && (
                      <button
                        type="button"
                        disabled={pendingJobId === modalJob.id}
                        onClick={() => void changeStatus(modalJob)}
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-white/[0.09] px-3 text-xs text-[#c3c3ca] transition hover:bg-white/[0.05] disabled:opacity-50"
                      >
                        {pendingJobId === modalJob.id
                          ? <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                          : <RotateCcw aria-hidden="true" className="size-3.5" />}
                        {getStatusAction(modalJob)?.label}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setModal({ jobId: modalJob.id, mode: 'edit' })}
                      className="inline-flex h-9 items-center gap-2 rounded-md bg-[#8058e8] px-3 text-xs font-medium text-white transition hover:bg-[#916ff0]"
                    >
                      <Pencil aria-hidden="true" className="size-3.5" />
                      Edit job
                    </button>
                  </div>
                </div>
              )}

            </div>
          </section>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && pendingJobId === null) {
              setDeleteTarget(null);
            }
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="admin-job-delete-title"
            aria-describedby="admin-job-delete-description"
            className="w-full max-w-md rounded-xl border border-white/[0.1] bg-[#141417] p-5 shadow-2xl shadow-black/50 sm:p-6"
          >
            <div className="flex size-10 items-center justify-center rounded-lg border border-rose-400/20 bg-rose-400/[0.08] text-rose-200">
              <Trash2 aria-hidden="true" className="size-4" />
            </div>
            <h2 id="admin-job-delete-title" className="mt-4 text-sm font-semibold text-[#ededf2]">
              Delete this job listing?
            </h2>
            <p id="admin-job-delete-description" className="mt-2 text-xs leading-5 text-[#9999a2]">
              <span className="font-medium text-[#d5d5dc]">{deleteTarget.title || 'Untitled job'}</span>
              {' '}will be removed from job lists and applications will no longer be accepted.
              Existing applications and recruiter quota history will be retained.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={pendingJobId !== null}
                onClick={() => setDeleteTarget(null)}
                className="inline-flex h-9 items-center rounded-md border border-white/[0.09] px-3 text-xs text-[#c3c3ca] transition hover:bg-white/[0.05] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pendingJobId !== null}
                onClick={() => void deleteJob(deleteTarget)}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-rose-500 px-3 text-xs font-medium text-white transition hover:bg-rose-400 disabled:opacity-50"
              >
                {pendingJobId === deleteTarget.id
                  ? <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                  : <Trash2 aria-hidden="true" className="size-3.5" />}
                Delete listing
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
