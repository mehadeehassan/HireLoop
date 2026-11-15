'use client';

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Globe2,
  MapPin,
  Search,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import DashboardAvatar from '@/components/dashboard/shared/DashboardAvatar';

type Company = {
  id: string;
  name: string;
  logo: string | null;
  hasLogo: boolean;
  website: string | null;
  industry: string | null;
  description: string | null;
  createdByUserId: string | null;
  createdByName: string | null;
  createdByRole: 'seeker' | 'recruiter';
  creatorCount: number;
  submitters: Array<{ userId: string; name: string | null; role: 'seeker' | 'recruiter' }>;
  jobCount: number;
  locations: string[];
  createdAt: string | null;
  updatedAt: string | null;
};
type RelatedJob = {
  id: string;
  title: string;
  status: string | null;
  location: string | null;
  createdAt: string | null;
};
type CompanyListData = {
  companies: Company[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
type CompanyDetails = { company: Company; jobs: RelatedJob[]; jobsPageSize: number };
type SortField = 'name' | 'industry' | 'location' | 'createdAt' | 'jobs';
type SortDirection = 'asc' | 'desc';

const pageSizeOptions = [10, 20, 50] as const;
const sortOptions: Array<{ label: string; value: SortField }> = [
  { label: 'Company', value: 'name' },
  { label: 'Industry', value: 'industry' },
  { label: 'Job locations', value: 'location' },
  { label: 'Related jobs', value: 'jobs' },
  { label: 'First seen', value: 'createdAt' },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCompany(value: unknown): value is Company {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (value.logo === null || typeof value.logo === 'string') &&
    typeof value.hasLogo === 'boolean' &&
    (value.website === null || typeof value.website === 'string') &&
    (value.industry === null || typeof value.industry === 'string') &&
    (value.description === null || typeof value.description === 'string') &&
    (value.createdByUserId === null || typeof value.createdByUserId === 'string') &&
    (value.createdByName === null || typeof value.createdByName === 'string') &&
    (value.createdByRole === 'recruiter' || value.createdByRole === 'seeker') &&
    typeof value.creatorCount === 'number' &&
    Number.isSafeInteger(value.creatorCount) &&
    Array.isArray(value.submitters) &&
    value.submitters.every((submitter) =>
      isRecord(submitter) &&
      typeof submitter.userId === 'string' &&
      (submitter.name === null || typeof submitter.name === 'string') &&
      (submitter.role === 'seeker' || submitter.role === 'recruiter')) &&
    typeof value.jobCount === 'number' &&
    Number.isSafeInteger(value.jobCount) &&
    Array.isArray(value.locations) &&
    value.locations.every((location) => typeof location === 'string') &&
    (value.createdAt === null || typeof value.createdAt === 'string') &&
    (value.updatedAt === null || typeof value.updatedAt === 'string')
  );
}

function isRelatedJob(value: unknown): value is RelatedJob {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    (value.status === null || typeof value.status === 'string') &&
    (value.location === null || typeof value.location === 'string') &&
    (value.createdAt === null || typeof value.createdAt === 'string')
  );
}

function isCompanyListData(value: unknown): value is CompanyListData {
  return (
    isRecord(value) &&
    Array.isArray(value.companies) &&
    value.companies.every(isCompany) &&
    isRecord(value.pagination) &&
    typeof value.pagination.page === 'number' &&
    typeof value.pagination.pageSize === 'number' &&
    typeof value.pagination.total === 'number' &&
    typeof value.pagination.totalPages === 'number'
  );
}

function isCompanyDetails(value: unknown): value is CompanyDetails {
  return (
    isRecord(value) &&
    isCompany(value.company) &&
    Array.isArray(value.jobs) &&
    value.jobs.every(isRelatedJob) &&
    value.jobsPageSize === 20
  );
}

function getErrorMessage(payload: unknown, fallback: string) {
  return isRecord(payload) && typeof payload.error === 'string' ? payload.error : fallback;
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
}

function getSafeWebsite(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function getCompanyLogo(company: Company) {
  return company.logo ||
    (company.hasLogo ? `/api/admin/companies/${encodeURIComponent(company.id)}/logo` : null);
}

function getJobStatusStyle(status: string | null) {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'bg-emerald-400/10 text-emerald-300';
    case 'closed':
    case 'inactive':
      return 'bg-white/[0.06] text-[#aaaab3]';
    default:
      return 'bg-[#8d68ff]/10 text-[#c2aaff]';
  }
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
  direction: SortDirection;
  onSort: (field: SortField) => void;
}) {
  const active = field === currentSort;
  const Icon = active ? (direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      aria-label={`Sort by ${label}${active ? `, currently ${direction}ending` : ''}`}
      className="inline-flex items-center gap-1.5 whitespace-nowrap text-left font-medium transition hover:text-[#e5e5ea]"
    >
      {label}
      <Icon aria-hidden="true" className={`size-3 ${active ? 'text-[#b49aff]' : 'text-[#66666e]'}`} />
    </button>
  );
}

