import { NextResponse } from 'next/server';
import {
  callBillingBackend,
  isBillingResponse,
  requireBillingContext,
  safeStripeUrl,
} from '@/lib/billing-proxy';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function POST() {
  const context = await requireBillingContext();
  if (isBillingResponse(context)) return context;

  try {
    const { response, data } = await callBillingBackend(
      context,
      '/billing/payment-methods/setup-session',
      'POST',
      { userId: context.userId, role: context.role },
    );
    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            isRecord(data) && typeof data.message === 'string'
              ? data.message
              : 'Could not start payment method setup.',
        },
        { status: response.status },
      );
    }
    const url = isRecord(data) ? safeStripeUrl(data.url) : null;
    if (!url) {
      console.error('Billing backend returned an invalid payment method setup URL');
      return NextResponse.json({ error: 'The payment service returned an invalid redirect.' }, { status: 502 });
    }
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Could not start payment method setup', error);
    return NextResponse.json({ error: 'Could not connect to the billing service.' }, { status: 502 });
  }
}
