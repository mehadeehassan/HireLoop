import { auth } from '@/lib/auth';
import { fetchBackendWithSecret } from '@/lib/job-api';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

type BillingContext = {
  candidateId: string;
  apiSecret: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function getBillingContext(): Promise<BillingContext | NextResponse> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'Sign in to view billing.' }, { status: 401 });
  }
  if (session.user.role !== 'seeker') {
    return NextResponse.json(
      { error: 'Only job seekers can access billing.' },
      { status: 403 },
    );
  }

  const apiSecret = process.env.HIRELOOP_APPLICATIONS_API_SECRET;
  if (!apiSecret) {
    console.error('Billing backend API secret is not configured');
    return NextResponse.json(
      { error: 'Billing is not configured yet.' },
      { status: 503 },
    );
  }

  return { candidateId: session.user.id, apiSecret };
}

function isResponse(value: BillingContext | NextResponse): value is NextResponse {
  return value instanceof Response;
}

function safeStripeUrl(value: unknown) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      !['checkout.stripe.com', 'billing.stripe.com'].includes(url.hostname)
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function sanitizeBillingSummary(value: Record<string, unknown>) {
  const subscriptionValue = isRecord(value.subscription) ? value.subscription : null;
  const subscription =
    subscriptionValue &&
    typeof subscriptionValue.plan === 'string' &&
    Number.isFinite(subscriptionValue.amountMinor) &&
    typeof subscriptionValue.currency === 'string'
      ? {
          plan: subscriptionValue.plan,
          amountMinor: subscriptionValue.amountMinor,
          currency: subscriptionValue.currency.toUpperCase(),
          interval:
            typeof subscriptionValue.interval === 'string' ? subscriptionValue.interval : 'month',
          nextBillingDate:
            typeof subscriptionValue.nextBillingDate === 'string'
              ? subscriptionValue.nextBillingDate
              : '',
        }
      : null;

  const paymentMethods = Array.isArray(value.paymentMethods)
    ? value.paymentMethods
        .filter(
          (
            method,
          ): method is Record<string, unknown> & { id: string; brand: string; last4: string } =>
            isRecord(method) &&
            typeof method.id === 'string' &&
            typeof method.brand === 'string' &&
            typeof method.last4 === 'string',
        )
        .map((method) => ({
          id: method.id,
          brand: method.brand,
          last4: method.last4.slice(-4),
          expiryMonth: Number.isInteger(method.expiryMonth) ? method.expiryMonth : null,
          expiryYear: Number.isInteger(method.expiryYear) ? method.expiryYear : null,
          isDefault: method.isDefault === true,
        }))
    : [];
  const invoices = Array.isArray(value.invoices)
    ? value.invoices
        .filter(
          (invoice): invoice is Record<string, unknown> =>
            isRecord(invoice) &&
            typeof invoice.id === 'string' &&
            Number.isFinite(invoice.amountMinor),
        )
        .map((invoice) => ({
          id: invoice.id,
          number: typeof invoice.number === 'string' ? invoice.number : invoice.id,
          date: typeof invoice.date === 'string' ? invoice.date : '',
          plan: typeof invoice.plan === 'string' ? invoice.plan : '',
          amountMinor: invoice.amountMinor,
          currency:
            typeof invoice.currency === 'string' ? invoice.currency.toUpperCase() : 'USD',
          status: typeof invoice.status === 'string' ? invoice.status : 'unknown',
          invoiceUrl: safeInvoiceUrl(invoice.invoiceUrl),
        }))
    : [];

  return { subscription, paymentMethods, invoices };
}

function safeInvoiceUrl(value: unknown) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      !['invoice.stripe.com', 'pay.stripe.com'].includes(url.hostname)
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export async function GET() {
  const context = await getBillingContext();
  if (isResponse(context)) return context;

  try {
    const query = new URLSearchParams({ candidateId: context.candidateId }).toString();
    const { response, data } = await fetchBackendWithSecret(
      `/billing?${query}`,
      'GET',
      undefined,
      context.apiSecret,
    );
    if (!response.ok) {
      console.error('Billing backend summary request failed', response.status);
      return NextResponse.json(
        {
          error:
            response.status === 404
              ? 'The backend does not have GET /billing yet. Add the billing API routes to load payment details.'
              : 'Billing details are not available from the payment service yet.',
          backendStatus: response.status,
        },
        { status: response.status === 404 ? 503 : 502 },
      );
    }
    if (!isRecord(data)) {
      console.error('Billing backend returned an unexpected summary response');
      return NextResponse.json(
        { error: 'The billing service returned an unexpected response.' },
        { status: 502 },
      );
    }

    return NextResponse.json(sanitizeBillingSummary(data));
  } catch (error) {
    console.error('Could not load billing summary from backend', error);
    return NextResponse.json(
      { error: 'Could not connect to the billing service.' },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const context = await getBillingContext();
  if (isResponse(context)) return context;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Billing request must be valid JSON.' }, { status: 400 });
  }
  if (!isRecord(payload) || !['setup', 'portal'].includes(String(payload.action))) {
    return NextResponse.json({ error: 'Unsupported billing action.' }, { status: 400 });
  }

  const appUrl = process.env.BETTER_AUTH_URL;
  if (!appUrl) {
    console.error('BETTER_AUTH_URL is not configured for billing redirects');
    return NextResponse.json({ error: 'Billing is not configured yet.' }, { status: 503 });
  }

  try {
    const billingPage = new URL('/dashboard/seeker/billing', appUrl).toString();
    const isSetup = payload.action === 'setup';
    const path = isSetup
      ? '/billing/payment-methods/setup-session'
      : '/billing/portal-session';
    const body = isSetup
      ? {
          candidateId: context.candidateId,
          successUrl: `${billingPage}?payment=success`,
          cancelUrl: `${billingPage}?payment=cancelled`,
        }
      : {
          candidateId: context.candidateId,
          returnUrl: billingPage,
        };
    const { response, data } = await fetchBackendWithSecret(
      path,
      'POST',
      body,
      context.apiSecret,
    );
    if (!response.ok) {
      console.error('Billing backend session request failed', {
        action: payload.action,
        status: response.status,
      });
      const requiredRoute = isSetup
        ? 'POST /billing/payment-methods/setup-session'
        : 'POST /billing/portal-session';
      return NextResponse.json(
        {
          error:
            response.status === 404
              ? `The backend is missing ${requiredRoute}. Add this Stripe billing endpoint, then restart the backend.`
              : response.status === 401 || response.status === 403
                ? 'The backend rejected the billing API credentials. Check that the shared server-only secret matches.'
                : 'The payment service could not start this billing action.',
          backendStatus: response.status,
        },
        { status: response.status === 404 ? 503 : 502 },
      );
    }
    const url = isRecord(data) ? safeStripeUrl(data.url) : null;
    if (!url) {
      console.error('Billing backend returned an invalid Stripe session URL');
      return NextResponse.json(
        { error: 'The payment service returned an invalid redirect.' },
        { status: 502 },
      );
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Could not start billing session', error);
    return NextResponse.json(
      { error: 'Could not connect to the payment service.' },
      { status: 502 },
    );
  }
}
