import { NextResponse } from 'next/server';
import {
  callBillingBackend,
  isBillingResponse,
  requireBillingContext,
} from '@/lib/billing-proxy';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  const context = await requireBillingContext();
  if (isBillingResponse(context)) return context;

  const body: unknown = await request.json().catch(() => null);
  const sessionId = isRecord(body) && typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  if (sessionId && !/^cs_(test|live)_[A-Za-z0-9_-]+$/.test(sessionId)) {
    return NextResponse.json({ error: 'A valid Setup Checkout session ID is required.' }, { status: 400 });
  }

  try {
    const { response, data } = await callBillingBackend(
      context,
      '/billing/payment-methods/verify-setup-session',
      'POST',
      {
        userId: context.userId,
        role: context.role,
        ...(sessionId ? { sessionId } : {}),
      },
    );
    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            isRecord(data) && typeof data.message === 'string'
              ? data.message
              : 'Could not verify the saved payment method.',
        },
        { status: response.status },
      );
    }

    const paymentMethod = isRecord(data) ? data.paymentMethod : null;
    if (
      !isRecord(data) ||
      data.status !== 'succeeded' ||
      !isRecord(paymentMethod) ||
      typeof paymentMethod.id !== 'string' ||
      typeof paymentMethod.brand !== 'string' ||
      typeof paymentMethod.last4 !== 'string'
    ) {
      console.error('Billing backend returned invalid payment method verification data');
      return NextResponse.json(
        { error: 'The payment service returned an unexpected response.' },
        { status: 502 },
      );
    }

    return NextResponse.json({
      status: 'succeeded',
      paymentMethod: {
        id: paymentMethod.id,
        brand: paymentMethod.brand,
        last4: paymentMethod.last4.slice(-4),
        expiryMonth:
          typeof paymentMethod.expiryMonth === 'number' ? paymentMethod.expiryMonth : null,
        expiryYear:
          typeof paymentMethod.expiryYear === 'number' ? paymentMethod.expiryYear : null,
        isDefault: paymentMethod.isDefault === true,
      },
    });
  } catch (error) {
    console.error('Could not verify saved payment method', error);
    return NextResponse.json(
      { error: 'Could not connect to the billing service.' },
      { status: 502 },
    );
  }
}
