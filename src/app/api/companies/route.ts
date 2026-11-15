import {
  getCompanyBackendError,
  getCompanyServerContext,
  isCompanyServerContextResponse,
  isRecord,
} from '@/lib/company-server-auth';
import { isManagedCompany, isManagedCompanyList } from '@/lib/company-contract';
import { fetchBackendWithSecret } from '@/lib/job-api';
import { NextResponse } from 'next/server';

const pageSizes = new Set(['10', '20', '50']);
const companyFields = ['name', 'logo', 'website', 'industry', 'location', 'description'] as const;

export async function GET(request: Request) {
  const context = await getCompanyServerContext();
  if (isCompanyServerContextResponse(context)) return context;

  const params = new URL(request.url).searchParams;
  for (const key of ['page', 'pageSize', 'search']) {
    if (params.getAll(key).length > 1) {
      return NextResponse.json({ error: `Provide only one ${key} value.` }, { status: 400 });
    }
  }
  const page = params.get('page') ?? '1';
  const pageSize = params.get('pageSize') ?? '10';
  const search = params.get('search') ?? '';
  if (
    !/^[1-9]\d*$/.test(page) ||
    !Number.isSafeInteger(Number(page)) ||
    !pageSizes.has(pageSize) ||
    search.length > 120
  ) {
    return NextResponse.json({ error: 'Invalid company list filters.' }, { status: 400 });
  }

  const query = new URLSearchParams({ page, pageSize });
  if (search.trim()) query.set('search', search.trim());
  try {
    const { response, data } = await fetchBackendWithSecret(
      `/companies?${query.toString()}`,
      'GET',
      undefined,
      context.apiSecret,
      context.actor,
    );
    if (!response.ok) {
      const status = [400, 401, 403].includes(response.status) ? response.status : 502;
      console.error('Company list backend request failed', response.status);
      return NextResponse.json(
        { error: getCompanyBackendError(data, 'Could not load companies.') },
        { status },
      );
    }
    if (!isManagedCompanyList(data) || data.pagination.page !== Number(page) ||
      data.pagination.pageSize !== Number(pageSize)) {
      console.error('Company backend returned an invalid list response');
      return NextResponse.json({ error: 'The company list response was invalid.' }, { status: 502 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Could not connect to company service', error);
    return NextResponse.json({ error: 'Could not connect to the company service.' }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const context = await getCompanyServerContext();
  if (isCompanyServerContextResponse(context)) return context;

  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return NextResponse.json({ error: 'Company details must be valid JSON.' }, { status: 400 });
  }
  if (!isRecord(value)) {
    return NextResponse.json({ error: 'Please provide valid company details.' }, { status: 400 });
  }
  const payload: Record<string, unknown> = {};
  for (const key of companyFields) {
    if (Object.hasOwn(value, key)) payload[key] = value[key];
  }

  try {
    const { response, data } = await fetchBackendWithSecret(
      '/companies',
      'POST',
      payload,
      context.apiSecret,
      context.actor,
    );
    if (!response.ok) {
      const status = [400, 401, 403, 409].includes(response.status) ? response.status : 502;
      return NextResponse.json(
        { error: getCompanyBackendError(data, 'Could not create company.') },
        { status },
      );
    }
    if (!isRecord(data) || !isManagedCompany(data.company) || typeof data.duplicate !== 'boolean') {
      console.error('Company backend returned an invalid create response');
      return NextResponse.json({ error: 'The company response was invalid.' }, { status: 502 });
    }
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Could not create company through backend', error);
    return NextResponse.json({ error: 'Could not create company.' }, { status: 502 });
  }
}
