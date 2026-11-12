const backendUrl = () =>
  (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');

async function fetchBackend(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
  additionalHeaders?: HeadersInit,
) {
  const response = await fetch(`${backendUrl()}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...additionalHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });

  const responseText = await response.text();
  let responseData: unknown = null;
  if (responseText) {
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }
  }

  return { response, data: responseData };
}

export async function fetchBackendJobs(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  options?: { id?: string; body?: unknown; query?: string; apiSecret?: string },
) {
  const path = options?.id
    ? `/jobs/${encodeURIComponent(options.id)}`
    : '/jobs';
  const query = options?.query ? `?${options.query.replace(/^\?/, '')}` : '';

  return fetchBackend(
    `${path}${query}`,
    method,
    options?.body,
    options?.apiSecret ? { Authorization: `Bearer ${options.apiSecret}` } : undefined,
  );
}

export async function submitBackendApplication(
  application: Record<string, unknown>,
  apiSecret?: string,
) {
  return fetchBackend('/applications', 'POST', application, {
    ...(apiSecret ? { Authorization: `Bearer ${apiSecret}` } : {}),
  });
}

export async function fetchBackendApplications(candidateId: string, apiSecret: string) {
  const query = new URLSearchParams({ candidateId }).toString();
  return fetchBackend(`/applications?${query}`, 'GET', undefined, {
    Authorization: `Bearer ${apiSecret}`,
  });
}

export async function fetchBackendWithSecret(
  path: string,
  method: 'GET' | 'POST' | 'PATCH',
  body: Record<string, unknown> | undefined,
  apiSecret: string,
) {
  return fetchBackend(path, method, body, {
    Authorization: `Bearer ${apiSecret}`,
  });
}

export async function fetchBackendUsage(
  role: 'seeker' | 'recruiter',
  userId: string,
  apiSecret?: string,
) {
  const isSeeker = role === 'seeker';
  const query = new URLSearchParams({
    [isSeeker ? 'candidateId' : 'recruiterId']: userId,
  }).toString();
  const path = isSeeker ? '/applications/count' : '/jobs/count';

  return fetchBackend(
    `${path}?${query}`,
    'GET',
    undefined,
    apiSecret ? { Authorization: `Bearer ${apiSecret}` } : undefined,
  );
}
