import { getActiveAdminSession, isAdminSessionResponse } from '@/lib/admin-server-auth';
import { fetchBackendResponse } from '@/lib/job-api';
import { NextResponse } from 'next/server';

const imageTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ companyId: string }> },
) {
  const sessionContext = await getActiveAdminSession();
  if (isAdminSessionResponse(sessionContext)) return sessionContext;

  const { companyId } = await params;
  if (companyId.length > 256 || !/^[A-Za-z0-9_-]+$/.test(companyId)) {
    return NextResponse.json({ error: 'A valid company ID is required.' }, { status: 400 });
  }
  const apiSecret = process.env.HIRELOOP_JWT_SECRET;
  if (!apiSecret) {
    console.error('Admin companies service JWT signing secret is not configured');
    return NextResponse.json({ error: 'Company service is not configured.' }, { status: 503 });
  }

  try {
    const response = await fetchBackendResponse(
      `/admin/companies/${encodeURIComponent(companyId)}/logo`,
      'GET',
      apiSecret,
      { id: sessionContext.actorId, role: 'admin' },
    );
    if (!response.ok) {
      const status = [400, 401, 403, 404].includes(response.status) ? response.status : 502;
      return NextResponse.json({ error: 'Could not load company logo.' }, { status });
    }
    const contentType = response.headers.get('content-type')?.split(';')[0] || '';
    if (!imageTypes.has(contentType) || !response.body) {
      console.error('Admin company logo backend returned an invalid image response');
      return NextResponse.json({ error: 'The company logo response was invalid.' }, { status: 502 });
    }
    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Could not connect to admin company logo service', error);
    return NextResponse.json({ error: 'Could not load company logo.' }, { status: 502 });
  }
}
