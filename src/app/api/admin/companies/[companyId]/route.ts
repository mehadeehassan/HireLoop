import { getActiveAdminSession, isAdminSessionResponse } from '@/lib/admin-server-auth';
import { fetchBackendWithSecret } from '@/lib/job-api';
import { NextResponse } from 'next/server';

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
type RelatedJob = {
  id: string;
  title: string;
  status: string | null;
  location: string | null;
  createdAt: string | null;
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

function getErrorMessage(data: unknown, fallback: string) {
  return isRecord(data) && typeof data.message === 'string' ? data.message : fallback;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ companyId: string }> },
) {
  const sessionContext = await getActiveAdminSession();
  if (isAdminSessionResponse(sessionContext)) return sessionContext;

  const { companyId } = await params;
  if (
    companyId.length > 256 ||
    !/^[A-Za-z0-9_-]+$/.test(companyId)
  ) {
    return NextResponse.json({ error: 'A valid company ID is required.' }, { status: 400 });
  }

  const apiSecret = process.env.HIRELOOP_JWT_SECRET;
  if (!apiSecret) {
    console.error('Admin companies service JWT signing secret is not configured');
    return NextResponse.json({ error: 'Company service is not configured.' }, { status: 503 });
  }

  try {
    const { response, data } = await fetchBackendWithSecret(
      `/admin/companies/${encodeURIComponent(companyId)}`,
      'GET',
      undefined,
      apiSecret,
      { id: sessionContext.actorId, role: 'admin' },
    );
    if (!response.ok) {
      const status = [400, 401, 403, 404].includes(response.status) ? response.status : 502;
      console.error('Admin company details backend request failed', response.status);
      return NextResponse.json(
        { error: getErrorMessage(data, 'Could not load company details.') },
        { status },
      );
    }

    if (
      !isRecord(data) ||
      !isCompany(data.company) ||
      !Array.isArray(data.jobs) ||
      !data.jobs.every(isRelatedJob) ||
      data.jobsPageSize !== 20
    ) {
      console.error('Admin company backend returned an invalid details response');
      return NextResponse.json({ error: 'The company details response was invalid.' }, { status: 502 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Could not connect to admin company details backend', error);
    return NextResponse.json({ error: 'Could not connect to the company service.' }, { status: 502 });
  }
}
