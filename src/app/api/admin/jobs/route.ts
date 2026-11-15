import { isAdminJobsList, isRecord } from '@/lib/admin-job-contract';
import { proxyAdminJobRequest } from '@/lib/admin-job-proxy';
import { NextResponse } from 'next/server';

const pageSizes = new Set(['10', '20', '50']);
const statuses = new Set(['all', 'active', 'closed', 'draft', 'expired']);
const sortFields = new Set([
  'title',
  'company',
  'recruiter',
  'category',
  'location',
  'type',
  'status',
  'createdAt',
  'deadline',
  'applications',
]);
const allowedParams = [
  'page',
  'pageSize',
  'search',
  'status',
  'category',
  'location',
  'type',
  'recruiter',
  'sortBy',
  'sortDirection',
] as const;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  for (const key of allowedParams) {
    if (params.getAll(key).length > 1) {
      return NextResponse.json({ error: `Provide only one ${key} value.` }, { status: 400 });
    }
  }

  const page = params.get('page') ?? '1';
  const pageSize = params.get('pageSize') ?? '10';
  const search = params.get('search') ?? '';
  const status = params.get('status') ?? 'all';
  const category = params.get('category') ?? '';
  const location = params.get('location') ?? '';
  const type = params.get('type') ?? '';
  const recruiter = params.get('recruiter') ?? '';
  const sortBy = params.get('sortBy') ?? 'createdAt';
  const sortDirection = params.get('sortDirection') ?? 'desc';

  if (
    !/^[1-9]\d*$/.test(page) ||
    !Number.isSafeInteger(Number(page)) ||
    !pageSizes.has(pageSize) ||
    search.length > 120 ||
    category.length > 120 ||
    location.length > 120 ||
    type.length > 120 ||
    recruiter.length > 160 ||
    !statuses.has(status.toLowerCase()) ||
    !sortFields.has(sortBy) ||
    !['asc', 'desc'].includes(sortDirection) ||
    (Number(page) - 1) * Number(pageSize) > Number.MAX_SAFE_INTEGER
  ) {
    return NextResponse.json({ error: 'Invalid job list filters.' }, { status: 400 });
  }

  const query = new URLSearchParams({
    page,
    pageSize,
    status: status.toLowerCase(),
    sortBy,
    sortDirection,
  });
  for (const [key, value] of Object.entries({ search, category, location, type, recruiter })) {
    if (value.trim()) query.set(key, value.trim());
  }

  const result = await proxyAdminJobRequest(`/admin/jobs?${query}`, 'GET');
  if (result.response) return result.response;
  if (
    !isAdminJobsList(result.data) ||
    result.data.pagination.page !== Number(page) ||
    result.data.pagination.pageSize !== Number(pageSize) ||
    result.data.summary.totalJobs < 0 ||
    result.data.summary.activeJobs < 0 ||
    result.data.summary.closedJobs < 0 ||
    result.data.summary.totalApplications < 0 ||
    result.data.jobs.some((job) => job.applicationCount < 0) ||
    !isRecord(result.data.pagination) ||
    result.data.pagination.total < 0 ||
    result.data.pagination.totalPages < 1
  ) {
    console.error('Admin jobs backend returned an invalid list response');
    return NextResponse.json({ error: 'The job list response was invalid.' }, { status: 502 });
  }
  return NextResponse.json(result.data);
}
