import { isAdminPaymentsList } from '@/lib/admin-payment-contract';
import { proxyAdminPaymentRequest } from '@/lib/admin-payment-proxy';
import { NextResponse } from 'next/server';

const pageSizes = new Set(['10', '20', '50']);
const roles = new Set(['all', 'seeker', 'recruiter']);
const statuses = new Set(['all', 'paid', 'pending', 'failed', 'cancelled']);
const plans = new Set(['all', 'Starter', 'Growth', 'Premium']);
const sortFields = new Set([
  'paymentDate',
  'amount',
  'status',
  'role',
  'plan',
  'createdAt',
]);
const allowedParams = [
  'page',
  'pageSize',
  'search',
  'role',
  'status',
  'plan',
  'dateFrom',
  'dateTo',
  'sortBy',
  'sortDirection',
] as const;

function isValidDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return Number.isFinite(new Date(`${value}T00:00:00Z`).getTime());
  }
  return /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(new Date(value).getTime());
}

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
  const status = params.get('status') ?? 'all';
  const plan = params.get('plan') ?? 'all';
  const dateFrom = params.get('dateFrom') ?? '';
  const dateTo = params.get('dateTo') ?? '';
  const sortBy = params.get('sortBy') ?? 'paymentDate';
  const sortDirection = params.get('sortDirection') ?? 'desc';

  if (
    !/^[1-9]\d*$/.test(page) ||
    !Number.isSafeInteger(Number(page)) ||
    !pageSizes.has(pageSize) ||
    search.length > 120 ||
    !roles.has(role) ||
    !statuses.has(status) ||
    !plans.has(plan) ||
    (dateFrom && !isValidDate(dateFrom)) ||
    (dateTo && !isValidDate(dateTo)) ||
    (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) ||
    !sortFields.has(sortBy) ||
    !['asc', 'desc'].includes(sortDirection) ||
    (Number(page) - 1) * Number(pageSize) > Number.MAX_SAFE_INTEGER
  ) {
    return NextResponse.json({ error: 'Invalid payment list filters.' }, { status: 400 });
  }

  const query = new URLSearchParams({
    page,
    pageSize,
    role,
    status,
    plan,
    sortBy,
    sortDirection,
  });
  for (const [key, value] of Object.entries({ search, dateFrom, dateTo })) {
    if (value.trim()) query.set(key, value.trim());
  }

  const result = await proxyAdminPaymentRequest(`/admin/payments?${query}`);
  if (result.response) return result.response;
  if (
    !isAdminPaymentsList(result.data) ||
    result.data.pagination.page !== Number(page) ||
    result.data.pagination.pageSize !== Number(pageSize) ||
    result.data.pagination.total < 0 ||
    result.data.pagination.totalPages < 1 ||
    result.data.payments.length > Number(pageSize)
  ) {
    console.error('Admin payments backend returned an invalid list response');
    return NextResponse.json(
      { error: 'The payment list response was invalid.' },
      { status: 502 },
    );
  }
  return NextResponse.json(result.data);
}
