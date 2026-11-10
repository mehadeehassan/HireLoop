'use client';

import { useEffect, useMemo, useState } from 'react';
import HomeNavbar from '@/components/home/HomeNavbar';
import type { PublicJob } from '@/lib/public-jobs';
import JobCard from './JobCard';
import JobFilters from './JobFilters';
import JobPagination from './JobPagination';
import JobSearchBar from './JobSearchBar';

const JOBS_PER_PAGE = 4;
const COMMON_JOB_TYPES = ['Full-time', 'Contract', 'Freelance', 'Part-time', 'Internship'];

function isPublicJob(value: unknown): value is PublicJob {
  if (typeof value !== 'object' || value === null) return false;
  const job = value as Record<string, unknown>;

  return (
    typeof job.id === 'string' &&
    typeof job.title === 'string' &&
    typeof job.company === 'string' &&
    typeof job.location === 'string' &&
    typeof job.type === 'string' &&
    typeof job.workMode === 'string' &&
    typeof job.compensation === 'string' &&
    typeof job.description === 'string' &&
    typeof job.remote === 'boolean' &&
    (typeof job.applyUrl === 'string' || job.applyUrl === null) &&
    typeof job.department === 'string' &&
    typeof job.category === 'string' &&
    (typeof job.createdAt === 'string' || job.createdAt === null) &&
    Array.isArray(job.responsibilities) &&
    Array.isArray(job.requirements) &&
    Array.isArray(job.benefits) &&
    typeof job.experience === 'string' &&
    typeof job.companySize === 'string' &&
    typeof job.industry === 'string' &&
    (typeof job.companyWebsite === 'string' || job.companyWebsite === null) &&
    (typeof job.companyLogo === 'string' || job.companyLogo === null) &&
    typeof job.companyDescription === 'string' &&
    typeof job.verifiedEmployer === 'boolean'
  );
}

function getDepartment(job: PublicJob) {
  return job.category || job.department;
}

function getWorkMode(job: PublicJob) {
  if (job.workMode === 'Hybrid') return 'Hybrid';
  return job.remote ? 'Remote' : 'On-site';
}

function getFilterOptions(values: string[]) {
  return [...new Set(values.filter(Boolean))]
    .sort((first, second) => first.localeCompare(second))
    .map((value) => ({
      value,
      count: values.filter((option) => option === value).length,
    }));
}

