import { isAdminPayment, isRecord } from '@/lib/admin-payment-contract';
import { proxyAdminPaymentRequest } from '@/lib/admin-payment-proxy';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const { paymentId } = await params;
  if (!/^[0-9a-fA-F]{24}$/.test(paymentId)) {
    return NextResponse.json({ error: 'A valid payment ID is required.' }, { status: 400 });
  }

  const result = await proxyAdminPaymentRequest(
    `/admin/payments/${encodeURIComponent(paymentId)}`,
  );
  if (result.response) return result.response;
  if (!isRecord(result.data) || !isAdminPayment(result.data.payment)) {
    console.error('Admin payments backend returned an invalid detail response');
    return NextResponse.json(
      { error: 'The payment details response was invalid.' },
      { status: 502 },
    );
  }
  return NextResponse.json(result.data);
}
