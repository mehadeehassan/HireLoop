type UpgradePlanBase = {
  planName: string;
  price: number;
  yearlyPrice: number;
  currency: string;
  features: string[];
};

export type UpgradePlanWithLimit<Key extends string> = UpgradePlanBase & Record<Key, number | null>;

type AvailablePlans<Plan> = {
  plans: Plan[];
  currentPlan: string;
  hasActiveStripeSubscription: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isUpgradePlanWithLimit<Key extends string>(
  value: unknown,
  limitKey: Key,
): value is UpgradePlanWithLimit<Key> {
  return (
    isRecord(value) &&
    typeof value.planName === 'string' &&
    typeof value.price === 'number' &&
    typeof value.yearlyPrice === 'number' &&
    typeof value.currency === 'string' &&
    /^[a-z]{3}$/i.test(value.currency) &&
    Number.isFinite(value.price) &&
    Number.isFinite(value.yearlyPrice) &&
    (typeof value[limitKey] === 'number' || value[limitKey] === null) &&
    Array.isArray(value.features) &&
    value.features.every((feature) => typeof feature === 'string')
  );
}

export async function fetchAvailablePlans<Plan>(
  isPlan: (value: unknown) => value is Plan,
  signal?: AbortSignal,
): Promise<AvailablePlans<Plan>> {
  const response = await fetch('/api/billing/plans', { cache: 'no-store', signal });
  const result: unknown = await response.json();
  if (!response.ok || !isRecord(result) || !Array.isArray(result.plans)) {
    throw new Error(
      isRecord(result) && typeof result.error === 'string'
        ? result.error
        : 'Subscription plans could not be loaded.',
    );
  }
  const availablePlans = result.plans.filter(isPlan);
  if (availablePlans.length === 0) throw new Error('No subscription plans are available.');
  return {
    plans: availablePlans,
    currentPlan: typeof result.currentPlan === 'string' ? result.currentPlan : 'Starter',
    hasActiveStripeSubscription: result.hasActiveStripeSubscription === true,
  };
}
