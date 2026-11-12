import { NextResponse } from 'next/server';
import {
  billingQuery,
  callBillingBackend,
  isBillingResponse,
  requireBillingContext,
  safeStripeUrl,
} from '@/lib/billing-proxy';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const context = await requireBillingContext();
  if (isBillingResponse(context)) return context;
  const { paymentId } = await params;
  if (!/^[a-f\d]{24}$/i.test(paymentId)) {
    return NextResponse.json({ error: 'Invalid payment ID.' }, { status: 400 });
  }

  try {
    const query = billingQuery(context);
    const { response, data } = await callBillingBackend(
      context,
      `/billing/payments/${encodeURIComponent(paymentId)}?${query}`,
      'GET',
    );
    if (!response.ok || !isRecord(data) || !isRecord(data.payment)) {
      return NextResponse.json(
        { error: response.status === 404 ? 'Invoice not found.' : 'Invoice download is unavailable.' },
        { status: response.status === 404 ? 404 : 502 },
      );
    }

    const invoicePdfUrl = safeStripeUrl(data.payment.invoicePdfUrl);
    if (!invoicePdfUrl) {
      return NextResponse.json({ error: 'This invoice PDF is not available yet.' }, { status: 404 });
    }
    return NextResponse.redirect(invoicePdfUrl, 302);
  } catch (error) {
    console.error('Could not download billing invoice', error);
    return NextResponse.json({ error: 'Could not connect to the invoice service.' }, { status: 502 });
  }
}
