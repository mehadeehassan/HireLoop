import { proxyAdminPricingRequest } from '@/lib/admin-pricing-proxy';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) {
    return NextResponse.json({ error: 'Discount not found.' }, { status: 404 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Discount status must be valid JSON.' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body) ||
      Object.keys(body).length !== 1 || typeof (body as { active?: unknown }).active !== 'boolean') {
    return NextResponse.json({ error: 'Provide an active status.' }, { status: 400 });
  }
  const result = await proxyAdminPricingRequest(
    `/admin/pricing/discounts/${encodeURIComponent(id)}`,
    'PATCH',
    body as Record<string, unknown>,
  );
  if (result.response) return result.response;
  return NextResponse.json(result.data);
}
