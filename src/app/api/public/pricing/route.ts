import { NextResponse } from 'next/server';
import { fetchBackendWithSecret, type ServiceActor } from '@/lib/job-api';

type PricingRole = 'seeker' | 'recruiter';
const planNames = new Set(['Starter', 'Growth', 'Premium']);
// The signed service-only plan endpoint does not read or act on a user identity.
const pricingServiceActor: ServiceActor = { id: 'public-pricing', role: 'admin' };

type PublicPricingPlan = {
  planName: string;
  price: number;
  yearlyPrice: number;
  currency: string;
  features: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readPublicPlans(data: unknown, role: PricingRole): PublicPricingPlan[] | null {
  if (!isRecord(data) || !Array.isArray(data.plans)) return null;

  const plans: PublicPricingPlan[] = [];
  for (const value of data.plans) {
    if (!isRecord(value)) return null;
    if (value.isActive !== true) continue;
    if (
      value.role !== role ||
      typeof value.planName !== 'string' ||
      !planNames.has(value.planName) ||
      typeof value.price !== 'number' ||
      !Number.isFinite(value.price) ||
      value.price < 0 ||
      typeof value.yearlyPrice !== 'number' ||
      !Number.isFinite(value.yearlyPrice) ||
      value.yearlyPrice < 0 ||
      typeof value.currency !== 'string' ||
      !/^[a-z]{3}$/i.test(value.currency) ||
      !Array.isArray(value.features) ||
      !value.features.every((feature) => typeof feature === 'string')
    ) {
      return null;
    }

    plans.push({
      planName: value.planName,
      price: value.price,
      yearlyPrice: value.yearlyPrice,
      currency: value.currency,
      features: value.features,
    });
  }

  return plans.length > 0 ? plans : null;
}

export async function GET(request: Request) {
  const requestedRole = new URL(request.url).searchParams.get('role');
  if (requestedRole !== 'seeker' && requestedRole !== 'recruiter') {
    return NextResponse.json(
      { error: 'A valid plan audience is required.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const secret = process.env.HIRELOOP_JWT_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'Pricing is temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const result = await fetchBackendWithSecret(
      `/billing/public-plans/${requestedRole}`,
      'GET',
      undefined,
      secret,
      pricingServiceActor,
    );
    if (!result.response.ok) {
      console.error('Public pricing backend request failed', {
        status: result.response.status,
      });
      return NextResponse.json(
        { error: 'Pricing is temporarily unavailable.' },
        { status: 502, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const plans = readPublicPlans(result.data, requestedRole);
    if (!plans) {
      console.error('Public pricing backend returned invalid plans data');
      return NextResponse.json(
        { error: 'Pricing is temporarily unavailable.' },
        { status: 502, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    return NextResponse.json(
      { role: requestedRole, plans },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    console.error('Could not connect to public pricing backend');
    return NextResponse.json(
      { error: 'Pricing is temporarily unavailable.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
