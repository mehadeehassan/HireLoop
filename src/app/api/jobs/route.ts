import { fetchBackendJobs } from "@/lib/job-api";
import { getJobCreatedAt, toPublicJob, type PublicJob } from "@/lib/public-jobs";
import { NextResponse } from "next/server";
import { withRequestPerformance } from "@/lib/request-performance";

type BackendJob = Record<string, unknown>;

const allowedParams = new Set([
  'page',
  'limit',
  'search',
  'type',
  'location',
  'remote',
  'category',
  'company',
  'workMode',
  'sortBy',
  'ids',
]);
const repeatedParams = new Set(['type', 'workMode', 'ids']);
const MAX_LIMIT = 50;
const MAX_IDS = 100;

function asRecord(value: unknown): BackendJob | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as BackendJob)
    : null;
}

function validPage(value: string) {
  const parsed = Number(value);
  return /^[1-9]\d*$/.test(value) && Number.isSafeInteger(parsed) && parsed <= 1_000_000;
}

function isFilterOptions(value: unknown): value is Record<string, { value: string; count: number }[]> {
  const options = asRecord(value);
  return options !== null && Object.values(options).every((items) =>
    Array.isArray(items) && items.every((item) => {
      const option = asRecord(item);
      return option !== null &&
        typeof option.value === 'string' &&
        typeof option.count === 'number' &&
        Number.isSafeInteger(option.count) &&
        option.count >= 0;
    }),
  );
}

async function handleGET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    for (const key of params.keys()) {
      if (!allowedParams.has(key)) {
        return NextResponse.json({ error: `Unsupported job filter: ${key}.` }, { status: 400 });
      }
    }
    for (const key of allowedParams) {
      if (!repeatedParams.has(key) && params.getAll(key).length > 1) {
        return NextResponse.json({ error: `Provide only one ${key} value.` }, { status: 400 });
      }
    }

    const page = params.get('page') ?? '1';
    const limit = params.get('limit') ?? '50';
    const search = params.get('search') ?? '';
    const remote = params.get('remote');
    const sortBy = params.get('sortBy') ?? 'recent';
    const filterValues = ['location', 'category', 'company'] as const;
    const ids = params.getAll('ids');
    if (
      !validPage(page) ||
      !/^[1-9]\d*$/.test(limit) ||
      !Number.isSafeInteger(Number(limit)) ||
      Number(limit) > MAX_LIMIT ||
      search.length > 120 ||
      filterValues.some((key) => (params.get(key)?.length ?? 0) > 120) ||
      params.getAll('type').length > 20 ||
      params.getAll('workMode').length > 20 ||
      [...params.getAll('type'), ...params.getAll('workMode')].some((value) => !value.trim() || value.length > 120) ||
      params.getAll('workMode').some((value) => !['Remote', 'Hybrid', 'On-site'].includes(value)) ||
      (remote !== null && remote !== 'true' && remote !== 'false') ||
      !['recent', 'title'].includes(sortBy) ||
      ids.length > MAX_IDS ||
      ids.some((id) => !id.trim() || id.length > 120) ||
      (ids.length > 0 && [...params.keys()].some((key) => key !== 'ids'))
    ) {
      return NextResponse.json({ error: 'Invalid job list filters.' }, { status: 400 });
    }
    const query = params.toString();
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
      .map((value) => toPublicJob(value))
      .filter((job): job is PublicJob => job !== null);
    const backendMonthlyCount = payload?.newJobsThisMonth;
    const now = new Date();
    const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
    const nextMonthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
    const newJobsThisMonth = Number.isSafeInteger(backendMonthlyCount) && Number(backendMonthlyCount) >= 0
      ? Number(backendMonthlyCount)
      : jobs.filter((value) => {
      const job = asRecord(value);
      if (!job || !toPublicJob(job)) return false;

      const createdAt = getJobCreatedAt(job)?.getTime();
      return createdAt !== undefined && createdAt >= monthStart && createdAt < nextMonthStart;
      }).length;

    return NextResponse.json({
      jobs: publicJobs,
      newJobsThisMonth,
      ...(payload?.pagination && typeof payload.pagination === 'object'
        ? { pagination: payload.pagination }
        : {}),
      ...(isFilterOptions(payload?.filterOptions)
        ? { filterOptions: payload.filterOptions }
        : {}),
    } satisfies { jobs: PublicJob[]; newJobsThisMonth: number });
  } catch (error) {
    console.error("Could not load public job listings", error);
    return NextResponse.json({ error: "Job listings are temporarily unavailable." }, { status: 502 });
  }
}

export const GET = withRequestPerformance('GET /api/jobs', handleGET);
