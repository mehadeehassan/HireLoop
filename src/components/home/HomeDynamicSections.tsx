"use client";

import { useEffect, useMemo, useState } from "react";
import type { PublicJob } from "@/lib/public-jobs";
import FeaturedJobsSection from "@/components/home/FeaturedJobsSection";
import HeroSection from "@/components/home/HeroSection";
import HomeStatsSection from "@/components/home/HomeStatsSection";

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
  const [newJobsThisMonth, setNewJobsThisMonth] = useState(0);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadJobs() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/jobs", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Job listings are temporarily unavailable.");
        }

        const payload: unknown = await response.json();
        const result = payload as { jobs?: unknown; newJobsThisMonth?: unknown };
        if (
          !Array.isArray(result.jobs) ||
          !result.jobs.every(isPublicJob) ||
          typeof result.newJobsThisMonth !== "number" ||
          !Number.isInteger(result.newJobsThisMonth) ||
          result.newJobsThisMonth < 0
        ) {
          throw new Error("The job service returned an unexpected response.");
        }

        setJobs(result.jobs);
        setNewJobsThisMonth(result.newJobsThisMonth);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Job listings could not be loaded. Please try again.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadJobs();
    return () => controller.abort();
  }, [reloadKey]);

  const filteredJobs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedLocation = location.trim().toLowerCase();

    return jobs.filter((job) => {
      const matchesQuery =
        !normalizedQuery ||
        [job.title, job.company, job.type, job.description]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesLocation =
        !normalizedLocation || job.location.toLowerCase().includes(normalizedLocation);
      return matchesQuery && matchesLocation;
    });
  }, [jobs, location, query]);

  const popularSearches = useMemo(
    () => [...new Set(jobs.map((job) => job.title))].slice(0, 4),
    [jobs],
  );
  const companyCount = new Set(jobs.map((job) => job.company.toLowerCase())).size;
  const remoteCount = jobs.filter((job) => job.remote).length;
  const jobTypeCount = new Set(jobs.map((job) => job.type.toLowerCase())).size;

  function applySearch() {
    document.getElementById("open-roles")?.scrollIntoView({ behavior: "smooth" });
  }

  function clearSearch() {
    setQuery("");
    setLocation("");
  }

  return (
    <>
      <HeroSection
        newJobsThisMonth={newJobsThisMonth}
        query={query}
        location={location}
        popularSearches={popularSearches}
        onQueryChange={setQuery}
        onLocationChange={setLocation}
        onSearch={applySearch}
      />
      <HomeStatsSection
        activeJobs={jobs.length}
        companies={companyCount}
        remoteJobs={remoteCount}
        jobTypes={jobTypeCount}
        loading={loading}
      />
      <FeaturedJobsSection
        jobs={filteredJobs}
        query={query}
        location={location}
        loading={loading}
        error={error}
        hasFilters={Boolean(query || location)}
        onClearFilters={clearSearch}
        onRetry={() => setReloadKey((key) => key + 1)}
      />
    </>
  );
}
