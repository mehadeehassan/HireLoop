import { proxyAdminNotification } from '@/lib/admin-notifications-proxy';
import { NextResponse } from 'next/server';

export async function GET() {
  const result = await proxyAdminNotification('/admin/notifications/unread-count', 'GET');
  if (result instanceof Response) return result;
  if (result.response) return result.response;
  const value = result.data as { unreadCount?: unknown } | null;
  if (!value || !Number.isSafeInteger(value.unreadCount) || Number(value.unreadCount) < 0) return NextResponse.json({ error: 'The unread count response was invalid.' }, { status: 502 });
  return NextResponse.json(value, { headers: { 'Cache-Control': 'no-store' } });
}
