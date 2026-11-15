import 'server-only';

import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

type BackendTiming = { name: string; ms: number };
type RequestTiming = {
  id: string;
  route: string;
  startedAt: number;
  session: Array<{ caller: string; ms: number; site: string[] }>;
  backend: BackendTiming[];
};

const requestTiming = new AsyncLocalStorage<RequestTiming>();

function duration(startedAt: number) {
  return Number((performance.now() - startedAt).toFixed(1));
}

export async function timeSessionLookup<T>(caller: string, lookup: () => Promise<T>) {
  const startedAt = performance.now();
  const site = new Error().stack?.split('\n').slice(2, 5).map((line) => line.trim()) ?? [];
  try {
    return await lookup();
  } finally {
    const ms = duration(startedAt);
    const context = requestTiming.getStore();
    if (context) context.session.push({ caller, ms, site });
    else console.info(JSON.stringify({ perf: true, session: { caller, ms, site } }));
  }
}

export function recordBackendCall(name: string, ms: number) {
  const context = requestTiming.getStore();
  const safeName = name.split('?')[0];
  if (context) context.backend.push({ name: safeName, ms: Number(ms.toFixed(1)) });
  else console.info(`[perf] backend name=${safeName} ms=${ms.toFixed(1)}`);
}

export function withRequestPerformance<TArgs extends unknown[]>(
  route: string,
  handler: (...args: TArgs) => Promise<Response>,
): (...args: TArgs) => Promise<Response> {
  return async (...args: TArgs) => {
    const context: RequestTiming = {
      id: randomUUID().slice(0, 8),
      route,
      startedAt: performance.now(),
      session: [],
      backend: [],
    };

    return requestTiming.run(context, async () => {
      let status = 'error';
      try {
        const response = await handler(...args);
        status = String(response.status);
        return response;
      } finally {
        console.info(JSON.stringify({
          perf: true,
          id: context.id,
          route: context.route,
          session: context.session,
          backend: context.backend,
          totalMs: duration(context.startedAt),
          status,
        }));
      }
    });
  };
}
