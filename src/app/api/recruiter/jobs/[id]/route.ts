import { auth } from '@/lib/auth';
import { fetchBackendJobs } from '@/lib/job-api';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

async function authenticatedJob() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user)
    return {
      session: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  if (session.user.role !== 'recruiter')
    return {
      session: null,
      response: NextResponse.json({ error: 'Only recruiters can manage jobs.' }, { status: 403 }),
    };
  return { session, response: null };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, response } = await authenticatedJob();
  if (response) return response;
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiSecret = process.env.HIRELOOP_APPLICATIONS_API_SECRET;
  if (!apiSecret && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Job service is not configured.' }, { status: 503 });
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

  try {
    const { response, data } = await fetchBackendJobs('PATCH', {
      id,
      apiSecret,
      body: { ...body, recruiterId: session.user.id, updatedAt: new Date() },
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Job update failed', details: data },
        { status: response.status },
      );
    }
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown backend error';
    return NextResponse.json({ error: 'Could not update job', details }, { status: 502 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, response } = await authenticatedJob();
  if (response) return response;
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiSecret = process.env.HIRELOOP_APPLICATIONS_API_SECRET;
  if (!apiSecret && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Job service is not configured.' }, { status: 503 });
  }
  try {
    const { response, data } = await fetchBackendJobs('DELETE', {
      id,
      apiSecret,
      body: { recruiterId: session.user.id },
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Job delete failed', details: data },
        { status: response.status },
      );
    }
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown backend error';
    return NextResponse.json({ error: 'Could not delete job', details }, { status: 502 });
  }
  return NextResponse.json({ success: true });
}