function CompanyRow({
  company,
  onSelect,
}: {
  company: Company;
  onSelect: (company: Company) => void;
}) {
  const website = getSafeWebsite(company.website);
  const locationSummary = company.locations.length === 0
    ? '—'
    : company.locations.length === 1
      ? company.locations[0]
      : `${company.locations.length} job locations`;

  return (
    <tr className="border-b border-white/[0.055] last:border-0 transition-colors hover:bg-white/[0.02]">
      <td className="px-4 py-3.5 sm:px-5">
        <div className="flex min-w-[170px] items-center gap-2.5">
          <DashboardAvatar src={getCompanyLogo(company)} name={company.name} size="sm" />
          <button
            type="button"
            onClick={() => onSelect(company)}
            className="max-w-[200px] truncate text-left text-[11px] font-medium text-[#e2e2e7] transition hover:text-[#c2aaff]"
          >
            {company.name}
          </button>
        </div>
      </td>
      <td className="px-3 py-3.5 text-[10px] text-[#a2a2aa]">{company.industry || '—'}</td>
      <td className="max-w-[170px] px-3 py-3.5 text-[10px] text-[#a2a2aa]">
        <span className="block truncate" title={company.locations.join(', ')}>
          {locationSummary}
        </span>
      </td>
      <td className="px-3 py-3.5">
        {website ? (
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="inline-flex max-w-[130px] items-center gap-1 text-[10px] text-[#b49aff] transition hover:text-white"
          >
            <span className="truncate">{new URL(website).hostname}</span>
            <ExternalLink aria-hidden="true" className="size-3 shrink-0" />
          </a>
        ) : (
          <span className="text-[10px] text-[#77777f]">—</span>
        )}
      </td>
      <td className="px-3 py-3.5">
        <div className="max-w-[140px] truncate text-[10px] text-[#c6c6ce]">
          {company.createdByName || 'Former account'}
          {company.creatorCount > 1 ? (
            <span className="ml-1 text-[#77777f]">+{company.creatorCount - 1}</span>
          ) : null}
        </div>
      </td>
      <td className="px-3 py-3.5">
        <span className={`inline-flex rounded-full border px-2 py-1 text-[9px] ${
          company.createdByRole === 'seeker'
            ? 'border-white/[0.08] bg-white/[0.06] text-[#c6c6ce]'
            : 'border-[#9b71ff]/20 bg-[#8d68ff]/10 text-[#c2aaff]'
        }`}>
          {company.createdByRole[0].toUpperCase() + company.createdByRole.slice(1)}
        </span>
      </td>
      <td className="px-3 py-3.5 text-center text-[10px] tabular-nums text-[#c6c6ce]">
        {company.jobCount.toLocaleString()}
      </td>
      <td className="whitespace-nowrap px-3 py-3.5 text-[10px] text-[#a2a2aa]">
        {formatDate(company.createdAt)}
      </td>
      <td className="px-4 py-3.5 text-right sm:px-5">
        <button
          type="button"
          onClick={() => onSelect(company)}
          className="inline-flex h-8 items-center rounded-lg border border-white/[0.08] px-2.5 text-[10px] font-medium text-[#c8c8d0] transition hover:border-[#9b71ff]/30 hover:bg-[#8d68ff]/10 hover:text-white"
        >
          View
        </button>
      </td>
    </tr>
  );
}

