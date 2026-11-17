'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { getQuotaState, hasValidQuota } from '@/lib/quota';

type Role = 'seeker' | 'recruiter';

export default function QuotaUsage({
  role,
  remaining,
  limit,
  extraTokens,
  loading = false,
  error = '',
}: {
  role: Role;
  remaining: number | null;
  limit: number | null;
  extraTokens?: number;
  loading?: boolean;
  error?: string;
}) {
  const valid = hasValidQuota(remaining, limit);
  const state = getQuotaState(remaining, limit);
  const progress = valid
    ? Math.max(0, Math.min(100, (((limit as number) - remaining) / (limit as number)) * 100))
    : null;
  const resource = role === 'seeker' ? 'applications' : 'job posts';
  const barColor = state === 'normal' ? 'bg-[#8178ff]' : 'bg-rose-500';

  return (
    <section className="rounded-lg border border-white/[0.08] bg-black/15 p-4" aria-label="Monthly quota">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[11px] font-medium text-white">{role === 'seeker' ? 'Monthly applications' : 'Monthly job posts'}</h3>
        <p className="text-[10px] text-[#b8b8c2]">
          Remaining this month: {loading ? '—' : valid ? remaining : '—'}
          {valid ? ` / ${limit}` : ''}
          {Number.isSafeInteger(extraTokens) && (extraTokens as number) >= 0 && (
            <span className="ml-2">Extra tokens: {extraTokens}</span>
          )}
        </p>
      </div>

      {error && <p role="alert" className="mt-3 text-[10px] text-rose-300">{error}</p>}

      {progress !== null && (
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-label={`${role === 'seeker' ? 'Application' : 'Job post'} quota used`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <div className={`h-full transition-[width] ${barColor}`} style={{ width: `${progress}%` }} />
        </div>
      )}

      {state === 'low' && valid && (
        <p role="status" className="mt-3 flex items-start gap-2 text-[10px] leading-5 text-rose-300">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>Only {remaining} {resource} left this month. When your monthly limit ends, you can buy extra tokens.</span>
        </p>
      )}

      {state === 'exhausted' && (
        <p role="status" className="mt-3 flex items-start gap-2 text-[10px] leading-5 text-rose-300">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            Monthly limit reached. Buy extra tokens to keep going.{' '}
            <Link href={`/dashboard/${role}/billing#extra-tokens`} className="font-semibold text-rose-200 underline underline-offset-2 hover:text-white">
              Buy tokens
            </Link>
          </span>
        </p>
      )}
    </section>
  );
}
