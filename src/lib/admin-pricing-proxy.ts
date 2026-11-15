import { getActiveAdminSession, isAdminSessionResponse } from '@/lib/admin-server-auth';
import { fetchBackendWithSecret } from '@/lib/job-api';
import { NextResponse } from 'next/server';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH';

function errorMessage(data: unknown) {
  return typeof data === 'object' && data !== null && 'message' in data &&
    typeof data.message === 'string'
    ? data.message
    : 'The pricing service could not complete the request.';
}

export async function proxyAdminPricingRequest(
  path: string,
  method: Method,
  body?: Record<string, unknown>,
) {
  const context = await getActiveAdminSession();
  if (isAdminSessionResponse(context)) return { response: context, data: undefined };
  const secret = process.env.HIRELOOP_JWT_SECRET;
  if (!secret) {
    return {
      response: NextResponse.json({ error: 'Pricing service is not configured.' }, { status: 503 }),
      data: undefined,
    };
  }
  try {
    const result = await fetchBackendWithSecret(
      path,
      method,
      body,
      secret,
      { id: context.actorId, role: 'admin' },
    );
    if (!result.response.ok) {
      const status = [400, 401, 403, 404, 409].includes(result.response.status)
        ? result.response.status
        : 502;
      return {
        response: NextResponse.json({ error: errorMessage(result.data) }, { status }),
        data: undefined,
      };
    }
    return { response: null, data: result.data };
  } catch (error) {
    console.error('Could not connect to admin pricing backend', error);
    return {
      response: NextResponse.json({ error: 'Could not connect to the pricing service.' }, { status: 502 }),
      data: undefined,
    };
  }
}
