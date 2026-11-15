import 'server-only';

import { getActiveAdminSession, isAdminSessionResponse } from '@/lib/admin-server-auth';
import { fetchBackendWithSecret } from '@/lib/job-api';
import { NextResponse } from 'next/server';

export async function proxyAdminNotification(path: string, method: 'GET' | 'POST' | 'PATCH', body?: Record<string, unknown>) {
  const session = await getActiveAdminSession();
  if (isAdminSessionResponse(session)) return session;
  const secret = process.env.HIRELOOP_JWT_SECRET;
  if (!secret) return NextResponse.json({ error: 'The notification service is not configured.' }, { status: 503 });
  try {
    const result = await fetchBackendWithSecret(path, method, body, secret, { id: session.actorId, role: 'admin' });
    if (!result.response.ok) return NextResponse.json(result.data || { error: 'Could not complete notification request.' }, { status: result.response.status });
    return { response: null, data: result.data as unknown };
  } catch (error) {
    console.error('Admin notification backend request failed', error);
    return NextResponse.json({ error: 'Could not connect to the notification service.' }, { status: 502 });
  }
}
