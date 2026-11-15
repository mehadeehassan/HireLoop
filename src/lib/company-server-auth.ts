import { auth } from '@/lib/auth';
import { isAccountActive } from '@/lib/admin-user-policy';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export type CompanyServerContext = {
  actorId: string;
  role: 'seeker' | 'recruiter';
  apiSecret: string;
  actor: { id: string; role: 'seeker' | 'recruiter' };
};

export async function getCompanyServerContext(): Promise<CompanyServerContext | NextResponse> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAccountActive(session.user)) {
    return NextResponse.json({ error: 'An active account is required.' }, { status: 403 });
  }

  const role = session.user.role;
  if (role !== 'seeker' && role !== 'recruiter') {
    return NextResponse.json(
      { error: 'Only seekers and recruiters can manage companies.' },
      { status: 403 },
    );
  }

  const apiSecret = process.env.HIRELOOP_JWT_SECRET;
  if (!apiSecret) {
    console.error('Company service JWT signing secret is not configured');
    return NextResponse.json({ error: 'Company service is not configured.' }, { status: 503 });
  }

  return {
    actorId: session.user.id,
    role,
    apiSecret,
    actor: { id: session.user.id, role },
  };
}

export function isCompanyServerContextResponse(
  value: CompanyServerContext | NextResponse,
): value is NextResponse {
  return value instanceof Response;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getCompanyBackendError(value: unknown, fallback: string) {
  return isRecord(value) && typeof value.message === 'string' ? value.message : fallback;
}
