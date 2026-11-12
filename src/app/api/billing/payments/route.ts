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

export async function GET(request: Request) {
  const context = await requireBillingContext();
  if (isBillingResponse(context)) return context;
  const incoming = new URL(request.url).searchParams;
  const extra = new URLSearchParams();
  for (const key of ['page', 'limit', 'sortBy', 'sortOrder']) {
    const value = incoming.get(key);
    if (value) extra.set(key, value);
  }

  try {
    const query = billingQuery(context, Object.fromEntries(extra));
    const { response, data } = await callBillingBackend(
      context,
      `/billing/payments?${query}`,
      'GET',
    );
    if (!response.ok) {
      return NextResponse.json({ error: 'Payment history is temporarily unavailable.' }, { status: 502 });
    }
    if (!isRecord(data) || !Array.isArray(data.invoices)) {
      console.error('Billing backend returned invalid payment history');
      return NextResponse.json({ error: 'The billing service returned invalid payment history.' }, { status: 502 });
    }
    return NextResponse.json({
      payments: Array.isArray(data.payments)
        ? data.payments.filter(isRecord).map((payment) => ({
            paymentId: typeof payment.paymentId === 'string' ? payment.paymentId : '',
            plan: typeof payment.plan === 'string' ? payment.plan : 'Subscription',
            amountMinor: Number.isInteger(payment.amountMinor) ? payment.amountMinor : 0,
            currency: typeof payment.currency === 'string' ? payment.currency.toUpperCase() : 'USD',
            paymentStatus: typeof payment.paymentStatus === 'string' ? payment.paymentStatus : 'unknown',
            paymentMethod: typeof payment.paymentMethod === 'string' ? payment.paymentMethod : null,
            paymentDate: typeof payment.paymentDate === 'string' ? payment.paymentDate : null,
            stripeSessionId: typeof payment.stripeSessionId === 'string' ? payment.stripeSessionId : null,
            stripePaymentIntentId:
              typeof payment.stripePaymentIntentId === 'string' ? payment.stripePaymentIntentId : null,
            stripeInvoiceId: typeof payment.stripeInvoiceId === 'string' ? payment.stripeInvoiceId : null,
          }))
        : [],
      invoices: data.invoices.filter(isRecord).map((invoice) => ({
        id: typeof invoice.id === 'string' ? invoice.id : '',
        paymentId:
          typeof invoice.paymentId === 'string' && /^[a-f\d]{24}$/i.test(invoice.paymentId)
            ? invoice.paymentId
            : null,
        checkoutSessionId: typeof invoice.checkoutSessionId === 'string' ? invoice.checkoutSessionId : null,
        number: typeof invoice.number === 'string' ? invoice.number : 'Invoice',
        date: typeof invoice.date === 'string' ? invoice.date : '',
        plan: typeof invoice.plan === 'string' ? invoice.plan : 'Subscription',
        amountMinor: Number.isInteger(invoice.amountMinor) ? invoice.amountMinor : 0,
        currency: typeof invoice.currency === 'string' ? invoice.currency.toUpperCase() : 'USD',
        status: typeof invoice.status === 'string' ? invoice.status : 'unknown',
        invoiceUrl: safeStripeUrl(invoice.invoiceUrl),
        invoicePdfUrl: safeStripeUrl(invoice.invoicePdfUrl),
      })),
      pagination: isRecord(data.pagination) ? data.pagination : null,
    });
  } catch (error) {
    console.error('Could not load payment history', error);
    return NextResponse.json({ error: 'Could not connect to the billing service.' }, { status: 502 });
  }
}
