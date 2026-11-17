export type QuotaState = 'normal' | 'low' | 'exhausted';

export function hasValidQuota(remaining: unknown, limit: unknown): remaining is number {
  return Number.isSafeInteger(remaining) && Number.isSafeInteger(limit) && (limit as number) > 0;
}

export function getQuotaState(remaining: unknown, limit: unknown): QuotaState {
  if (!hasValidQuota(remaining, limit)) return 'normal';
  const lowThreshold = Math.min(5, Math.ceil((limit as number) * 0.1));
  if (remaining <= 0) return 'exhausted';
  if (remaining <= lowThreshold) return 'low';
  return 'normal';
}
