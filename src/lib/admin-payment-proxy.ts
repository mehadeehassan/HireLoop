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

export async function proxyAdminPaymentRequest(path: string): Promise<BackendResult> {
  const sessionContext = await getActiveAdminSession();
  if (isAdminSessionResponse(sessionContext)) return { response: sessionContext };

  const apiSecret = process.env.HIRELOOP_JWT_SECRET;
  if (!apiSecret) {
    console.error('Admin payments service JWT signing secret is not configured');
    return {
      response: NextResponse.json(
        { error: 'Payment service is not configured.' },
        { status: 503 },
      ),
    };
  }

  try {
    const { response, data } = await fetchBackendWithSecret(
      path,
      'GET',
      undefined,
      apiSecret,
      { id: sessionContext.actorId, role: 'admin' },
    );
    if (!response.ok) {
      const status = [400, 401, 403, 404].includes(response.status)
        ? response.status
        : 502;
      console.error('Admin payments backend request failed', response.status);
      return {
        response: NextResponse.json(
          {
            error: getErrorMessage(
              data,
              'The payment service could not complete the request.',
            ),
          },
          { status },
        ),
      };
    }
    return { response: null, data };
  } catch (error) {
    console.error('Could not connect to the admin payments backend', error);
    return {
      response: NextResponse.json(
        { error: 'Could not connect to the payment service.' },
        { status: 502 },
      ),
    };
  }
}
