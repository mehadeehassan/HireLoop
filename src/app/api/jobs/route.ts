import { fetchBackendJobs } from "@/lib/job-api";
import { getJobCreatedAt, toPublicJob, type PublicJob } from "@/lib/public-jobs";
import { addRecruiterCompanyProfile, getRecruiterCompanyProfiles } from "@/lib/recruiter-company";
import { NextResponse } from "next/server";

type BackendJob = Record<string, unknown>;

function asRecord(value: unknown): BackendJob | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as BackendJob)
    : null;
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

    const companyProfiles = await getRecruiterCompanyProfiles(jobs);
    const publicJobs = jobs
      .map((value) => {
        const job = toPublicJob(value);
        return job ? addRecruiterCompanyProfile(job, value, companyProfiles) : null;
      })
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