export default function AdminCompaniesManager() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [industryInput, setIndustryInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [creatorRole, setCreatorRole] = useState<'all' | 'seeker' | 'recruiter'>('all');
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof pageSizeOptions)[number]>(10);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [listState, setListState] = useState<{ key: string; data: CompanyListData } | null>(null);
  const [listError, setListError] = useState<{ key: string; message: string } | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [detailsState, setDetailsState] = useState<{ id: string; data: CompanyDetails } | null>(null);
  const [detailsError, setDetailsError] = useState<{ id: string; message: string } | null>(null);
  const [detailsRetry, setDetailsRetry] = useState(0);
  const detailsDialog = useRef<HTMLDialogElement>(null);

  const listKey = [
    page,
    pageSize,
    search,
    industryInput.trim(),
    locationInput.trim(),
    creatorRole,
    sortBy,
    sortDirection,
    refreshVersion,
  ].join('|');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextSearch = searchInput.trim();
      if (nextSearch !== search) {
        setSearch(nextSearch);
        setPage(1);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      creatorRole,
      sortBy,
      sortDirection,
    });
    if (search) params.set('search', search);
    if (industryInput.trim()) params.set('industry', industryInput.trim());
    if (locationInput.trim()) params.set('location', locationInput.trim());

    async function loadCompanies() {
      try {
        const response = await fetch(`/api/admin/companies?${params}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error(getErrorMessage(payload, 'Could not load companies.'));
        if (!isCompanyListData(payload)) throw new Error('The company service returned invalid data.');

        const lastPage = Math.max(1, payload.pagination.totalPages);
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setListState({ key: listKey, data: payload });
      } catch (error) {
        if (controller.signal.aborted) return;
        setListError({
          key: listKey,
          message: error instanceof Error ? error.message : 'Could not load companies.',
        });
      }
    }

    void loadCompanies();
    return () => controller.abort();
  }, [
    creatorRole,
    industryInput,
    listKey,
    locationInput,
    page,
    pageSize,
    search,
    sortBy,
    sortDirection,
  ]);

  useEffect(() => {
    const dialog = detailsDialog.current;
    if (!dialog) return;
    if (selectedCompany && !dialog.open) dialog.showModal();
    if (!selectedCompany && dialog.open) dialog.close();
  }, [selectedCompany]);

  useEffect(() => {
    if (!selectedCompany) return;
    const companyId = selectedCompany.id;
    const controller = new AbortController();

    async function loadCompanyDetails() {
      try {
        const response = await fetch(
          `/api/admin/companies/${encodeURIComponent(companyId)}`,
          { cache: 'no-store', signal: controller.signal },
        );
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(getErrorMessage(payload, 'Could not load company details.'));
        }
        if (!isCompanyDetails(payload)) {
          throw new Error('The company detail service returned invalid data.');
        }
        setDetailsState({ id: companyId, data: payload });
      } catch (error) {
        if (controller.signal.aborted) return;
        setDetailsError({
          id: companyId,
          message: error instanceof Error ? error.message : 'Could not load company details.',
        });
      }
    }

    void loadCompanyDetails();
    return () => controller.abort();
  }, [detailsRetry, selectedCompany]);

  const listData = listState?.key === listKey ? listState.data : null;
  const currentListError = listError?.key === listKey ? listError.message : null;
  const listLoading = !listData && !currentListError;
  const totalPages = listData ? Math.max(1, listData.pagination.totalPages) : 1;
  const firstCompany = listData?.pagination.total
    ? (page - 1) * pageSize + 1
    : 0;
  const lastCompany = listData
    ? Math.min(page * pageSize, listData.pagination.total)
    : 0;
  const activeDetails = selectedCompany
    ? detailsState?.id === selectedCompany.id
      ? detailsState.data
      : null
    : null;
  const activeDetailsError = selectedCompany && detailsError?.id === selectedCompany.id
    ? detailsError.message
    : null;
  const detailsLoading = Boolean(selectedCompany && !activeDetails && !activeDetailsError);

  function clearFilters() {
    setSearchInput('');
    setSearch('');
    setIndustryInput('');
    setLocationInput('');
    setCreatorRole('all');
    setPage(1);
  }

  function changeSort(field: SortField) {
    if (field === sortBy) {
      setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection(field === 'name' || field === 'industry' || field === 'location' ? 'asc' : 'desc');
    }
    setPage(1);
  }

  function openDetails(company: Company) {
    setDetailsError(null);
    setSelectedCompany(company);
  }

  function closeDetails() {
    setSelectedCompany(null);
  }

  const selectedCompanyDetails = activeDetails?.company ?? selectedCompany;
  const detailWebsite = getSafeWebsite(selectedCompanyDetails?.website ?? null);

  return (
    <div className="mx-auto w-full max-w-[1440px] py-5 lg:py-7">
      <div className="mb-5 text-[11px] text-[#85858d]">
        Admin <span className="px-1.5 text-[#4f4f56]">/</span> Companies
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.03em] text-[#f0f0f3] sm:text-2xl">
            Company Directory
          </h1>
          <p className="mt-1 text-[11px] text-[#85858d]">
            Seeker and recruiter submissions, plus legacy recruiter profiles and job listings.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[10px] text-[#a2a2aa]">
          <Building2 aria-hidden="true" className="size-3.5 text-[#b49aff]" />
          {listData ? `${listData.pagination.total.toLocaleString()} companies` : 'Companies'}
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#131316]">
        <div className="grid gap-3 border-b border-white/[0.07] p-4 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_minmax(150px,.8fr)_minmax(150px,.8fr)_160px_160px_110px] xl:items-end">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-medium text-[#85858d]">Company search</span>
            <span className="relative block">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#77777f]" />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                maxLength={120}
                placeholder="Search company name"
                className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#0e0e11] pl-9 pr-3 text-[11px] text-[#e7e7ec] outline-none placeholder:text-[#66666e] focus:border-[#9b71ff]/60"
              />
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-medium text-[#85858d]">Industry</span>
            <input
              type="search"
              value={industryInput}
              onChange={(event) => {
                setIndustryInput(event.target.value);
                setPage(1);
              }}
              maxLength={120}
              placeholder="Filter industry"
              className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#0e0e11] px-3 text-[11px] text-[#e7e7ec] outline-none placeholder:text-[#66666e] focus:border-[#9b71ff]/60"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-medium text-[#85858d]">Job location</span>
            <input
              type="search"
              value={locationInput}
              onChange={(event) => {
                setLocationInput(event.target.value);
                setPage(1);
              }}
              maxLength={120}
              placeholder="Filter location"
              className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#0e0e11] px-3 text-[11px] text-[#e7e7ec] outline-none placeholder:text-[#66666e] focus:border-[#9b71ff]/60"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-medium text-[#85858d]">Submitted by role</span>
            <select
              value={creatorRole}
              onChange={(event) => {
                const value = event.target.value;
                if (value === 'all' || value === 'seeker' || value === 'recruiter') {
                  setCreatorRole(value);
                }
                setPage(1);
              }}
              className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#0e0e11] px-3 text-[11px] text-[#e7e7ec] outline-none focus:border-[#9b71ff]/60"
            >
              <option value="all">All roles</option>
              <option value="seeker">Seeker</option>
              <option value="recruiter">Recruiter</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-medium text-[#85858d]">Sort by</span>
            <select
              value={sortBy}
              onChange={(event) => {
                const value = sortOptions.find((option) => option.value === event.target.value);
                if (value) setSortBy(value.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#0e0e11] px-3 text-[11px] text-[#e7e7ec] outline-none focus:border-[#9b71ff]/60"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc')}
            aria-label={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
            className="inline-flex h-9 items-center justify-center gap-2 self-end rounded-lg border border-white/[0.08] bg-[#0e0e11] px-3 text-[10px] text-[#c8c8d0] transition hover:border-[#9b71ff]/35 hover:text-white"
          >
            {sortDirection === 'asc'
              ? <ArrowUp aria-hidden="true" className="size-3.5 text-[#b49aff]" />
              : <ArrowDown aria-hidden="true" className="size-3.5 text-[#b49aff]" />}
            {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
          </button>
        </div>

        {listLoading ? (
          <div aria-label="Loading companies" className="animate-pulse space-y-3 p-5">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="h-12 rounded-lg bg-white/[0.04]" />
            ))}
          </div>
        ) : currentListError ? (
          <div role="alert" className="flex flex-col items-center px-5 py-12 text-center">
            <Building2 aria-hidden="true" className="size-7 text-rose-300" />
            <h2 className="mt-3 text-sm font-medium text-[#e5e5ea]">Could not load companies</h2>
            <p className="mt-1 max-w-md text-xs text-[#9999a2]">{currentListError}</p>
            <button
              type="button"
              onClick={() => setRefreshVersion((version) => version + 1)}
              className="mt-4 rounded-lg border border-white/[0.09] px-3 py-2 text-[10px] text-[#d0d0d7] transition hover:bg-white/[0.05]"
            >
              Try again
            </button>
          </div>
        ) : listData ? (
          listData.companies.length === 0 ? (
            <div className="flex flex-col items-center px-5 py-14 text-center">
              <span className="flex size-11 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.03]">
                <Building2 aria-hidden="true" className="size-5 text-[#85858d]" />
              </span>
              <h2 className="mt-3 text-sm font-medium text-[#e5e5ea]">
                {listData.pagination.total === 0 && !search && !industryInput && !locationInput && creatorRole === 'all'
                  ? 'No company records yet'
                  : 'No matching companies'}
              </h2>
              <p className="mt-1 max-w-sm text-xs leading-5 text-[#85858d]">
                {listData.pagination.total === 0 && !search && !industryInput && !locationInput
                  ? 'Company submissions and job listings will appear here when users add them.'
                  : 'Try adjusting your search or filters.'}
              </p>
              {search || industryInput || locationInput || creatorRole !== 'all' ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 rounded-lg border border-white/[0.09] px-3 py-2 text-[10px] text-[#d0d0d7] transition hover:bg-white/[0.05]"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : (
            <>
              <div className="space-y-3 p-3 lg:hidden">
                {listData.companies.map((company) => {
                  const website = getSafeWebsite(company.website);
                  const locationSummary = company.locations.length === 0
                    ? 'No job locations'
                    : company.locations.join(', ');
                  return (
                    <article
                      key={company.id}
                      className="rounded-xl border border-white/[0.07] bg-[#17171b] p-3.5"
                    >
                      <div className="flex items-start gap-3">
                        <DashboardAvatar src={getCompanyLogo(company)} name={company.name} size="md" />
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => openDetails(company)}
                            className="block max-w-full truncate text-left text-xs font-medium text-[#e5e5ea] hover:text-[#c2aaff]"
                          >
                            {company.name}
                          </button>
                          <p className="mt-1 truncate text-[10px] text-[#96969e]">
                            {company.industry || 'Industry not provided'}
                          </p>
                        </div>
                        <span className="rounded-full bg-[#8d68ff]/10 px-2 py-1 text-[9px] text-[#c2aaff]">
                          {company.createdByRole}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-3">
                        <div className="min-w-0">
                          <p className="text-[9px] text-[#77777f]">Submitted by</p>
                          <p className="mt-1 truncate text-[10px] text-[#c6c6ce]">
                            {company.createdByName || 'Former account'}
                            {company.creatorCount > 1 ? ` +${company.creatorCount - 1}` : ''}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] text-[#77777f]">Related jobs</p>
                          <p className="mt-1 text-[10px] text-[#c6c6ce]">{company.jobCount.toLocaleString()}</p>
                        </div>
                        <div className="col-span-2 flex items-center gap-1.5">
                          <MapPin aria-hidden="true" className="size-3 shrink-0 text-[#77777f]" />
                          <p className="truncate text-[10px] text-[#a2a2aa]">{locationSummary}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        {website ? (
                          <a
                            href={website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-w-0 items-center gap-1 text-[10px] text-[#b49aff] hover:text-white"
                          >
                            <span className="truncate">{new URL(website).hostname}</span>
                            <ExternalLink aria-hidden="true" className="size-3 shrink-0" />
                          </a>
                        ) : <span className="text-[10px] text-[#77777f]">No website</span>}
                        <button
                          type="button"
                          onClick={() => openDetails(company)}
                          className="rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-[10px] text-[#d0d0d7] transition hover:bg-white/[0.05]"
                        >
                          Details
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1040px] text-left">
                  <thead className="border-b border-white/[0.07] bg-white/[0.015] text-[10px] text-[#77777f]">
                    <tr>
                      <th scope="col" className="px-4 py-3 sm:px-5">
                        <SortButton label="Company" field="name" currentSort={sortBy} direction={sortDirection} onSort={changeSort} />
                      </th>
                      <th scope="col" className="px-3 py-3">
                        <SortButton label="Industry" field="industry" currentSort={sortBy} direction={sortDirection} onSort={changeSort} />
                      </th>
                      <th scope="col" className="px-3 py-3">
                        <SortButton label="Job locations" field="location" currentSort={sortBy} direction={sortDirection} onSort={changeSort} />
                      </th>
                      <th scope="col" className="px-3 py-3 font-medium">Website</th>
                      <th scope="col" className="px-3 py-3 font-medium">Submitted by</th>
                      <th scope="col" className="px-3 py-3 font-medium">Role</th>
                      <th scope="col" className="px-3 py-3 text-center">
                        <SortButton label="Jobs" field="jobs" currentSort={sortBy} direction={sortDirection} onSort={changeSort} />
                      </th>
                      <th scope="col" className="px-3 py-3">
                        <SortButton label="First seen" field="createdAt" currentSort={sortBy} direction={sortDirection} onSort={changeSort} />
                      </th>
                      <th scope="col" className="px-4 py-3 text-right font-medium sm:px-5">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listData.companies.map((company) => (
                      <CompanyRow key={company.id} company={company} onSelect={openDetails} />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-3 border-t border-white/[0.07] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex items-center gap-3">
                  <p className="text-[10px] text-[#85858d]">
                    Showing {firstCompany.toLocaleString()}–{lastCompany.toLocaleString()} of {listData.pagination.total.toLocaleString()}
                  </p>
                  <label className="flex items-center gap-1.5 text-[10px] text-[#85858d]">
                    Rows
                    <select
                      value={pageSize}
                      onChange={(event) => {
                        const value = pageSizeOptions.find(
                          (size) => size === Number(event.target.value),
                        );
                        if (value) setPageSize(value);
                        setPage(1);
                      }}
                      className="h-7 rounded-md border border-white/[0.08] bg-[#0e0e11] px-1.5 text-[10px] text-[#c8c8d0]"
                    >
                      {pageSizeOptions.map((size) => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-white/[0.09] px-2.5 text-[10px] text-[#c8c8cf] transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft aria-hidden="true" className="size-3.5" />
                    Previous
                  </button>
                  <span aria-live="polite" className="px-2 text-[10px] text-[#a0a0a8]">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-white/[0.09] px-2.5 text-[10px] text-[#c8c8cf] transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <ChevronRight aria-hidden="true" className="size-3.5" />
                  </button>
                </div>
              </div>
            </>
          )
        ) : null}
      </section>

      {selectedCompany && selectedCompanyDetails ? (
        <dialog
          ref={detailsDialog}
          aria-modal="true"
          aria-labelledby="admin-company-details-title"
          className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-white/[0.1] bg-[#17171b] p-5 text-[#e7e7ec] shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm sm:p-6"
          onCancel={(event) => {
            event.preventDefault();
            closeDetails();
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDetails();
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <DashboardAvatar
                src={getCompanyLogo(selectedCompanyDetails)}
                name={selectedCompanyDetails.name}
                size="md"
              />
              <div className="min-w-0">
                <h2 id="admin-company-details-title" className="truncate text-base font-semibold text-[#f0f0f3]">
                  {selectedCompanyDetails.name}
                </h2>
                <p className="mt-0.5 text-[10px] text-[#85858d]">Company details and related job posts</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close company details"
              onClick={closeDetails}
              className="rounded-lg p-2 text-[#85858d] transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9b71ff]/70"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
              <div className="flex items-center gap-2 text-[10px] text-[#85858d]">
                <Users aria-hidden="true" className="size-3.5" />
                Submitted by
              </div>
              {activeDetails?.company.submitters.length ? (
                <ul className="mt-2 space-y-1.5">
                  {activeDetails.company.submitters.map((submitter) => (
                    <li key={`${submitter.userId}:${submitter.role}`} className="text-[10px] text-[#c6c6ce]">
                      <span className="font-medium text-[#e5e5ea]">{submitter.name || 'Former account'}</span>
                      <span className="ml-1 capitalize text-[#85858d]">· {submitter.role}</span>
                      <span className="mt-0.5 block break-all text-[9px] text-[#77777f]">{submitter.userId}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[10px] text-[#85858d]">Loading submitter details…</p>
              )}
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
              <div className="flex items-center gap-2 text-[10px] text-[#85858d]">
                <BriefcaseBusiness aria-hidden="true" className="size-3.5" />
                Related jobs
              </div>
              <p className="mt-2 text-xs font-medium text-[#e5e5ea]">
                {selectedCompanyDetails.jobCount.toLocaleString()} job posts
              </p>
              <p className="mt-1 text-[10px] text-[#85858d]">
                {selectedCompanyDetails.locations.length
                  ? selectedCompanyDetails.locations.join(', ')
                  : 'No job location available'}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
              <p className="text-[10px] text-[#85858d]">Industry</p>
              <p className="mt-1.5 text-xs text-[#e5e5ea]">{selectedCompanyDetails.industry || 'Not provided'}</p>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
              <div className="flex items-center gap-2 text-[10px] text-[#85858d]">
                <CalendarDays aria-hidden="true" className="size-3.5" />
                First seen
              </div>
              <p className="mt-1.5 text-xs text-[#e5e5ea]">{formatDate(selectedCompanyDetails.createdAt)}</p>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
              <div className="flex items-center gap-2 text-[10px] text-[#85858d]">
                <CalendarDays aria-hidden="true" className="size-3.5" />
                Last updated
              </div>
              <p className="mt-1.5 text-xs text-[#e5e5ea]">{formatDate(selectedCompanyDetails.updatedAt)}</p>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
              <div className="flex items-center gap-2 text-[10px] text-[#85858d]">
                <MapPin aria-hidden="true" className="size-3.5" />
                Job locations
              </div>
              <p className="mt-1.5 text-xs leading-5 text-[#e5e5ea]">
                {selectedCompanyDetails.locations.length
                  ? selectedCompanyDetails.locations.join(', ')
                  : 'Not provided'}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
              <div className="flex items-center gap-2 text-[10px] text-[#85858d]">
                <Globe2 aria-hidden="true" className="size-3.5" />
                Website
              </div>
              {detailWebsite ? (
                <a
                  href={detailWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex max-w-full items-center gap-1 text-xs text-[#b49aff] hover:text-white"
                >
                  <span className="truncate">{detailWebsite}</span>
                  <ExternalLink aria-hidden="true" className="size-3 shrink-0" />
                </a>
              ) : (
                <p className="mt-1.5 text-xs text-[#e5e5ea]">Not provided</p>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
            <p className="text-[10px] text-[#85858d]">Company description</p>
            <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#c6c6ce]">
              {selectedCompanyDetails.description || 'No description provided.'}
            </p>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-[11px] font-semibold text-[#e5e5ea]">Related job posts</h3>
              <span className="text-[10px] text-[#77777f]">
                Latest {Math.min(selectedCompanyDetails.jobCount, 20)}
              </span>
            </div>
            {detailsLoading ? (
              <div aria-label="Loading related jobs" className="animate-pulse space-y-2">
                <div className="h-12 rounded-lg bg-white/[0.04]" />
                <div className="h-12 rounded-lg bg-white/[0.04]" />
              </div>
            ) : activeDetailsError ? (
              <div role="alert" className="rounded-lg border border-rose-400/15 bg-rose-400/[0.04] p-3">
                <p className="text-[10px] text-rose-200">{activeDetailsError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setDetailsError(null);
                    setDetailsRetry((version) => version + 1);
                  }}
                  className="mt-2 text-[10px] font-medium text-[#d0c1ff] hover:text-white"
                >
                  Retry
                </button>
              </div>
            ) : activeDetails?.jobs.length ? (
              <ul className="space-y-2">
                {activeDetails.jobs.map((job) => (
                  <li
                    key={job.id}
                    className="flex flex-col gap-2 rounded-lg border border-white/[0.06] bg-[#101013] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-medium text-[#e5e5ea]">{job.title}</p>
                      <p className="mt-1 truncate text-[10px] text-[#85858d]">
                        {job.location || 'Location not provided'} · {formatDate(job.createdAt)}
                      </p>
                    </div>
                    <span className={`w-fit rounded-full px-2 py-1 text-[9px] ${getJobStatusStyle(job.status)}`}>
                      {job.status || 'Unknown'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-white/[0.06] bg-[#101013] px-3 py-4 text-center text-[10px] text-[#85858d]">
                No related job posts.
              </p>
            )}
          </div>
        </dialog>
      ) : null}
    </div>
  );
}
