"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { PublicJob } from "@/lib/public-jobs";
import FeaturedJobsSection from "@/components/home/FeaturedJobsSection";
import HeroSection from "@/components/home/HeroSection";
import HomeStatsSection from "@/components/home/HomeStatsSection";
import type { JobFilterOption } from "@/components/browse-jobs/JobFilters";

const HOME_JOBS_PER_PAGE = 6;

type HomeFilterOptions = {
  types: JobFilterOption[];
  companies: JobFilterOption[];
  workModes: JobFilterOption[];
};

function isPublicJob(value: unknown): value is PublicJob {
  if (typeof value !== "object" || value === null) return false;
  const job = value as Record<string, unknown>;

  return (
    typeof job.id === "string" &&
    typeof job.title === "string" &&
    typeof job.company === "string" &&
    typeof job.location === "string" &&
    typeof job.type === "string" &&
    typeof job.workMode === "string" &&
    typeof job.compensation === "string" &&
    typeof job.description === "string" &&
    typeof job.remote === "boolean" &&
    (typeof job.applyUrl === "string" || job.applyUrl === null) &&
    typeof job.department === "string" &&
    typeof job.category === "string" &&
    (typeof job.createdAt === "string" || job.createdAt === null) &&
    Array.isArray(job.responsibilities) &&
    Array.isArray(job.requirements) &&
    Array.isArray(job.benefits) &&
    typeof job.experience === "string" &&
    typeof job.companySize === "string" &&
    typeof job.industry === "string" &&
    (typeof job.companyWebsite === "string" || job.companyWebsite === null) &&
    (typeof job.companyLogo === "string" || job.companyLogo === null) &&
    typeof job.companyDescription === "string" &&
    typeof job.verifiedEmployer === "boolean"
  );
}

export default function HomeDynamicSections() {
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [submittedLocation, setSubmittedLocation] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobsPosted, setTotalJobsPosted] = useState<number | null>(null);
  const [filterOptions, setFilterOptions] = useState<HomeFilterOptions>({
    types: [],
    companies: [],
    workModes: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadJobs() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(HOME_JOBS_PER_PAGE),
        });
        if (submittedQuery.trim()) params.set("search", submittedQuery.trim());
        if (submittedLocation.trim()) params.set("location", submittedLocation.trim());
        const response = await fetch(`/api/jobs?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Job listings are temporarily unavailable.");
        }

        const payload: unknown = await response.json();
        const result = payload as {
          jobs?: unknown;
          pagination?: unknown;
          filterOptions?: unknown;
          totalJobsPosted?: unknown;
        };
        const pagination =
          typeof result.pagination === "object" && result.pagination !== null
            ? result.pagination as Record<string, unknown>
            : null;
        const options =
          typeof result.filterOptions === "object" && result.filterOptions !== null
            ? result.filterOptions as Record<string, unknown>
            : null;
        const readOptions = (key: string) => {
          const values = options?.[key];
          return Array.isArray(values)
            ? values.filter((item): item is JobFilterOption =>
                typeof item === "object" && item !== null &&
                typeof (item as JobFilterOption).value === "string" &&
                typeof (item as JobFilterOption).count === "number",
              )
            : [];
        };
        if (
          !Array.isArray(result.jobs) ||
          !result.jobs.every(isPublicJob) ||
          !pagination ||
          typeof pagination.totalPages !== "number" ||
          !options ||
          typeof result.totalJobsPosted !== "number" ||
          !Number.isSafeInteger(result.totalJobsPosted) ||
          result.totalJobsPosted < 0
        ) {
          throw new Error("The job service returned an unexpected response.");
        }

        const safeTotalPages = Math.max(1, pagination.totalPages);
        if (page > safeTotalPages) {
          setPage(safeTotalPages);
          return;
        }
        setJobs(result.jobs);
        setTotalPages(safeTotalPages);
        setTotalJobsPosted(result.totalJobsPosted);
        setFilterOptions({
          types: readOptions("types"),
          companies: readOptions("companies"),
          workModes: readOptions("workModes"),
        });
      } catch (loadError) {
        if (controller.signal.aborted) return;
        const message = loadError instanceof Error
          ? loadError.message
          : "Job listings could not be loaded. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadJobs();
    return () => controller.abort();
  }, [page, reloadKey, submittedLocation, submittedQuery]);

  const popularSearches = useMemo(
    () => [...new Set(jobs.map((job) => job.title))].slice(0, 4),
    [jobs],
  );
  const activeJobCount = filterOptions.workModes.reduce((count, item) => count + item.count, 0);
  const companyCount = filterOptions.companies.length;
  const remoteCount = filterOptions.workModes.find((item) => item.value === "Remote")?.count ?? 0;
  const jobTypeCount = filterOptions.types.length;

  function applySearch(nextQuery = query, nextLocation = location) {
    setPage(1);
    setSubmittedQuery(nextQuery);
    setSubmittedLocation(nextLocation);
    document.getElementById("open-roles")?.scrollIntoView({ behavior: "smooth" });
  }

  function clearSearch() {
    setQuery("");
    setLocation("");
    setSubmittedQuery("");
    setSubmittedLocation("");
    setPage(1);
  }

  return (
    <>
      <HeroSection
        query={submittedQuery}
        location={submittedLocation}
        popularSearches={popularSearches}
        totalJobsPosted={totalJobsPosted}
        onQueryChange={setQuery}
        onLocationChange={setLocation}
        onSearch={applySearch}
      />
      <HomeStatsSection
        activeJobs={activeJobCount}
        companies={companyCount}
        remoteJobs={remoteCount}
        jobTypes={jobTypeCount}
        loading={loading}
      />
      <FeaturedJobsSection
        jobs={jobs}
        query={submittedQuery}
        location={submittedLocation}
        loading={loading}
        error={error}
        hasFilters={Boolean(submittedQuery || submittedLocation)}
        page={page}
        pageCount={totalPages}
        onPageChange={setPage}
        onClearFilters={clearSearch}
        onRetry={() => setReloadKey((key) => key + 1)}
      />
    </>
  );
}
