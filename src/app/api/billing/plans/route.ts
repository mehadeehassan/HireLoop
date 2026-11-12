import { NextResponse } from 'next/server';
import {
  billingQuery,
  callBillingBackend,
  isBillingResponse,
  requireBillingContext,
} from '@/lib/billing-proxy';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function GET() {
  const context = await requireBillingContext();
  if (isBillingResponse(context)) return context;

  try {
    const query = billingQuery(context);
    const [plansResult, overviewResult] = await Promise.all([
      callBillingBackend(context, `/billing/plans?${query}`, 'GET'),
      callBillingBackend(
        context,
        `/subscriptions/${encodeURIComponent(context.userId)}?role=${context.role}`,
        'GET',
      ),
    ]);
    if (!plansResult.response.ok || !overviewResult.response.ok) {
      console.error('Billing plans backend request failed', {
        plansStatus: plansResult.response.status,
        overviewStatus: overviewResult.response.status,
      });
      return NextResponse.json({ error: 'Billing plans are temporarily unavailable.' }, { status: 502 });
    }

    const plansData: unknown = plansResult.data;
    const overviewData: unknown = overviewResult.data;
    if (
      !isRecord(plansData) ||
      !Array.isArray(plansData.plans) ||
      !isRecord(overviewData) ||
      !isRecord(overviewData.subscription) ||
      typeof overviewData.subscription.plan !== 'string'
    ) {
      console.error('Billing backend returned invalid plans data');
      return NextResponse.json({ error: 'The billing service returned invalid plan data.' }, { status: 502 });
    }

    return NextResponse.json({
      plans: plansData.plans,
      currentPlan: overviewData.subscription.plan,
      status: overviewData.status,
      role: context.role,
    });
  } catch (error) {
    console.error('Could not load subscription plans', error);
    return NextResponse.json({ error: 'Could not connect to the billing service.' }, { status: 502 });
  }
}
