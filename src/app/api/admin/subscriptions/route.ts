import { isAdminSubscriptionsList } from '@/lib/admin-payment-contract';
import { proxyAdminPaymentRequest } from '@/lib/admin-payment-proxy';
import { NextResponse } from 'next/server';

const pageSizes = new Set(['10', '20', '50']);
const roles = new Set(['all', 'seeker', 'recruiter']);
const plans = new Set(['all', 'Starter', 'Growth', 'Premium']);
const sortFields = new Set([
  'plan',
  'status',
  'role',
  'startDate',
  'expiryDate',
  'createdAt',
]);
const allowedParams = [
  'page',
  'pageSize',
  'search',
  'role',
  'plan',
  'status',
  'sortBy',
  'sortDirection',
] as const;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  for (const key of allowedParams) {
    if (params.getAll(key).length > 1) {
      return NextResponse.json({ error: `Provide only one ${key} value.` }, { status: 400 });
    }
  }

  const page = params.get('page') ?? '1';
  const pageSize = params.get('pageSize') ?? '10';
  const search = params.get('search') ?? '';
  const role = params.get('role') ?? 'all';
  const plan = params.get('plan') ?? 'all';
  const status = params.get('status') ?? 'all';
  const sortBy = params.get('sortBy') ?? 'startDate';
  const sortDirection = params.get('sortDirection') ?? 'desc';

  if (
    !/^[1-9]\d*$/.test(page) ||
    !Number.isSafeInteger(Number(page)) ||
    !pageSizes.has(pageSize) ||
    search.length > 120 ||
    !roles.has(role) ||
    !plans.has(plan) ||
    (status !== 'all' && !/^[a-z_]{1,40}$/.test(status)) ||
    !sortFields.has(sortBy) ||
    !['asc', 'desc'].includes(sortDirection) ||
    (Number(page) - 1) * Number(pageSize) > Number.MAX_SAFE_INTEGER
  ) {
    return NextResponse.json({ error: 'Invalid subscription list filters.' }, { status: 400 });
  }

  const query = new URLSearchParams({
    page,
    pageSize,
    role,
    plan,
    status,
    sortBy,
    sortDirection,
  });
  if (search.trim()) query.set('search', search.trim());

  const result = await proxyAdminPaymentRequest(`/admin/subscriptions?${query}`);
  if (result.response) return result.response;
  if (
    !isAdminSubscriptionsList(result.data) ||
    result.data.pagination.page !== Number(page) ||
    result.data.pagination.pageSize !== Number(pageSize) ||
    result.data.pagination.total < 0 ||
    result.data.pagination.totalPages < 1 ||
    result.data.subscriptions.length > Number(pageSize)
  ) {
    console.error('Admin subscriptions backend returned an invalid list response');
    return NextResponse.json(
      { error: 'The subscription list response was invalid.' },
      { status: 502 },
    );
  }
  return NextResponse.json(result.data);
}
