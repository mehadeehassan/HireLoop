import { NextResponse } from 'next/server';
import { proxyAdminPricingRequest } from '@/lib/admin-pricing-proxy';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isTokenPrices(data: unknown) {
  return isRecord(data) && Array.isArray(data.prices) && data.prices.length === 2 && data.prices.every((item) => isRecord(item) && ['seeker', 'recruiter'].includes(String(item.role)) && Number.isInteger(item.unitAmountMinor) && Number.isInteger(item.minQuantity) && Number.isInteger(item.maxQuantity) && typeof item.currency === 'string' && typeof item.isActive === 'boolean' && typeof item.currencyCompatible === 'boolean');
}
function isTokenPrice(data: unknown) {
  return isRecord(data) && ['seeker', 'recruiter'].includes(String(data.role)) && Number.isInteger(data.unitAmountMinor) && Number.isInteger(data.minQuantity) && Number.isInteger(data.maxQuantity) && typeof data.currency === 'string' && typeof data.isActive === 'boolean';
}

export async function GET() {
  const result = await proxyAdminPricingRequest('/admin/pricing/tokens', 'GET');
  if (result.response) return result.response;
  if (!isTokenPrices(result.data)) return NextResponse.json({ error: 'The token pricing response was invalid.' }, { status: 502 });
  return NextResponse.json(result.data, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Provide valid token pricing details.' }, { status: 400 }); }
  if (!isRecord(body) || Object.keys(body).some((key) => !['role', 'unitAmount', 'minQuantity', 'maxQuantity', 'isActive'].includes(key)) || !['seeker', 'recruiter'].includes(String(body.role)) || typeof body.unitAmount !== 'number' || !Number.isFinite(body.unitAmount) || body.unitAmount <= 0 || !Number.isInteger(body.minQuantity) || !Number.isInteger(body.maxQuantity) || typeof body.isActive !== 'boolean') return NextResponse.json({ error: 'Provide valid token pricing details.' }, { status: 400 });
  const role = body.role as 'seeker' | 'recruiter';
  const result = await proxyAdminPricingRequest(`/admin/pricing/tokens/${role}`, 'PUT', { unitAmount: body.unitAmount, minQuantity: body.minQuantity as number, maxQuantity: body.maxQuantity as number, isActive: body.isActive });
  if (result.response) return result.response;
  if (!isTokenPrice(result.data)) return NextResponse.json({ error: 'The updated token pricing response was invalid.' }, { status: 502 });
  return NextResponse.json(result.data, { headers: { 'Cache-Control': 'no-store' } });
}
