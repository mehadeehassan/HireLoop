import { isAdminNotificationList } from '@/lib/admin-notifications-contract';
import { proxyAdminNotification } from '@/lib/admin-notifications-proxy';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const params = new URLSearchParams();
  for (const key of ['limit', 'cursor', 'unread', 'type']) {
    const value = query.get(key);
    if (value) params.set(key, value);
  }
  const result = await proxyAdminNotification(`/admin/notifications?${params}`, 'GET');
  if (result instanceof Response) return result;
  if (result.response) return result.response;
  if (!isAdminNotificationList(result.data)) return NextResponse.json({ error: 'The notification response was invalid.' }, { status: 502 });
  return NextResponse.json(result.data, { headers: { 'Cache-Control': 'no-store' } });
}
