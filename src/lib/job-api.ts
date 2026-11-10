const backendUrl = () =>
  (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');

async function fetchBackend(path: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', body?: unknown) {
  const response = await fetch(`${backendUrl()}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
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
  options?: { id?: string; body?: unknown; query?: string },
) {
  const path = options?.id
    ? `/jobs/${encodeURIComponent(options.id)}`
    : '/jobs';
  const query = options?.query ? `?${options.query.replace(/^\?/, '')}` : '';

  return fetchBackend(`${path}${query}`, method, options?.body);
}

export async function submitBackendApplication(application: Record<string, unknown>) {
  return fetchBackend('/applications', 'POST', application);
}
