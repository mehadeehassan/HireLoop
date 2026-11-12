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

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string; action: string }> },
) {
  const context = await requireBillingContext();
  if (isBillingResponse(context)) return context;

  const { sessionId, action } = await params;
  if (!/^cs_(test|live)_[A-Za-z0-9_-]+$/.test(sessionId) || !['resume', 'cancel'].includes(action)) {
    return NextResponse.json({ error: 'Invalid pending payment action.' }, { status: 400 });
  }

  try {
    const { response, data } = await callBillingBackend(
      context,
      `/billing/checkout-sessions/${encodeURIComponent(sessionId)}/${action}`,
      'POST',
      { userId: context.userId, role: context.role },
    );
    if (!response.ok) {
      const code = isRecord(data) && typeof data.code === 'string' ? data.code : null;
      return NextResponse.json(
        {
          error:
            isRecord(data) && typeof data.message === 'string'
              ? data.message
              : 'Could not update this pending payment.',
          ...(code ? { code } : {}),
        },
        { status: [400, 404, 409, 410].includes(response.status) ? response.status : 502 },
      );
    }
    if (action === 'resume') {
      if (isRecord(data) && data.status === 'succeeded') {
        return NextResponse.json({ status: 'succeeded' });
      }
      const url = isRecord(data) ? safeStripeUrl(data.url) : null;
      if (!url) {
        console.error('Billing backend returned an invalid pending Checkout URL');
        return NextResponse.json({ error: 'The payment service returned an invalid redirect.' }, { status: 502 });
      }
      return NextResponse.json({ url });
    }
    if (!isRecord(data) || data.status !== 'cancelled') {
      console.error('Billing backend returned an invalid Checkout cancellation response');
      return NextResponse.json({ error: 'The payment service returned an invalid cancellation result.' }, { status: 502 });
    }
    return NextResponse.json({ status: 'cancelled' });
  } catch (error) {
    console.error('Could not update pending Checkout session', error);
    return NextResponse.json({ error: 'Could not connect to the billing service.' }, { status: 502 });
  }
}
