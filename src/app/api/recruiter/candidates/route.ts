import { auth } from '@/lib/auth';
import { fetchBackendWithSecret } from '@/lib/job-api';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

type Candidate = { id: string; name: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCandidate(value: unknown): value is Candidate {
  return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string';
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Only recruiters can search seekers.' }, { status: 403 });
  }

  const apiSecret = process.env.HIRELOOP_JWT_SECRET;
  if (!apiSecret) {
    console.error('Recruiter candidate-search JWT signing secret is not configured');
    return NextResponse.json({ error: 'Candidate search is not configured.' }, { status: 503 });
  }

  const search = new URL(request.url).searchParams.get('q') || '';
  const query = new URLSearchParams({
    recruiterId: session.user.id,
    q: search,
  }).toString();

  try {
    const { response, data } = await fetchBackendWithSecret(
      `/recruiter/candidates?${query}`,
      'GET',
      undefined,
      apiSecret,
    );
    if (!response.ok) {
      const error = isRecord(data) && typeof data.message === 'string'
        ? data.message
        : 'Could not search seekers.';
      return NextResponse.json(
        { error },
        { status: response.status === 400 || response.status === 403 ? response.status : 502 },
      );
    }

    if (!isRecord(data) || !Array.isArray(data.candidates)) {
      console.error('Recruiter candidate-search backend returned an invalid response shape');
      return NextResponse.json({ error: 'Could not search seekers.' }, { status: 502 });
    }

    if (
      !data.candidates.every(isCandidate)
    ) {
      console.error('Recruiter candidate-search backend returned malformed candidates');
      return NextResponse.json({ error: 'Could not search seekers.' }, { status: 502 });
    }

    const candidates = data.candidates.map(({ id, name }) => ({ id, name }));

    return NextResponse.json({ candidates });
  } catch (error) {
    console.error('Could not search seekers through backend', error);
    return NextResponse.json({ error: 'Could not search seekers.' }, { status: 502 });
  }
}
