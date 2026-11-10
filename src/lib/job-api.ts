const backendUrl = () =>
  (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');

export async function fetchBackendJobs(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  options?: { id?: string; body?: unknown; query?: string },
) {
  const path = options?.id
    ? `/jobs/${encodeURIComponent(options.id)}`
    : '/jobs';
  const query = options?.query ? `?${options.query.replace(/^\?/, '')}` : '';

  const response = await fetch(`${backendUrl()}${path}${query}`, {
    method,
    headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options?.body ? JSON.stringify(options.body) : undefined,
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
