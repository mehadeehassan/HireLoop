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
    const { response, data } = await callBillingBackend(context, `/billing/me?${query}`, 'GET');
    if (!response.ok) {
      return NextResponse.json({ error: 'Billing overview is temporarily unavailable.' }, { status: 502 });
    }
    if (
      !isRecord(data) ||
      typeof data.currentPlan !== 'string' ||
      !Array.isArray(data.paymentMethods)
    ) {
      console.error('Billing backend returned an invalid billing overview');
      return NextResponse.json({ error: 'The billing service returned invalid billing data.' }, { status: 502 });
    }
    return NextResponse.json({
      currentPlan: data.currentPlan,
      status: typeof data.status === 'string' ? data.status : 'active',
      startDate: typeof data.startDate === 'string' ? data.startDate : null,
      expiryDate: typeof data.expiryDate === 'string' ? data.expiryDate : null,
      monthlyLimit: Number.isInteger(data.monthlyLimit) ? data.monthlyLimit : 0,
      usedCount: Number.isInteger(data.usedCount) ? data.usedCount : 0,
      remainingCount: Number.isInteger(data.remainingCount) ? data.remainingCount : 0,
      nextResetDate: typeof data.nextResetDate === 'string' ? data.nextResetDate : null,
      billingInterval: typeof data.billingInterval === 'string' ? data.billingInterval : 'month',
      price: typeof data.price === 'number' ? data.price : 0,
      currency: typeof data.currency === 'string' ? data.currency : 'USD',
      features: Array.isArray(data.features)
        ? data.features.filter((feature): feature is string => typeof feature === 'string')
        : [],
      paymentMethods: data.paymentMethods.filter(
        (
          method,
        ): method is Record<string, unknown> & { id: string; brand: string; last4: string } =>
          isRecord(method) &&
          typeof method.id === 'string' &&
          typeof method.brand === 'string' &&
          typeof method.last4 === 'string',
      ).map((method) => ({
        id: method.id,
        brand: method.brand,
        last4: method.last4.slice(-4),
        expiryMonth:
          typeof method.expiryMonth === 'number' && Number.isInteger(method.expiryMonth)
            ? method.expiryMonth
            : null,
        expiryYear:
          typeof method.expiryYear === 'number' && Number.isInteger(method.expiryYear)
            ? method.expiryYear
            : null,
        isDefault: method.isDefault === true,
      })),
    });
  } catch (error) {
    console.error('Could not load billing overview', error);
    return NextResponse.json({ error: 'Could not connect to the billing service.' }, { status: 502 });
  }
}
