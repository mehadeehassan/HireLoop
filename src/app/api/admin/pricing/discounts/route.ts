import { proxyAdminPricingRequest } from '@/lib/admin-pricing-proxy';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Discount details must be valid JSON.' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Discount details must be an object.' }, { status: 400 });
  }
  const result = await proxyAdminPricingRequest('/admin/pricing/discounts', 'POST', body as Record<string, unknown>);
  if (result.response) return result.response;
  if (typeof result.data !== 'object' || result.data === null || Array.isArray(result.data)) {
    return NextResponse.json({ error: 'The discount response was invalid.' }, { status: 502 });
  }
  return NextResponse.json(result.data, { status: 201 });
}
