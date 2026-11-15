import { auth } from '@/lib/auth';
import { isAccountActive } from '@/lib/admin-user-policy';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export type AdminServerSession = {
  actorId: string;
  headers: Headers;
};

export async function getActiveAdminSession(): Promise<AdminServerSession | NextResponse> {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAccountActive(session.user) || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Only active admins can access this resource.' }, { status: 403 });
  }

  return { actorId: session.user.id, headers: requestHeaders };
}

export function isAdminSessionResponse(
  value: AdminServerSession | NextResponse,
): value is NextResponse {
  return value instanceof Response;
}
