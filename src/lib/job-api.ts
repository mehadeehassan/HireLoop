import 'server-only';

import { createHmac, randomUUID } from 'node:crypto';

const backendUrl = () =>
  (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
const serviceTokenLifetimeSeconds = 120;
export type ServiceActor = {
  id: string;
  role: 'seeker' | 'recruiter' | 'admin';
};

function createBackendJwt(secret: string, actor: ServiceActor) {
  if (Buffer.byteLength(secret) < 32) {
    throw new Error('HIRELOOP_JWT_SECRET must be at least 32 bytes.');
  }
  if (!actor.id.trim() || !['seeker', 'recruiter', 'admin'].includes(actor.role)) {
    throw new Error('A valid authenticated actor is required for this backend request.');
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iss: 'hireloop-nextjs',
      aud: 'hireloop-server',
      sub: 'hireloop-nextjs',
      iat: issuedAt,
      exp: issuedAt + serviceTokenLifetimeSeconds,
      jti: randomUUID(),
      actor: { id: actor.id, role: actor.role },
    }),
  ).toString('base64url');
  const signingInput = `${header}.${payload}`;
  const signature = createHmac('sha256', secret).update(signingInput).digest('base64url');

  return `${signingInput}.${signature}`;
}

function getBackendAuthHeader(secret: string, actor: ServiceActor): Record<string, string> {
  return { Authorization: `Bearer ${createBackendJwt(secret, actor)}` };
}

async function fetchBackend(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
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
  options?: {
    id?: string;
    body?: unknown;
    query?: string;
    apiSecret?: string;
    actor?: ServiceActor;
  },
) {
  if (options?.apiSecret && !options.actor) {
    throw new Error('An authenticated actor is required for protected backend requests.');
  }
  if (method !== 'GET' && (!options?.apiSecret || !options.actor)) {
    throw new Error('A server-to-server JWT and authenticated actor are required for job changes.');
  }

  const path = options?.id
    ? `/jobs/${encodeURIComponent(options.id)}`
    : '/jobs';
  const query = options?.query ? `?${options.query.replace(/^\?/, '')}` : '';

  return fetchBackend(
    `${path}${query}`,
    method,
    options?.body,
    options?.apiSecret && options.actor
      ? getBackendAuthHeader(options.apiSecret, options.actor)
      : undefined,
  );
}

export async function submitBackendApplication(
  application: Record<string, unknown>,
  apiSecret: string,
  actor: ServiceActor,
) {
  return fetchBackend('/applications', 'POST', application, getBackendAuthHeader(apiSecret, actor));
}

export async function fetchBackendApplications(
  candidateId: string,
  apiSecret: string,
  actor: ServiceActor,
) {
  const query = new URLSearchParams({ candidateId }).toString();
  return fetchBackend(
    `/applications?${query}`,
    'GET',
    undefined,
    getBackendAuthHeader(apiSecret, actor),
  );
}

export async function fetchBackendWithSecret(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  body: Record<string, unknown> | undefined,
  apiSecret: string,
  actor: ServiceActor,
) {
  return fetchBackend(path, method, body, getBackendAuthHeader(apiSecret, actor));
}

export async function fetchBackendResponse(
  path: string,
  method: 'GET' | 'DELETE',
  apiSecret: string,
  actor: ServiceActor,
) {
  return fetch(`${backendUrl()}${path}`, {
    method,
    headers: getBackendAuthHeader(apiSecret, actor),
    cache: 'no-store',
  });
}

export async function fetchBackendUsage(
  role: 'seeker' | 'recruiter',
  userId: string,
  apiSecret: string,
  actor: ServiceActor,
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
    getBackendAuthHeader(apiSecret, actor),
  );
}
