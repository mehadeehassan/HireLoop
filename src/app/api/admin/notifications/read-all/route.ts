import { proxyAdminNotification } from '@/lib/admin-notifications-proxy';
import { NextResponse } from 'next/server';

export async function POST() {
  const result = await proxyAdminNotification('/admin/notifications/read-all', 'POST', {});
  if (result instanceof Response) return result;
  if (result.response) return result.response;
  if (!result.data || typeof result.data !== 'object' || (result.data as { read?: unknown }).read !== true) return NextResponse.json({ error: 'The read update response was invalid.' }, { status: 502 });
  return NextResponse.json(result.data);
}
