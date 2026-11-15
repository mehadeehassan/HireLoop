import { isRecord } from '@/lib/admin-settings-contract';
import { proxyAdminSettingsRequest } from '@/lib/admin-settings-proxy';
import { NextResponse } from 'next/server';

const roles = new Set(['seeker', 'recruiter']);
const plans = new Set(['Growth', 'Premium']);

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Plan limit must be valid JSON.' }, { status: 400 });
  }
  if (!isRecord(body)) {
    return NextResponse.json({ error: 'Plan limit must be a JSON object.' }, { status: 400 });
  }
  const allowed = new Set(['role', 'plan', 'monthlyLimit']);
  for (const key of Object.keys(body)) {
    if (!allowed.has(key)) {
      return NextResponse.json(
        { error: `Unknown plan limit field: ${key}` },
        { status: 400 },
      );
    }
  }
  const { role, plan, monthlyLimit } = body;
  if (
    typeof role !== 'string' ||
    !roles.has(role) ||
    typeof plan !== 'string' ||
    !plans.has(plan) ||
    typeof monthlyLimit !== 'number' ||
    !Number.isInteger(monthlyLimit) ||
    monthlyLimit <= 5 ||
    monthlyLimit > 100000
  ) {
    return NextResponse.json(
      { error: 'Provide a valid role, paid plan, and monthly limit between 6 and 100000.' },
      { status: 400 },
    );
  }

  const result = await proxyAdminSettingsRequest(
    `/subscription-plans/${encodeURIComponent(role)}/${encodeURIComponent(plan)}`,
    'PUT',
    { monthlyLimit },
  );
  if (result.response) return result.response;
  if (
    !isRecord(result.data) ||
    result.data.role !== role ||
    result.data.plan !== plan ||
    result.data.monthlyLimit !== monthlyLimit
  ) {
    console.error('Admin plan limit backend returned an invalid response');
    return NextResponse.json(
      { error: 'The plan limit response was invalid.' },
      { status: 502 },
    );
  }
  return NextResponse.json(result.data);
}
