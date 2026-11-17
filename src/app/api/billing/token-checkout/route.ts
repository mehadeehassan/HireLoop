import { NextResponse } from 'next/server';
import { callBillingBackend, isBillingResponse, requireBillingContext, safeStripeUrl } from '@/lib/billing-proxy';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  const context = await requireBillingContext();
  if (isBillingResponse(context)) return context;
  let payload: unknown;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: 'Checkout request must be valid JSON.' }, { status: 400 }); }
  if (!isRecord(payload) || Object.keys(payload).length !== 1 || !Number.isInteger(payload.quantity) || (payload.quantity as number) < 1) {
    return NextResponse.json({ error: 'Provide only a valid token quantity.' }, { status: 400 });
  }
  try {
    const { response, data } = await callBillingBackend(context, '/billing/token-checkout-session', 'POST', { quantity: payload.quantity as number });
    if (!response.ok) return NextResponse.json({ error: isRecord(data) && typeof data.message === 'string' ? data.message : 'Token checkout could not be started.' }, { status: response.status });
    const url = isRecord(data) ? safeStripeUrl(data.url) : null;
    if (!url || !isRecord(data) || typeof data.sessionId !== 'string' || !Number.isInteger(data.quantity) || !Number.isSafeInteger(data.amountMinor) || typeof data.currency !== 'string') {
      return NextResponse.json({ error: 'The token checkout response was invalid.' }, { status: 502 });
    }
    return NextResponse.json({ url }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Could not start token checkout', error);
    return NextResponse.json({ error: 'Could not connect to the billing service.' }, { status: 502 });
  }
}
