import { isAdminPaymentOverview } from '@/lib/admin-payment-contract';
import { proxyAdminPaymentRequest } from '@/lib/admin-payment-proxy';
import { NextResponse } from 'next/server';

export async function GET() {
  const result = await proxyAdminPaymentRequest('/admin/payments/overview');
  if (result.response) return result.response;
  if (!isAdminPaymentOverview(result.data)) {
    console.error('Admin payments backend returned an invalid overview response');
    return NextResponse.json(
      { error: 'The payment overview response was invalid.' },
      { status: 502 },
    );
  }
  return NextResponse.json(result.data);
}
