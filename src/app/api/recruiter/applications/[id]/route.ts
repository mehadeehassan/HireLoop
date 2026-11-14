import { auth } from '@/lib/auth';
import { fetchBackendWithSecret } from '@/lib/job-api';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { applicationStatuses } from '@/lib/application-status';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Only recruiters can update application status.' }, { status: 403 });
  }

  const { id } = await params;
  if (!/^[\da-f]{24}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid application id' }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Status update must be valid JSON.' }, { status: 400 });
  }
  const status =
    typeof payload === 'object' && payload !== null && 'status' in payload
      ? payload.status
      : undefined;
  if (
    typeof status !== 'string' ||
    !applicationStatuses.some((applicationStatus) => applicationStatus === status)
  ) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const apiSecret = process.env.HIRELOOP_JWT_SECRET;
  if (!apiSecret) {
    console.error('Application backend JWT signing secret is not configured');
    return NextResponse.json(
      { error: 'Application updates are not configured.' },
      { status: 503 },
    );
  }

  try {
    const { response, data } = await fetchBackendWithSecret(
      `/recruiter/applications/${encodeURIComponent(id)}`,
      'PATCH',
      { recruiterId: session.user.id, status },
      apiSecret,
    );
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 });
      }
      console.error('Application backend status update failed', response.status);
      const backendError =
        typeof data === 'object' &&
        data !== null &&
        'message' in data &&
        typeof data.message === 'string'
          ? data.message
          : 'Could not sync this status to the application service.';
      return NextResponse.json({ error: backendError }, { status: 502 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Could not sync application status to backend', error);
    return NextResponse.json(
      { error: 'Could not connect to the application service.' },
      { status: 502 },
    );
  }
}
