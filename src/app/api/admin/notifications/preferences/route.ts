import { isAdminNotificationPreferences } from '@/lib/admin-notifications-contract';
import { proxyAdminNotification } from '@/lib/admin-notifications-proxy';
import { NextResponse } from 'next/server';

export async function GET() {
  const result = await proxyAdminNotification('/admin/notifications/preferences', 'GET');
  if (result instanceof Response) return result;
  if (result.response) return result.response;
  if (!isAdminNotificationPreferences(result.data)) return NextResponse.json({ error: 'The preferences response was invalid.' }, { status: 502 });
  return NextResponse.json(result.data, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Preferences must be valid JSON.' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Preferences must be an object.' }, { status: 400 });
  const result = await proxyAdminNotification('/admin/notifications/preferences', 'PATCH', body as Record<string, unknown>);
  if (result instanceof Response) return result;
  if (result.response) return result.response;
  if (!isAdminNotificationPreferences(result.data)) return NextResponse.json({ error: 'The preferences response was invalid.' }, { status: 502 });
  return NextResponse.json(result.data);
}
