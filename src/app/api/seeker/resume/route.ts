import { auth } from '@/lib/auth';
import { fetchBackendResponse, fetchBackendWithSecret } from '@/lib/job-api';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

type ResumeContext = {
  candidateId: string;
  apiSecret: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function getResumeContext(): Promise<ResumeContext | NextResponse> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'seeker') {
    return NextResponse.json({ error: 'Only job seekers can access this resume.' }, { status: 403 });
  }

  const apiSecret = process.env.HIRELOOP_JWT_SECRET;
  if (!apiSecret) {
    console.error('Seeker resume backend JWT signing secret is not configured');
    return NextResponse.json({ error: 'Resume service is not configured.' }, { status: 503 });
  }
  return { candidateId: session.user.id, apiSecret };
}

function isResponse(value: ResumeContext | NextResponse): value is NextResponse {
  return value instanceof Response;
}

async function getBackendError(response: Response, fallback: string) {
  const text = await response.text();
  if (!text) return fallback;
  try {
    const data: unknown = JSON.parse(text);
    return isRecord(data) && typeof data.message === 'string' ? data.message : fallback;
  } catch {
    return fallback;
  }
}

export async function GET() {
  const context = await getResumeContext();
  if (isResponse(context)) return context;

  const query = new URLSearchParams({ candidateId: context.candidateId }).toString();
  try {
    const response = await fetchBackendResponse(`/seeker/resume?${query}`, 'GET', context.apiSecret);
    if (!response.ok) {
      const error = await getBackendError(response, 'Could not download your resume.');
      return NextResponse.json(
        { error },
        { status: response.status >= 400 && response.status < 500 ? response.status : 502 },
      );
    }

    const rawDisposition = response.headers.get('content-disposition') || '';
    const match = /^attachment;\s*filename="([A-Za-z0-9._ -]{1,180})"$/.exec(rawDisposition);
    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${match?.[1] || 'resume.pdf'}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('Could not download seeker resume from backend', error);
    return NextResponse.json({ error: 'Could not download your resume.' }, { status: 502 });
  }
}

export async function DELETE() {
  const context = await getResumeContext();
  if (isResponse(context)) return context;

  const query = new URLSearchParams({ candidateId: context.candidateId }).toString();
  try {
    const { response, data } = await fetchBackendWithSecret(
      `/seeker/resume?${query}`,
      'DELETE',
      undefined,
      context.apiSecret,
    );
    if (!response.ok) {
      return NextResponse.json(
        { error: isRecord(data) && typeof data.message === 'string' ? data.message : 'Could not remove your resume.' },
        { status: response.status >= 400 && response.status < 500 ? response.status : 502 },
      );
    }
    if (!isRecord(data) || data.success !== true) {
      console.error('Seeker resume backend returned an invalid removal response');
      return NextResponse.json({ error: 'Could not remove your resume.' }, { status: 502 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Could not remove seeker resume through backend', error);
    return NextResponse.json({ error: 'Could not remove your resume.' }, { status: 502 });
  }
}
