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
    if (!response.ok) {
      return NextResponse.json(
        { error: response.status === 404 ? 'Payment not found.' : 'Payment details are unavailable.' },
        { status: response.status === 404 ? 404 : 502 },
      );
    }
    if (!isRecord(data) || !isRecord(data.payment)) {
      console.error('Billing backend returned invalid payment details');
      return NextResponse.json({ error: 'The billing service returned invalid payment details.' }, { status: 502 });
    }
    const payment = data.payment;
    return NextResponse.json({
      payment: {
        paymentId: typeof payment.paymentId === 'string' ? payment.paymentId : paymentId,
        plan: typeof payment.plan === 'string' ? payment.plan : 'Subscription',
        amountMinor: Number.isInteger(payment.amountMinor) ? payment.amountMinor : 0,
        currency: typeof payment.currency === 'string' ? payment.currency : 'USD',
        paymentStatus: typeof payment.paymentStatus === 'string' ? payment.paymentStatus : 'unknown',
        paymentMethod: typeof payment.paymentMethod === 'string' ? payment.paymentMethod : null,
        paymentDate: typeof payment.paymentDate === 'string' ? payment.paymentDate : null,
        stripeSessionId: typeof payment.stripeSessionId === 'string' ? payment.stripeSessionId : null,
        stripePaymentIntentId:
          typeof payment.stripePaymentIntentId === 'string' ? payment.stripePaymentIntentId : null,
        stripeInvoiceId: typeof payment.stripeInvoiceId === 'string' ? payment.stripeInvoiceId : null,
        invoiceNumber: typeof payment.invoiceNumber === 'string' ? payment.invoiceNumber : null,
        invoiceUrl: safeStripeUrl(payment.invoiceUrl),
        invoicePdfUrl: safeStripeUrl(payment.invoicePdfUrl),
      },
    });
  } catch (error) {
    console.error('Could not load payment details', error);
    return NextResponse.json({ error: 'Could not connect to the billing service.' }, { status: 502 });
  }
}
