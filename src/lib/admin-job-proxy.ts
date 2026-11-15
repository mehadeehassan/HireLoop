import { getActiveAdminSession, isAdminSessionResponse } from '@/lib/admin-server-auth';
import { fetchBackendWithSecret } from '@/lib/job-api';
import { NextResponse } from 'next/server';

type BackendResult =
  | { response: NextResponse; data?: never }
  | { response: null; data: unknown };

function getErrorMessage(data: unknown, fallback: string) {
  return typeof data === 'object' &&
    data !== null &&
    !Array.isArray(data) &&
    'message' in data &&
    typeof data.message === 'string'
    ? data.message
    : fallback;
}

export async function proxyAdminJobRequest(
  path: string,
  method: 'GET' | 'PATCH' | 'DELETE',
  body?: Record<string, unknown>,
): Promise<BackendResult> {
  const sessionContext = await getActiveAdminSession();
  if (isAdminSessionResponse(sessionContext)) return { response: sessionContext };

  const apiSecret = process.env.HIRELOOP_JWT_SECRET;
  if (!apiSecret) {
    console.error('Admin jobs service JWT signing secret is not configured');
    return {
      response: NextResponse.json({ error: 'Job service is not configured.' }, { status: 503 }),
    };
  }

  try {
    const { response, data } = await fetchBackendWithSecret(
      path,
      method,
      body,
      apiSecret,
      { id: sessionContext.actorId, role: 'admin' },
    );
    if (!response.ok) {
      const status = [400, 401, 403, 404, 409].includes(response.status)
        ? response.status
        : 502;
      console.error('Admin jobs backend request failed', response.status);
      return {
        response: NextResponse.json(
          { error: getErrorMessage(data, 'The job service could not complete the request.') },
          { status },
        ),
      };
    }
    return { response: null, data };
  } catch (error) {
    console.error('Could not connect to the admin jobs backend', error);
    return {
      response: NextResponse.json(
        { error: 'Could not connect to the job service.' },
        { status: 502 },
      ),
    };
  }
}
