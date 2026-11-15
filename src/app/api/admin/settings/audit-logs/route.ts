import { isAdminAuditLogsList } from '@/lib/admin-settings-contract';
import { proxyAdminSettingsRequest } from '@/lib/admin-settings-proxy';
import { NextResponse } from 'next/server';
import { withRequestPerformance } from '@/lib/request-performance';

const pageSizes = new Set(['10', '20', '50']);
const sections = new Set(['all', 'branding', 'controls', 'notifications', 'plan_limits', 'pricing']);
const allowedParams = ['page', 'pageSize', 'section'] as const;

async function handleGET(request: Request) {
  const params = new URL(request.url).searchParams;
  for (const key of allowedParams) {
    if (params.getAll(key).length > 1) {
      return NextResponse.json({ error: `Provide only one ${key} value.` }, { status: 400 });
    }
  }

  const page = params.get('page') ?? '1';
  const pageSize = params.get('pageSize') ?? '10';
  const section = params.get('section') ?? 'all';

  if (
    !/^[1-9]\d*$/.test(page) ||
    !Number.isSafeInteger(Number(page)) ||
    !pageSizes.has(pageSize) ||
    !sections.has(section) ||
    (Number(page) - 1) * Number(pageSize) > Number.MAX_SAFE_INTEGER
  ) {
    return NextResponse.json({ error: 'Invalid audit log filters.' }, { status: 400 });
  }

  const query = new URLSearchParams({ page, pageSize, section });
  const result = await proxyAdminSettingsRequest(
    `/admin/settings/audit-logs?${query}`,
    'GET',
  );
  if (result.response) return result.response;
  if (
    !isAdminAuditLogsList(result.data) ||
    result.data.pagination.page !== Number(page) ||
    result.data.pagination.pageSize !== Number(pageSize) ||
    result.data.pagination.total < 0 ||
    result.data.pagination.totalPages < 1 ||
    result.data.logs.length > Number(pageSize)
  ) {
    console.error('Admin settings backend returned an invalid audit log response');
    return NextResponse.json(
      { error: 'The audit log response was invalid.' },
      { status: 502 },
    );
  }
  return NextResponse.json(result.data);
}

export const GET = withRequestPerformance('GET /api/admin/settings/audit-logs', handleGET);
