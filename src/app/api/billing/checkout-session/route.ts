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

export async function POST(request: Request) {
  const context = await requireBillingContext();
  if (isBillingResponse(context)) return context;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Checkout request must be valid JSON.' }, { status: 400 });
  }
  if (
    !isRecord(payload) ||
    !['Growth', 'Premium'].includes(String(payload.planName)) ||
    !['month', 'year'].includes(String(payload.billingInterval))
  ) {
    return NextResponse.json({ error: 'Choose a valid plan and billing interval.' }, { status: 400 });
  }

  try {
    const { response, data } = await callBillingBackend(
      context,
      '/billing/checkout-session',
      'POST',
      {
        userId: context.userId,
        role: context.role,
        planName: payload.planName,
        billingInterval: payload.billingInterval,
      },
    );
    if (!response.ok) {
      const backendError =
        isRecord(data) && typeof data.message === 'string'
          ? data.message
          : 'The payment service could not start checkout.';
      return NextResponse.json(
        { error: backendError, ...(isRecord(data) && data.error ? { code: data.error } : {}) },
        { status: response.status },
      );
    }

    if (isRecord(data) && data.upgraded === true && typeof data.planName === 'string') {
      return NextResponse.json({ upgraded: true, planName: data.planName });
    }

    const url = isRecord(data) ? safeStripeUrl(data.url) : null;
    const sessionId = isRecord(data) && typeof data.sessionId === 'string' ? data.sessionId : null;
    const paymentRequired = isRecord(data) && data.paymentRequired === true;
    if (!url || (!sessionId && !paymentRequired)) {
      console.error('Billing backend returned an invalid Checkout session');
      return NextResponse.json({ error: 'The payment service returned an invalid redirect.' }, { status: 502 });
    }
    return NextResponse.json({
      ...(sessionId ? { sessionId } : {}),
      ...(paymentRequired ? { paymentRequired: true } : {}),
      url,
    });
  } catch (error) {
    console.error('Could not create Checkout session', error);
    return NextResponse.json({ error: 'Could not connect to the payment service.' }, { status: 502 });
  }
}
