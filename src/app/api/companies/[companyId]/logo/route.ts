import {
  getCompanyServerContext,
  isCompanyServerContextResponse,
} from '@/lib/company-server-auth';
import { fetchBackendResponse } from '@/lib/job-api';
import { NextResponse } from 'next/server';

const imageTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ companyId: string }> },
) {
  const context = await getCompanyServerContext();
  if (isCompanyServerContextResponse(context)) return context;

  const { companyId } = await params;
  if (!/^(?:[a-f\d]{24}|legacy_[a-f\d]{24})$/i.test(companyId)) {
    return NextResponse.json({ error: 'A valid company ID is required.' }, { status: 400 });
  }
  try {
    const response = await fetchBackendResponse(
      `/companies/${encodeURIComponent(companyId)}/logo`,
      'GET',
      context.apiSecret,
      context.actor,
    );
    if (!response.ok) {
      const status = [400, 401, 403, 404].includes(response.status) ? response.status : 502;
      return NextResponse.json({ error: 'Could not load company logo.' }, { status });
    }
    const contentType = response.headers.get('content-type')?.split(';')[0] || '';
    if (!imageTypes.has(contentType) || !response.body) {
      console.error('Company logo backend returned an invalid image response');
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
    console.error('Could not connect to company logo service', error);
    return NextResponse.json({ error: 'Could not load company logo.' }, { status: 502 });
  }
}
