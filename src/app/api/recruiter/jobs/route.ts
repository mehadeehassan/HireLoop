import { auth } from '@/lib/auth';
import { fetchBackendJobs, fetchBackendWithSecret } from '@/lib/job-api';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Only recruiters can view recruiter jobs.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 6));
  const apiSecret = process.env.HIRELOOP_JWT_SECRET;
  if (!apiSecret) {
    console.error('Job backend JWT signing secret is not configured');
    return NextResponse.json({ error: 'Job service is not configured.' }, { status: 503 });
  }

  try {
    const query = new URLSearchParams({
      recruiterId: session.user.id,
      page: String(page),
      limit: String(limit),
    }).toString();
    const { response, data } = await fetchBackendWithSecret(
      `/recruiter/jobs?${query}`,
      'GET',
      undefined,
      apiSecret,
    );
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Could not load jobs from backend' },
        { status: response.status === 403 ? 403 : 502 },
      );
    }
    if (!isRecord(data) || !Array.isArray(data.jobs) || !isRecord(data.pagination)) {
      console.error('Recruiter jobs backend returned an invalid response shape');
      return NextResponse.json({ error: 'Could not load jobs from backend' }, { status: 502 });
    }

    return NextResponse.json({ jobs: data.jobs, pagination: data.pagination });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown backend error';
    return NextResponse.json(
      { error: 'Could not connect to job backend', details: message },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Only recruiters can publish jobs.' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    const value: unknown = await request.json();
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return NextResponse.json({ error: 'Job details must be a JSON object.' }, { status: 400 });
    }
    body = value as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Job details must be valid JSON.' }, { status: 400 });
  }

  const apiSecret = process.env.HIRELOOP_JWT_SECRET;
  if (!apiSecret) {
    console.error('Job backend JWT signing secret is not configured');
    return NextResponse.json({ error: 'Job service is not configured.' }, { status: 503 });
  }

  try {
    const { response, data } = await fetchBackendJobs('POST', {
      apiSecret,
      body: {
        ...body,
        recruiterId: session.user.id,
        company: body.company || session.user.name || '',
        status: body.status || 'Active',
        applicants: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    if (!response.ok) {
      if (response.status === 429) return NextResponse.json(data, { status: 429 });
      return NextResponse.json(
        { error: 'Backend job creation failed', details: data },
        { status: response.status },
      );
    }

    const result =
      typeof data === 'object' && data !== null
        ? (data as { insertedId?: string | { toString?: () => string } })
        : null;
    return NextResponse.json(
      { id: result?.insertedId?.toString?.() || result?.insertedId || null },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown backend error';
    return NextResponse.json(
      { error: 'Could not connect to job backend', details: message },
      { status: 502 },
    );
  }
}
