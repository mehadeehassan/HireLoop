import 'server-only';

import { auth } from '@/lib/auth';
import { fetchBackendWithSecret } from '@/lib/job-api';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export type BillingRole = 'seeker' | 'recruiter';

export type BillingContext = {
  userId: string;
  role: BillingRole;
  apiSecret: string;
};

export async function requireBillingContext(): Promise<BillingContext | NextResponse> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'Sign in to manage billing.' }, { status: 401 });
  }
  if (session.user.role !== 'seeker' && session.user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Billing is not available for this account.' }, { status: 403 });
  }

  const apiSecret = process.env.HIRELOOP_JWT_SECRET;
  if (!apiSecret) {
    console.error('Billing backend JWT signing secret is not configured');
    return NextResponse.json({ error: 'Billing is not configured yet.' }, { status: 503 });
  }

  return {
    userId: session.user.id,
    role: session.user.role,
    apiSecret,
  };
}

export function isBillingResponse(value: BillingContext | NextResponse): value is NextResponse {
  return value instanceof Response;
}

export function billingQuery(context: BillingContext, extra?: Record<string, string>) {
  return new URLSearchParams({
    userId: context.userId,
    role: context.role,
    ...extra,
  }).toString();
}

export function safeStripeUrl(value: unknown) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      ![
        'checkout.stripe.com',
        'billing.stripe.com',
        'invoice.stripe.com',
        'pay.stripe.com',
        'files.stripe.com',
      ].includes(url.hostname)
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export async function callBillingBackend(
  context: BillingContext,
  path: string,
  method: 'GET' | 'POST',
  body?: Record<string, unknown>,
) {
  return fetchBackendWithSecret(path, method, body, context.apiSecret);
}
