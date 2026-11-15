import { isAdminSettings, isRecord } from '@/lib/admin-settings-contract';
import { proxyAdminSettingsRequest } from '@/lib/admin-settings-proxy';
import { NextResponse } from 'next/server';
import { withRequestPerformance } from '@/lib/request-performance';

async function handleGET() {
  const result = await proxyAdminSettingsRequest('/admin/settings', 'GET');
  if (result.response) return result.response;
  if (!isAdminSettings(result.data)) {
    console.error('Admin settings backend returned an invalid response');
    return NextResponse.json(
      { error: 'The settings response was invalid.' },
      { status: 502 },
    );
  }
  return NextResponse.json(result.data);
}

export const GET = withRequestPerformance('GET /api/admin/settings', handleGET);

export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Settings must be valid JSON.' }, { status: 400 });
  }
  if (!isRecord(body)) {
    return NextResponse.json({ error: 'Settings must be a JSON object.' }, { status: 400 });
  }
  const allowedSections = new Set(['branding', 'controls']);
  for (const key of Object.keys(body)) {
    if (!allowedSections.has(key)) {
      return NextResponse.json(
        { error: `Unknown settings section: ${key}` },
        { status: 400 },
      );
    }
  }
  if (Object.keys(body).length === 0) {
    return NextResponse.json(
      { error: 'Provide at least one settings section.' },
      { status: 400 },
    );
  }
  for (const key of Object.keys(body)) {
    if (!isRecord(body[key])) {
      return NextResponse.json(
        { error: `${key} settings must be an object.` },
        { status: 400 },
      );
    }
  }

  const result = await proxyAdminSettingsRequest('/admin/settings', 'PATCH', body);
  if (result.response) return result.response;
  if (!isAdminSettings(result.data)) {
    console.error('Admin settings backend returned an invalid update response');
    return NextResponse.json(
      { error: 'The settings update response was invalid.' },
      { status: 502 },
    );
  }
  return NextResponse.json(result.data);
}
