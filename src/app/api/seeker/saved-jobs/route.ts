import { auth } from '@/lib/auth';
import { fetchBackendWithSecret } from '@/lib/job-api';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'seeker') {
    return NextResponse.json({ error: 'Only job seekers can view saved jobs.' }, { status: 403 });
  }

  const apiSecret = process.env.HIRELOOP_JWT_SECRET;
  if (!apiSecret) {
    return NextResponse.json({ error: 'Saved jobs are not configured yet.' }, { status: 503 });
  }

  const requestUrl = new URL(request.url);
  const page = requestUrl.searchParams.get('page') || '1';
  const limit = requestUrl.searchParams.get('limit') || '100';
  try {
    const query = new URLSearchParams({ page, limit });
    const { response, data } = await fetchBackendWithSecret(
      `/seeker/saved-jobs?${query}`,
      'GET',
      undefined,
      apiSecret,
      { id: session.user.id, role: 'seeker' },
    );
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Could not load saved jobs.' },
        { status: response.status === 401 || response.status === 403 ? response.status : 502 },
      );
    }

    if (
      !isRecord(data) ||
      !Array.isArray(data.savedJobs) ||
      !isRecord(data.pagination) ||
      !Number.isInteger(data.pagination.page) ||
      !Number.isInteger(data.pagination.limit) ||
      !Number.isInteger(data.pagination.total) ||
      !Number.isInteger(data.pagination.totalPages) ||
      !data.savedJobs.every(
        (savedJob) =>
          isRecord(savedJob) &&
          typeof savedJob.jobId === 'string' &&
          typeof savedJob.createdAt === 'string',
      )
    ) {
      console.error('Saved jobs backend returned an unexpected response');
      return NextResponse.json(
        { error: 'The saved jobs service returned an unexpected response.' },
        { status: 502 },
      );
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Could not connect to saved jobs service', error);
    return NextResponse.json({ error: 'Could not load saved jobs.' }, { status: 502 });
  }
}
