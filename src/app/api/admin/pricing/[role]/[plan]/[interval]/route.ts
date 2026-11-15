import { isRecord } from '@/lib/admin-settings-contract';
import { proxyAdminPricingRequest } from '@/lib/admin-pricing-proxy';
import { NextResponse } from 'next/server';

const roles = new Set(['seeker', 'recruiter']);
const plans = new Set(['Starter', 'Growth', 'Premium']);
const intervals = new Set(['month', 'year']);

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ role: string; plan: string; interval: string }> },
) {
  const { role, plan, interval } = await params;
  if (!roles.has(role) || !plans.has(plan) || !intervals.has(interval)) {
    return NextResponse.json({ error: 'Choose a valid plan and billing interval.' }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Pricing changes must be valid JSON.' }, { status: 400 });
  }
  if (!isRecord(body) || Object.keys(body).some((key) => !['amount', 'currency', 'requestId'].includes(key)) ||
      typeof body.amount !== 'number' || !Number.isFinite(body.amount) || body.amount < 0 ||
      typeof body.currency !== 'string' || typeof body.requestId !== 'string') {
    return NextResponse.json({ error: 'Provide a valid amount, currency, and request ID.' }, { status: 400 });
  }
  const result = await proxyAdminPricingRequest(
    `/admin/pricing/${encodeURIComponent(role)}/${encodeURIComponent(plan)}/${encodeURIComponent(interval)}`,
    'PUT',
    body,
  );
  if (result.response) return result.response;
  if (!isRecord(result.data) || result.data.role !== role || result.data.plan !== plan || result.data.interval !== interval || typeof result.data.stripePriceId !== 'string') {
    return NextResponse.json({ error: 'The pricing service returned an invalid response.' }, { status: 502 });
  }
  return NextResponse.json(result.data);
}
