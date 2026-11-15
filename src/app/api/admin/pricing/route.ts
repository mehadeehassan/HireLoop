import { proxyAdminPricingRequest } from '@/lib/admin-pricing-proxy';
import { NextResponse } from 'next/server';

export async function GET() {
  const result = await proxyAdminPricingRequest('/admin/pricing', 'GET');
  if (result.response) return result.response;
  if (!result.data || typeof result.data !== 'object' || Array.isArray(result.data)) {
    return NextResponse.json({ error: 'The pricing response was invalid.' }, { status: 502 });
  }
  return NextResponse.json(result.data, { headers: { 'Cache-Control': 'no-store' } });
}
