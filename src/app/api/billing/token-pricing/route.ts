import { NextResponse } from 'next/server';
import { billingQuery, callBillingBackend, isBillingResponse, requireBillingContext } from '@/lib/billing-proxy';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function GET() {
  const context = await requireBillingContext();
  if (isBillingResponse(context)) return context;
  try {
    const { response, data } = await callBillingBackend(context, `/billing/token-pricing?${billingQuery(context)}`, 'GET');
    if (!response.ok) return NextResponse.json({ error: isRecord(data) && typeof data.message === 'string' ? data.message : 'Token pricing could not be loaded.' }, { status: 502 });
    if (!isRecord(data) || data.role !== context.role || !Number.isInteger(data.extraTokens) || !Number.isInteger(data.minQuantity) || !Number.isInteger(data.maxQuantity) || typeof data.canBuy !== 'boolean' || !['ok', 'no_active_paid_plan', 'sales_disabled'].includes(String(data.reason)) || (data.unitAmountMinor !== null && !Number.isSafeInteger(data.unitAmountMinor)) || typeof data.currency !== 'string') {
      return NextResponse.json({ error: 'The token pricing response was invalid.' }, { status: 502 });
    }
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Could not load token pricing', error);
    return NextResponse.json({ error: 'Could not connect to the billing service.' }, { status: 502 });
  }
}
