import {
  getCompanyBackendError,
  getCompanyServerContext,
  isCompanyServerContextResponse,
  isRecord,
} from '@/lib/company-server-auth';
import {
  isManagedCompany,
  isManagedCompanyDetails,
} from '@/lib/company-contract';
import { fetchBackendWithSecret } from '@/lib/job-api';
import { NextResponse } from 'next/server';

const companyFields = ['name', 'logo', 'website', 'industry', 'location', 'description'] as const;

function isValidCompanyId(companyId: string) {
  return /^(?:[a-f\d]{24}|legacy_[a-f\d]{24})$/i.test(companyId);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ companyId: string }> },
) {
  const context = await getCompanyServerContext();
  if (isCompanyServerContextResponse(context)) return context;

  const { companyId } = await params;
  if (!isValidCompanyId(companyId)) {
    return NextResponse.json({ error: 'A valid company ID is required.' }, { status: 400 });
  }
  try {
    const { response, data } = await fetchBackendWithSecret(
      `/companies/${encodeURIComponent(companyId)}`,
      'GET',
      undefined,
      context.apiSecret,
      context.actor,
    );
    if (!response.ok) {
      const status = [400, 401, 403, 404].includes(response.status) ? response.status : 502;
      return NextResponse.json(
        { error: getCompanyBackendError(data, 'Could not load company details.') },
        { status },
      );
    }
    if (!isManagedCompanyDetails(data)) {
      console.error('Company backend returned an invalid details response');
      return NextResponse.json({ error: 'The company details response was invalid.' }, { status: 502 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Could not load company details', error);
    return NextResponse.json({ error: 'Could not load company details.' }, { status: 502 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> },
) {
  const context = await getCompanyServerContext();
  if (isCompanyServerContextResponse(context)) return context;

  const { companyId } = await params;
  if (!isValidCompanyId(companyId)) {
    return NextResponse.json({ error: 'A valid company ID is required.' }, { status: 400 });
  }
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
      `/companies/${encodeURIComponent(companyId)}`,
      'PATCH',
      payload,
      context.apiSecret,
      context.actor,
    );
    if (!response.ok) {
      const status = [400, 401, 403, 404, 409].includes(response.status) ? response.status : 502;
      return NextResponse.json(
        { error: getCompanyBackendError(data, 'Could not update company.') },
        { status },
      );
    }
    if (!isRecord(data) || data.success !== true || !isManagedCompany(data.company)) {
      console.error('Company backend returned an invalid update response');
      return NextResponse.json({ error: 'The company response was invalid.' }, { status: 502 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Could not update company through backend', error);
    return NextResponse.json({ error: 'Could not update company.' }, { status: 502 });
  }
}
