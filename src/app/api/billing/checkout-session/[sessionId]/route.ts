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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const context = await requireBillingContext();
  if (isBillingResponse(context)) return context;
  const { sessionId } = await params;
  if (!/^cs_(test|live)_[A-Za-z0-9_-]+$/.test(sessionId)) {
    return NextResponse.json({ error: 'Invalid Checkout session ID.' }, { status: 400 });
  }

  try {
    const query = billingQuery(context);
    const { response, data } = await callBillingBackend(
      context,
      `/billing/checkout-session/${encodeURIComponent(sessionId)}?${query}`,
      'GET',
    );
    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            isRecord(data) && typeof data.message === 'string'
              ? data.message
              : 'Could not verify the payment.',
        },
        { status: response.status },
      );
    }
    if (!isRecord(data) || typeof data.paymentStatus !== 'string') {
      console.error('Billing backend returned invalid Checkout verification data');
      return NextResponse.json({ error: 'The payment service returned an unexpected response.' }, { status: 502 });
    }
    return NextResponse.json({ ...data, role: context.role });
  } catch (error) {
    console.error('Could not verify Checkout session', error);
    return NextResponse.json({ error: 'Could not connect to the payment service.' }, { status: 502 });
  }
}
