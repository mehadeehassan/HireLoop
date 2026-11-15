import { getActiveAdminSession, isAdminSessionResponse } from '@/lib/admin-server-auth';
import { fetchBackendWithSecret } from '@/lib/job-api';
import { NextResponse } from 'next/server';

const pageSizes = new Set(['10', '20', '50']);
const creatorRoles = new Set(['all', 'seeker', 'recruiter']);
const sortFields = new Set(['name', 'industry', 'location', 'createdAt', 'jobs']);
const allowedParams = [
  'page',
  'pageSize',
  'search',
  'industry',
  'location',
  'creatorRole',
  'sortBy',
  'sortDirection',
] as const;

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
  createdByRole: string;
  creatorCount: number;
  submitters: Array<{ userId: string; name: string | null; role: 'seeker' | 'recruiter' }>;
  jobCount: number;
  locations: string[];
  createdAt: string | null;
  updatedAt: string | null;
};

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
    value.creatorCount >= 0 &&
    typeof value.jobCount === 'number' &&
    Number.isSafeInteger(value.jobCount) &&
    value.jobCount >= 0 &&
    Array.isArray(value.locations) &&
    value.locations.every((location) => typeof location === 'string') &&
    (value.createdAt === null || typeof value.createdAt === 'string') &&
    (value.updatedAt === null || typeof value.updatedAt === 'string')
  );
}

function getErrorMessage(data: unknown, fallback: string) {
  return isRecord(data) && typeof data.message === 'string' ? data.message : fallback;
}

export async function GET(request: Request) {
  const sessionContext = await getActiveAdminSession();
  if (isAdminSessionResponse(sessionContext)) return sessionContext;

  const params = new URL(request.url).searchParams;
  for (const key of allowedParams) {
    if (params.getAll(key).length > 1) {
      return NextResponse.json({ error: `Provide only one ${key} value.` }, { status: 400 });
    }
  }

  const page = params.get('page') ?? '1';
  const pageSize = params.get('pageSize') ?? '10';
  const search = params.get('search') ?? '';
  const industry = params.get('industry') ?? '';
  const location = params.get('location') ?? '';
  const creatorRole = params.get('creatorRole') ?? 'all';
  const sortBy = params.get('sortBy') ?? 'createdAt';
  const sortDirection = params.get('sortDirection') ?? 'desc';

  if (
    !/^[1-9]\d*$/.test(page) ||
    !Number.isSafeInteger(Number(page)) ||
    !pageSizes.has(pageSize) ||
    search.length > 120 ||
    industry.length > 120 ||
    location.length > 120 ||
    !creatorRoles.has(creatorRole) ||
    !sortFields.has(sortBy) ||
    !['asc', 'desc'].includes(sortDirection)
  ) {
    return NextResponse.json({ error: 'Invalid company list filters.' }, { status: 400 });
  }

  const apiSecret = process.env.HIRELOOP_JWT_SECRET;
  if (!apiSecret) {
    console.error('Admin companies service JWT signing secret is not configured');
    return NextResponse.json({ error: 'Company service is not configured.' }, { status: 503 });
  }

  const query = new URLSearchParams({
    page,
    pageSize,
    creatorRole,
    sortBy,
    sortDirection,
  });
  if (search.trim()) query.set('search', search.trim());
  if (industry.trim()) query.set('industry', industry.trim());
  if (location.trim()) query.set('location', location.trim());

  try {
    const { response, data } = await fetchBackendWithSecret(
      `/admin/companies?${query.toString()}`,
      'GET',
      undefined,
      apiSecret,
      { id: sessionContext.actorId, role: 'admin' },
    );
    if (!response.ok) {
      const status = [400, 401, 403].includes(response.status) ? response.status : 502;
      console.error('Admin companies backend request failed', response.status);
      return NextResponse.json(
        { error: getErrorMessage(data, 'Could not load companies.') },
        { status },
      );
    }

    if (
      !isRecord(data) ||
      !Array.isArray(data.companies) ||
      !data.companies.every(isCompany) ||
      !isRecord(data.pagination) ||
      data.pagination.page !== Number(page) ||
      data.pagination.pageSize !== Number(pageSize) ||
      typeof data.pagination.total !== 'number' ||
      !Number.isSafeInteger(data.pagination.total) ||
      data.pagination.total < 0 ||
      typeof data.pagination.totalPages !== 'number' ||
      !Number.isSafeInteger(data.pagination.totalPages) ||
      data.pagination.totalPages < 0
    ) {
      console.error('Admin companies backend returned an invalid list response');
      return NextResponse.json({ error: 'The company list response was invalid.' }, { status: 502 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Could not connect to the admin companies backend', error);
    return NextResponse.json({ error: 'Could not connect to the company service.' }, { status: 502 });
  }
}
