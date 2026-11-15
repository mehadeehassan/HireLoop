import { isRecord } from '@/lib/admin-job-contract';
import { proxyAdminJobRequest } from '@/lib/admin-job-proxy';
import { NextResponse } from 'next/server';

function isValidJobId(value: string) {
  return /^[a-f\d]{24}$/i.test(value);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  if (!isValidJobId(jobId)) {
    return NextResponse.json({ error: 'A valid job ID is required.' }, { status: 400 });
  }

  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return NextResponse.json({ error: 'Job status must be valid JSON.' }, { status: 400 });
  }
  if (!isRecord(value) || Object.keys(value).length !== 1 ||
    (value.status !== 'Active' && value.status !== 'Closed')) {
    return NextResponse.json({ error: 'Status must be Active or Closed.' }, { status: 400 });
  }

  const result = await proxyAdminJobRequest(
    `/admin/jobs/${encodeURIComponent(jobId)}/status`,
    'PATCH',
    { status: value.status },
  );
  if (result.response) return result.response;
  if (
    !isRecord(result.data) ||
    result.data.success !== true ||
    result.data.status !== value.status ||
    typeof result.data.updatedAt !== 'string' ||
    !Number.isFinite(new Date(result.data.updatedAt).getTime())
  ) {
    console.error('Admin jobs backend returned an invalid status response');
    return NextResponse.json({ error: 'The job status response was invalid.' }, { status: 502 });
  }
  return NextResponse.json(result.data);
}