export default function BrowseJobs({ initialSearch = '' }: { initialSearch?: string }) {
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [submittedSearch, setSubmittedSearch] = useState(initialSearch);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedWorkModes, setSelectedWorkModes] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [sortOrder, setSortOrder] = useState<'recent' | 'title'>('recent');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadJobs() {
      setLoading(true);
      setError('');

      try {
        const query = new URLSearchParams();
        if (submittedSearch) query.set('search', submittedSearch);

        const response = await fetch(`/api/jobs${query.size ? `?${query}` : ''}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('Job listings are temporarily unavailable.');
        }

        const payload: unknown = await response.json();
        const result =
          typeof payload === 'object' && payload !== null
            ? (payload as Record<string, unknown>)
            : null;
        if (!result || !Array.isArray(result.jobs) || !result.jobs.every(isPublicJob)) {
          throw new Error('The job service returned an unexpected response.');
        }

        setJobs(result.jobs);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Job listings could not be loaded. Please try again.',
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadJobs();
    return () => controller.abort();
  }, [reloadKey, submittedSearch]);

  const jobTypeOptions = useMemo(() => {
    const availableTypes = [...new Set(jobs.map((job) => job.type).filter(Boolean))];
    const commonTypes = COMMON_JOB_TYPES.map((type) =>
      availableTypes.find((available) => available.toLowerCase() === type.toLowerCase()),
    ).filter((type): type is string => Boolean(type));

    return [
      ...commonTypes,
      ...availableTypes
        .filter(
          (type) =>
            !COMMON_JOB_TYPES.some((common) => common.toLowerCase() === type.toLowerCase()),
        )
        .sort((a, b) => a.localeCompare(b)),
    ].map((value) => ({
      value,
      count: jobs.filter((job) => job.type === value).length,
    }));
  }, [jobs]);

  const departmentOptions = useMemo(() => {
    const departments = [...new Set(jobs.map(getDepartment).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b),
    );
    return departments.map((value) => ({
      value,
      count: jobs.filter((job) => getDepartment(job) === value).length,
    }));
  }, [jobs]);

  const workModeOptions = useMemo(() => {
    const modes = ['Remote', 'Hybrid', 'On-site'].filter((mode) =>
      jobs.some((job) => getWorkMode(job) === mode),
    );
    return modes.map((value) => ({
      value,
      count: jobs.filter((job) => getWorkMode(job) === value).length,
    }));
  }, [jobs]);

  const locationOptions = useMemo(
    () => getFilterOptions(jobs.map((job) => job.location)),
    [jobs],
  );
  const companyOptions = useMemo(
    () => getFilterOptions(jobs.map((job) => job.company)),
    [jobs],
  );

  const filteredJobs = useMemo(() => {
    const filtered = jobs.filter((job) => {
      const matchesType =
        selectedTypes.length === 0 ||
        selectedTypes.some((type) => type.toLowerCase() === job.type.toLowerCase());
      const matchesWorkMode =
        selectedWorkModes.length === 0 || selectedWorkModes.includes(getWorkMode(job));
      const matchesLocation = !selectedLocation || job.location === selectedLocation;
      const matchesCompany = !selectedCompany || job.company === selectedCompany;
      const matchesDepartment =
        !selectedDepartment || getDepartment(job) === selectedDepartment;
      return (
        matchesType &&
        matchesWorkMode &&
        matchesLocation &&
        matchesCompany &&
        matchesDepartment
      );
    });

    return filtered.sort((first, second) => {
      if (sortOrder === 'title') return first.title.localeCompare(second.title);
      if (!first.createdAt) return second.createdAt ? 1 : 0;
      if (!second.createdAt) return -1;
      return Date.parse(second.createdAt) - Date.parse(first.createdAt);
    });
  }, [
    jobs,
    selectedCompany,
    selectedDepartment,
    selectedLocation,
    selectedTypes,
    selectedWorkModes,
    sortOrder,
  ]);

  const pageCount = Math.ceil(filteredJobs.length / JOBS_PER_PAGE);
  const currentPage = Math.min(page, Math.max(pageCount, 1));
  const pageJobs = filteredJobs.slice(
    (currentPage - 1) * JOBS_PER_PAGE,
    currentPage * JOBS_PER_PAGE,
  );
  const hasFilters =
    Boolean(submittedSearch || selectedDepartment || selectedLocation || selectedCompany) ||
    selectedTypes.length > 0 ||
    selectedWorkModes.length > 0;

  function toggleType(type: string) {
    setPage(1);
    setSelectedTypes((current) =>
      current.includes(type) ? current.filter((value) => value !== type) : [...current, type],
    );
  }

  function toggleWorkMode(mode: string) {
    setPage(1);
    setSelectedWorkModes((current) =>
      current.includes(mode) ? current.filter((value) => value !== mode) : [...current, mode],
    );
  }

  function clearFilters() {
    setSearchInput('');
    setSubmittedSearch('');
    setSelectedTypes([]);
    setSelectedWorkModes([]);
    setSelectedLocation('');
    setSelectedCompany('');
    setSelectedDepartment('');
    setSortOrder('recent');
    setPage(1);
  }

  return (
    <main className="min-h-screen bg-[#09090b] px-4 pb-12 pt-5 text-[#ededf3] sm:px-6 sm:pt-7">
      <div className="mx-auto max-w-310">
        <HomeNavbar />

        <div className="mt-3">
          <JobSearchBar
            value={searchInput}
            onChange={setSearchInput}
            onSearch={(search) => {
              setPage(1);
              setSubmittedSearch(search);
            }}
          />
        </div>

        <div className="mt-5 grid items-start gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
          <JobFilters
            jobTypes={jobTypeOptions}
            selectedTypes={selectedTypes}
            onToggleType={toggleType}
            workModes={workModeOptions}
            selectedWorkModes={selectedWorkModes}
            onToggleWorkMode={toggleWorkMode}
            locations={locationOptions}
            selectedLocation={selectedLocation}
            onLocationChange={(location) => {
              setPage(1);
              setSelectedLocation(location);
            }}
            companies={companyOptions}
            selectedCompany={selectedCompany}
            onCompanyChange={(company) => {
              setPage(1);
              setSelectedCompany(company);
            }}
            departments={departmentOptions}
            selectedDepartment={selectedDepartment}
            onDepartmentChange={(department) => {
              setPage(1);
              setSelectedDepartment(department);
            }}
            hasFilters={hasFilters}
            onClear={clearFilters}
          />

          <section aria-labelledby="browse-jobs-heading" className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-0.5">
              <h1 id="browse-jobs-heading" className="text-sm font-semibold text-[#ededf3]">
                {loading ? 'Finding jobs...' : `Found ${filteredJobs.length.toLocaleString()} Professional Jobs`}
              </h1>
              <label className="flex items-center gap-2 text-[11px] text-[#8d8d96]">
                <span>Sort by:</span>
                <select
                  value={sortOrder}
                  onChange={(event) => {
                    setSortOrder(event.target.value === 'title' ? 'title' : 'recent');
                    setPage(1);
                  }}
                  className="h-8 rounded-md border border-white/[0.07] bg-[#141416] px-2 text-xs text-[#ededf3] outline-none focus:border-[#8178ff]"
                >
                  <option value="recent">Most Recent</option>
                  <option value="title">Title A–Z</option>
                </select>
              </label>
            </div>

            {error ? (
              <div
                role="alert"
                className="rounded-xl border border-red-300/15 bg-[#141416] px-5 py-10 text-center"
              >
                <p className="text-sm text-[#f0c2c2]">{error}</p>
                <button
                  type="button"
                  onClick={() => setReloadKey((key) => key + 1)}
                  className="mt-4 rounded-lg border border-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/5"
                >
                  Try again
                </button>
              </div>
            ) : loading ? (
              <div className="space-y-2.5" aria-label="Loading jobs">
                {Array.from({ length: JOBS_PER_PAGE }, (_, index) => (
                  <div
                    key={index}
                    className="h-28 animate-pulse rounded-xl border border-white/6 bg-[#141416]"
                  />
                ))}
              </div>
            ) : pageJobs.length > 0 ? (
              <div className="space-y-2.5">
                {pageJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-white/6 bg-[#141416] px-5 py-12 text-center">
                <p className="text-sm font-medium text-[#ededf3]">
                  {hasFilters ? 'No jobs match your filters.' : 'No jobs are available right now.'}
                </p>
                <p className="mt-2 text-xs text-[#92929b]">
                  {hasFilters
                    ? 'Try adjusting your search or filters.'
                    : 'Please check back soon for new opportunities.'}
                </p>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 text-xs text-[#aaa2ff] transition hover:text-white"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {!loading && !error && (
              <JobPagination
                page={currentPage}
                pageCount={pageCount}
                onPageChange={setPage}
              />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
