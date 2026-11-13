import { auth } from '@/lib/auth';
import { fetchBackendUsage } from '@/lib/job-api';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'seeker') {
    return NextResponse.json(
      { error: 'Only job seekers can view application usage.' },
      { status: 403 },
    );
  }

  const apiSecret = process.env.HIRELOOP_JWT_SECRET;
  if (!apiSecret) {
    console.error('Application backend JWT signing secret is not configured');
    return NextResponse.json({ error: 'Application service is not configured.' }, { status: 503 });
  }

  try {
    const { response, data } = await fetchBackendUsage('seeker', session.user.id, apiSecret);
    if (!response.ok) {
      console.error('Seeker application usage request failed', response.status);
      return NextResponse.json(
        { error: 'Could not load your monthly application usage.', backendStatus: response.status },
        { status: response.status === 401 || response.status === 403 ? response.status : 502 },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Could not load seeker application usage', error);
    return NextResponse.json(
      { error: 'Could not connect to the application service.' },
      { status: 502 },
    );
  }
}
