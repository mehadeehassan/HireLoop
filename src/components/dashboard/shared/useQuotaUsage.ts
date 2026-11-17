'use client';

import { useEffect, useState } from 'react';

export type QuotaUsage = {
  remaining: number | null;
  limit: number | null;
  extraTokens?: number;
};

type Role = 'seeker' | 'recruiter';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export default function useQuotaUsage(role: Role) {
  const [usage, setUsage] = useState<QuotaUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;

    async function load() {
      controller?.abort();
      const requestController = new AbortController();
      controller = requestController;
      try {
        const endpoint = role === 'seeker'
          ? '/api/seeker/applications/count'
          : '/api/recruiter/jobs/count';
        const response = await fetch(endpoint, { cache: 'no-store', signal: requestController.signal });
        const data: unknown = await response.json().catch(() => null);
        if (!response.ok || !isRecord(data)) {
          throw new Error(isRecord(data) && typeof data.error === 'string'
            ? data.error
            : 'Monthly quota could not be loaded.');
        }

        const remainingField = role === 'seeker' ? data.remainingApplications : data.remainingJobPosts;
        setUsage({
          remaining: Number.isSafeInteger(remainingField) ? remainingField as number : null,
          limit: Number.isSafeInteger(data.monthlyLimit) && (data.monthlyLimit as number) > 0
            ? data.monthlyLimit as number
            : null,
          ...(Number.isSafeInteger(data.extraTokens) && (data.extraTokens as number) >= 0
            ? { extraTokens: data.extraTokens as number }
            : {}),
        });
        setError('');
      } catch (loadError) {
        if (!active || requestController.signal.aborted) return;
        setUsage(null);
        setError(loadError instanceof Error ? loadError.message : 'Monthly quota could not be loaded.');
      } finally {
        if (active && !requestController.signal.aborted) setLoading(false);
      }
    }

    const refresh = () => void load();
    void Promise.resolve().then(load);
    window.addEventListener('focus', refresh);
    const interval = window.setInterval(refresh, 60_000);
    return () => {
      active = false;
      controller?.abort();
      window.removeEventListener('focus', refresh);
      window.clearInterval(interval);
    };
  }, [role]);

  return { usage, loading, error };
}
