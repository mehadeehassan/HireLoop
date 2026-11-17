import { auth } from '@/lib/auth';
import { fetchBackendWithSecret } from '@/lib/job-api';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

function isSuccessPayload(value: unknown): value is { success: true } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    value.success === true
  );
}

async function updateSavedJob(
  context: { params: Promise<{ jobId: string }> },
  method: 'PUT' | 'DELETE',
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'seeker') {
    return NextResponse.json({ error: 'Only job seekers can manage saved jobs.' }, { status: 403 });
  }

  const { jobId } = await context.params;
  if (!/^[a-f\d]{24}$/i.test(jobId)) {
    return NextResponse.json({ error: 'A valid job ID is required.' }, { status: 400 });
  }
  const apiSecret = process.env.HIRELOOP_JWT_SECRET;
  if (!apiSecret) {
    return NextResponse.json({ error: 'Saved jobs are not configured yet.' }, { status: 503 });
  }

  try {
    const { response, data } = await fetchBackendWithSecret(
      `/seeker/saved-jobs/${encodeURIComponent(jobId)}`,
      method,
      undefined,
      apiSecret,
      { id: session.user.id, role: 'seeker' },
    );
    if (!response.ok) {
      const message =
        typeof data === 'object' &&
        data !== null &&
        'message' in data &&
        typeof data.message === 'string'
          ? data.message
          : 'Could not update saved jobs.';
      return NextResponse.json(
        { error: message },
        { status: response.status === 401 || response.status === 403 || response.status === 404 || response.status === 409
          ? response.status
          : 502 },
      );
    }
    if (!isSuccessPayload(data)) {
      console.error('Saved jobs backend returned an unexpected update response');
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
    return NextResponse.json({ error: 'Could not update saved jobs.' }, { status: 502 });
  }
}

export const PUT = (
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) => updateSavedJob(context, 'PUT');

export const DELETE = (
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) => updateSavedJob(context, 'DELETE');
