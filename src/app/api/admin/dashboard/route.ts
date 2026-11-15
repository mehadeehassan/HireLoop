import { auth } from '@/lib/auth';
import { isAccountActive } from '@/lib/admin-user-policy';
import { fetchBackendWithSecret } from '@/lib/job-api';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { timeSessionLookup, withRequestPerformance } from '@/lib/request-performance';

const allowedPeriods = new Set(['30d', '90d', 'all']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function handleGET(request: Request) {
  const requestHeaders = await headers();
  const session = await timeSessionLookup(
    'GET /api/admin/dashboard',
    () => auth.api.getSession({ headers: requestHeaders }),
  );
  if (!session?.user || !isAccountActive(session.user)) {
    return NextResponse.json({ error: 'An active session is required.' }, { status: 401 });
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can view dashboard statistics.' }, { status: 403 });
  }

  const period = new URL(request.url).searchParams.get('period') ?? '30d';
  if (!allowedPeriods.has(period)) {
    return NextResponse.json({ error: 'Choose a supported transaction period.' }, { status: 400 });
  }

  const apiSecret = process.env.HIRELOOP_JWT_SECRET;
  if (!apiSecret) {
    console.error('Admin dashboard service JWT signing secret is not configured');
    return NextResponse.json({ error: 'Admin dashboard service is not configured.' }, { status: 503 });
  }

  try {
    const { response, data } = await fetchBackendWithSecret(
      `/admin/dashboard?period=${encodeURIComponent(period)}`,
      'GET',
      undefined,
      apiSecret,
      { id: session.user.id, role: 'admin' },
    );
    if (!response.ok) {
      const message = isRecord(data) && typeof data.message === 'string'
        ? data.message
        : 'Could not load admin dashboard statistics.';
      const status = [400, 401, 403].includes(response.status) ? response.status : 502;
      console.error('Admin dashboard backend request failed', response.status);
      return NextResponse.json({ error: message }, { status });
    }

    if (!isRecord(data) || !isRecord(data.summary) || !Array.isArray(data.transactions)) {
      console.error('Admin dashboard backend returned a malformed response');
      return NextResponse.json({ error: 'The dashboard response was invalid.' }, { status: 502 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Could not connect to the admin dashboard backend', error);
    return NextResponse.json({ error: 'Could not connect to the admin dashboard service.' }, { status: 502 });
  }
}

export const GET = withRequestPerformance('GET /api/admin/dashboard', handleGET);
