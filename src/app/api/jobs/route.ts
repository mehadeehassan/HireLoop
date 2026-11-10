import { fetchBackendJobs } from "@/lib/job-api";
import type { PublicJob } from "@/lib/public-jobs";
import { NextResponse } from "next/server";

type BackendJob = Record<string, unknown>;

function asRecord(value: unknown): BackendJob | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as BackendJob)
    : null;
}

function getString(...values: unknown[]): string {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim() ?? "";
}

function getSafeApplyUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function getJobCreatedAt(job: BackendJob): Date | null {
  const createdAt = job.createdAt;
  if (typeof createdAt === "string" || typeof createdAt === "number") {
    const date = new Date(createdAt);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const id = getString(job._id, job.id);
  if (/^[\da-f]{24}$/i.test(id)) {
    return new Date(Number.parseInt(id.slice(0, 8), 16) * 1000);
  }

  return null;
}

function toPublicJob(value: unknown): PublicJob | null {
  const job = asRecord(value);
  if (!job) return null;

  const status = getString(job.status).toLowerCase();
  const isPublished = status === "active" || job.isActive === true;
  const id = getString(job.id, job._id);
  const title = getString(job.title);
  if (!isPublished || !id || !title) return null;

  const location = getString(job.location);
  const workMode = /hybrid/i.test(location)
    ? "Hybrid"
    : job.remote === true || job.isRemote === true || /remote/i.test(location)
      ? "Remote"
      : "On-site";

  return {
    id,
    title,
    company: getString(job.company) || "Confidential company",
    location: location || (workMode === "Remote" ? "Remote" : "Location not specified"),
    type: getString(job.type, job.employmentType) || "Employment type not specified",
    workMode,
    compensation: getString(job.compensation, job.salaryRange, job.salary) || "Compensation not listed",
    description:
      getString(job.description, job.summary, job.responsibility, job.qualifications) ||
      "Explore this opportunity and see how your experience can make an impact.",
    remote: workMode === "Remote",
    applyUrl: getSafeApplyUrl(job.applyUrl ?? job.applicationUrl),
  };
}

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams.toString();
    const { response, data } = await fetchBackendJobs("GET", { query });
    if (!response.ok) {
      console.error("Public job listing backend returned an unsuccessful response", response.status);
      return NextResponse.json({ error: "Job listings are temporarily unavailable." }, { status: 502 });
    }

    const payload = asRecord(data);
    const jobs = Array.isArray(data)
      ? data
      : payload && Array.isArray(payload.jobs)
        ? payload.jobs
        : null;

    if (!jobs) {
      console.error("Public job listing backend returned an invalid response shape");
      return NextResponse.json({ error: "Job listings are temporarily unavailable." }, { status: 502 });
    }

    const publicJobs = jobs
      .map(toPublicJob)
      .filter((job): job is PublicJob => job !== null);
    const now = new Date();
    const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
    const nextMonthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
    const newJobsThisMonth = jobs.filter((value) => {
      const job = asRecord(value);
      if (!job || !toPublicJob(job)) return false;

      const createdAt = getJobCreatedAt(job)?.getTime();
      return createdAt !== undefined && createdAt >= monthStart && createdAt < nextMonthStart;
    }).length;

    return NextResponse.json({
      jobs: publicJobs,
      newJobsThisMonth,
    } satisfies { jobs: PublicJob[]; newJobsThisMonth: number });
  } catch (error) {
    console.error("Could not load public job listings", error);
    return NextResponse.json({ error: "Job listings are temporarily unavailable." }, { status: 502 });
  }
}
