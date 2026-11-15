import { isAdminJob, isRecord } from '@/lib/admin-job-contract';
import { proxyAdminJobRequest } from '@/lib/admin-job-proxy';
import { NextResponse } from 'next/server';

const textLimits: Record<string, number> = {
  title: 180,
  company: 160,
  category: 100,
  department: 100,
  location: 160,
  type: 60,
  compensation: 120,
  deadline: 40,
  responsibility: 5000,
  qualifications: 5000,
};
const editableFields = new Set([...Object.keys(textLimits), 'remote']);

function isValidJobId(value: string) {
  return /^[a-f\d]{24}$/i.test(value);
}

async function parseEditBody(
  request: Request,
): Promise<
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; error: string }
> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return { ok: false, error: 'Job details must be valid JSON.' };
  }
  if (!isRecord(value)) return { ok: false, error: 'Job details must be a JSON object.' };
  const entries = Object.entries(value);
  if (
    entries.length === 0 ||
    entries.some(([key]) => !editableFields.has(key)) ||
    entries.some(([key, fieldValue]) =>
      key === 'remote'
        ? typeof fieldValue !== 'boolean'
        : typeof fieldValue !== 'string' || fieldValue.length > textLimits[key])
  ) {
    return { ok: false, error: 'Provide only valid, editable job fields.' };
  }
  if (typeof value.title === 'string' && !value.title.trim()) {
    return { ok: false, error: 'Job title cannot be empty.' };
  }
  if (typeof value.company === 'string' && !value.company.trim()) {
    return { ok: false, error: 'Company name cannot be empty.' };
  }
  return { ok: true, body: value };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  if (!isValidJobId(jobId)) {
    return NextResponse.json({ error: 'A valid job ID is required.' }, { status: 400 });
  }
  const result = await proxyAdminJobRequest(`/admin/jobs/${encodeURIComponent(jobId)}`, 'GET');
  if (result.response) return result.response;
  if (!isRecord(result.data) || !isAdminJob(result.data.job)) {
    console.error('Admin jobs backend returned an invalid details response');
    return NextResponse.json({ error: 'The job details response was invalid.' }, { status: 502 });
  }
  return NextResponse.json(result.data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  if (!isValidJobId(jobId)) {
    return NextResponse.json({ error: 'A valid job ID is required.' }, { status: 400 });
  }
  const parsed = await parseEditBody(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const result = await proxyAdminJobRequest(
    `/admin/jobs/${encodeURIComponent(jobId)}`,
    'PATCH',
    parsed.body,
  );
  if (result.response) return result.response;
  if (!isRecord(result.data) || result.data.success !== true) {
    console.error('Admin jobs backend returned an invalid edit response');
    return NextResponse.json({ error: 'The job update response was invalid.' }, { status: 502 });
  }
  return NextResponse.json(result.data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  if (!isValidJobId(jobId)) {
    return NextResponse.json({ error: 'A valid job ID is required.' }, { status: 400 });
  }

  const result = await proxyAdminJobRequest(
    `/admin/jobs/${encodeURIComponent(jobId)}`,
    'DELETE',
  );
  if (result.response) return result.response;
  if (!isRecord(result.data) || result.data.success !== true || result.data.deleted !== true) {
    console.error('Admin jobs backend returned an invalid delete response');
    return NextResponse.json({ error: 'The job delete response was invalid.' }, { status: 502 });
  }
  return NextResponse.json(result.data);
}
