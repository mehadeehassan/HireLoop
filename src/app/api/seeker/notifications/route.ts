import { auth } from '@/lib/auth';
import { fetchBackendWithSecret } from '@/lib/job-api';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'seeker') {
    return NextResponse.json({ error: 'Only job seekers can view notifications.' }, { status: 403 });
  }

  const apiSecret = process.env.HIRELOOP_JWT_SECRET;
  if (!apiSecret) {
    return NextResponse.json({ error: 'Notifications are not configured yet.' }, { status: 503 });
  }

  try {
    const query = new URLSearchParams({ candidateId: session.user.id }).toString();
    const { response, data } = await fetchBackendWithSecret(
      `/notifications?${query}`,
      'GET',
      undefined,
      apiSecret,
    );
    if (!response.ok) {
      console.error('Notification backend request failed', response.status);
      return NextResponse.json(
        {
          error:
            response.status === 404
              ? 'The backend is missing GET /notifications?candidateId=....'
              : 'Could not load notifications.',
        },
        { status: response.status === 404 ? 503 : 502 },
      );
    }

    const records = isRecord(data) && Array.isArray(data.notifications) ? data.notifications : null;
    if (!records) {
      console.error('Notification backend returned an unexpected response');
      return NextResponse.json(
        { error: 'The notification service returned an unexpected response.' },
        { status: 502 },
      );
    }
    const notifications = records
      .filter(
        (notification): notification is Record<string, unknown> =>
          isRecord(notification) &&
          typeof notification.id === 'string' &&
          typeof notification.jobTitle === 'string' &&
          typeof notification.company === 'string' &&
          typeof notification.status === 'string',
      )
      .map((notification) => ({
        id: notification.id,
        jobId: typeof notification.jobId === 'string' ? notification.jobId : '',
        jobTitle: notification.jobTitle,
        company: notification.company,
        status: notification.status,
        createdAt:
          typeof notification.createdAt === 'string'
            ? notification.createdAt
            : notification.createdAt instanceof Date
              ? notification.createdAt.toISOString()
              : '',
        updatedAt:
          typeof notification.createdAt === 'string'
            ? notification.createdAt
            : notification.createdAt instanceof Date
              ? notification.createdAt.toISOString()
              : '',
      }));

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Could not load seeker notifications', error);
    return NextResponse.json(
      { error: 'Could not connect to the notification service.' },
      { status: 502 },
    );
  }
}
