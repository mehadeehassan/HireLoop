import { NextResponse } from 'next/server';
import { billingQuery, callBillingBackend, isBillingResponse, requireBillingContext } from '@/lib/billing-proxy';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function GET(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const context = await requireBillingContext();
  if (isBillingResponse(context)) return context;
  const { sessionId } = await params;
  if (!/^cs_(test|live)_[A-Za-z0-9_-]+$/.test(sessionId)) return NextResponse.json({ error: 'Invalid Checkout session ID.' }, { status: 400 });
  try {
    const { response, data } = await callBillingBackend(context, `/billing/token-checkout-session/${encodeURIComponent(sessionId)}?${billingQuery(context)}`, 'GET');
    if (!response.ok) return NextResponse.json({ error: isRecord(data) && typeof data.message === 'string' ? data.message : 'Could not verify the token payment.' }, { status: response.status });
    if (!isRecord(data) || typeof data.paymentStatus !== 'string' || !Number.isInteger(data.tokensAdded) || !Number.isInteger(data.extraTokens) || typeof data.sessionId !== 'string') return NextResponse.json({ error: 'The token verification response was invalid.' }, { status: 502 });
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Could not verify token Checkout session', error);
    return NextResponse.json({ error: 'Could not connect to the billing service.' }, { status: 502 });
  }
}
