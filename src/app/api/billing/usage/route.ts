import { NextResponse } from 'next/server';
import {
  billingQuery,
  callBillingBackend,
  isBillingResponse,
  requireBillingContext,
} from '@/lib/billing-proxy';

export async function GET() {
  const context = await requireBillingContext();
  if (isBillingResponse(context)) return context;
  try {
    const query = billingQuery(context);
    const { response, data } = await callBillingBackend(context, `/billing/usage?${query}`, 'GET');
    if (!response.ok) {
      return NextResponse.json({ error: 'Billing usage is temporarily unavailable.' }, { status: 502 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Could not load subscription usage', error);
    return NextResponse.json({ error: 'Could not connect to the billing service.' }, { status: 502 });
  }
}
