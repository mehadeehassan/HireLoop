'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import SeekerPageHeader from './SeekerPageHeader';

type UpgradePlan = {
  planName: string;
  price: number;
  yearlyPrice: number;
  currency: string;
  monthlyApplicationLimit: number | null;
  features: string[];
};

type BillingPeriod = 'monthly' | 'yearly';

function formatPrice(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function fetchAvailablePlans(signal?: AbortSignal) {
  const response = await fetch('/api/billing/plans', { cache: 'no-store', signal });
  const result: unknown = await response.json();
  if (!response.ok || !isRecord(result) || !Array.isArray(result.plans)) {
    throw new Error(
      isRecord(result) && typeof result.error === 'string'
        ? result.error
        : 'Subscription plans could not be loaded.',
    );
  }
  const availablePlans = result.plans.filter(
    (plan): plan is UpgradePlan =>
      isRecord(plan) &&
      typeof plan.planName === 'string' &&
      typeof plan.price === 'number' &&
      typeof plan.yearlyPrice === 'number' &&
      typeof plan.currency === 'string' &&
      /^[a-z]{3}$/i.test(plan.currency) &&
      Number.isFinite(plan.price) &&
      Number.isFinite(plan.yearlyPrice) &&
      (typeof plan.monthlyApplicationLimit === 'number' ||
        plan.monthlyApplicationLimit === null) &&
      Array.isArray(plan.features) &&
      plan.features.every((feature) => typeof feature === 'string'),
  );
  if (availablePlans.length === 0) throw new Error('No subscription plans are available.');
  return {
    plans: availablePlans,
    currentPlan: typeof result.currentPlan === 'string' ? result.currentPlan : 'Starter',
  };
}

const planRank: Record<string, number> = { Starter: 0, Growth: 1, Premium: 2 };

export default function SeekerUpgrade() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [plans, setPlans] = useState<UpgradePlan[]>([]);
  const [currentPlan, setCurrentPlan] = useState('Starter');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkoutPending, setCheckoutPending] = useState(false);

  function retryPlans() {
    setLoading(true);
    setError('');
    void fetchAvailablePlans()
      .then((result) => {
        setPlans(result.plans);
        setCurrentPlan(result.currentPlan);
      })
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : 'Subscription plans could not be loaded.');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const controller = new AbortController();
    if (new URLSearchParams(window.location.search).get('checkout') === 'cancelled') {
      toast.info('Checkout was cancelled. Your current plan has not changed.');
      window.history.replaceState({}, '', window.location.pathname);
    }
    fetchAvailablePlans(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setPlans(result.plans);
        setCurrentPlan(result.currentPlan);
      })
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : 'Subscription plans could not be loaded.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  async function startCheckout(planName: string) {
    if (checkoutPending || (planRank[planName] ?? -1) <= (planRank[currentPlan] ?? 0)) return;
    setCheckoutPending(true);
    try {
      const response = await fetch('/api/checkout_sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planName,
          billingInterval: billingPeriod === 'yearly' ? 'year' : 'month',
        }),
      });
      const result: unknown = await response.json();
      if (!response.ok || !isRecord(result)) {
        throw new Error(
          isRecord(result) && typeof result.error === 'string'
            ? result.error
            : 'Checkout could not be started.',
        );
      }
      if (result.upgraded === true && result.planName === planName) {
        setCurrentPlan(planName);
        toast.success(`${planName} is now your active plan.`);
        setCheckoutPending(false);
        return;
      }
      if (typeof result.url !== 'string') {
        throw new Error('Checkout could not be started.');
      }
      window.location.assign(result.url);
    } catch (checkoutError) {
      toast.error(checkoutError instanceof Error ? checkoutError.message : 'Checkout could not be started.');
      setCheckoutPending(false);
    }
  }

  const orderedPlans = [...plans].sort(
    (first, second) =>
      ['Starter', 'Growth', 'Premium'].indexOf(first.planName) -
      ['Starter', 'Growth', 'Premium'].indexOf(second.planName),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-7">
      <SeekerPageHeader
        title="Choose a seeker plan"
        description="Compare all available plans and choose what works for your job search."
      />

      <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
        <div className="inline-flex items-center rounded-full border border-[#303036] bg-[#131316] p-1" role="group" aria-label="Billing period">
          {(['monthly', 'yearly'] as const).map((period) => (
            <button
              key={period}
              type="button"
              aria-pressed={billingPeriod === period}
              onClick={() => setBillingPeriod(period)}
              className={`min-h-9 rounded-full px-4 text-[11px] capitalize transition ${
                billingPeriod === period ? 'bg-white text-[#151517]' : 'text-[#dedee3] hover:bg-white/5'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
        <span className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-[10px] text-emerald-300">
          Yearly saves 25%
        </span>
      </div>

      {error && (
        <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
          <span>{error}</span>
          <button type="button" onClick={retryPlans} className="rounded border border-red-300/20 px-3 py-1.5 hover:bg-white/5">
            Retry
          </button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {loading
          ? [0, 1, 2].map((item) => (
              <div key={item} className="h-[420px] animate-pulse rounded-xl border border-[#26262b] bg-[#131316]" />
            ))
          : orderedPlans.map((plan) => {
          const isCurrentPlan = currentPlan.toLowerCase() === plan.planName.toLowerCase();
          const monthlyPrice = billingPeriod === 'yearly' ? plan.yearlyPrice / 12 : plan.price;
          const isPaidPlan = plan.planName !== 'Starter';
          const canSelectPlan = isPaidPlan && (planRank[plan.planName] ?? -1) > (planRank[currentPlan] ?? 0);
          const planLimit = plan.monthlyApplicationLimit;
          return (
          <section
            key={plan.planName}
            className={`flex flex-col rounded-xl border bg-[#131316] p-5 sm:p-6 ${
              plan.planName === 'Growth'
                ? 'border-[#8178ff]/40 shadow-[0_20px_70px_rgba(27,25,82,.2)]'
                : 'border-[#26262b]'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="rounded-full bg-[#8178ff]/15 px-3 py-1 text-[10px] font-medium text-[#c2bdff]">
                  Seeker plan
                </span>
                <h2 className="mt-4 text-xl font-semibold text-white">{plan.planName}</h2>
              </div>
              {plan.planName === 'Growth' && (
                <span className="rounded-full border border-[#8178ff]/30 px-3 py-1.5 text-[10px] text-[#c2bdff]">
                  Popular
                </span>
              )}
            </div>
            <p className="mt-4 text-2xl font-semibold text-white">
              {!isPaidPlan
                ? 'Free'
                : formatPrice(monthlyPrice, plan.currency)}
              {isPaidPlan && (
                <span className="ml-1 text-[10px] font-normal text-[#92929b]">/month</span>
              )}
            </p>
            {billingPeriod === 'yearly' && isPaidPlan && (
              <p className="mt-1 text-[10px] text-[#92929b]">
                {formatPrice(plan.yearlyPrice, plan.currency)} billed yearly
              </p>
            )}
            <p className="mt-2 min-h-10 text-xs leading-5 text-[#a2a2ab]">
              {planLimit === null
                ? 'Plan features and limits for your job search.'
                : `Up to ${planLimit} job applications each month.`}
            </p>

            <ul className="mt-5 flex-1 space-y-3 border-t border-[#26262b] pt-5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-xs text-[#dedee3]">
                  <span
                    className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] text-emerald-400"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => {
                if (!canSelectPlan) return;
                void startCheckout(plan.planName);
              }}
              disabled={!canSelectPlan || checkoutPending}
              className={`mt-6 h-10 rounded-md px-5 text-[11px] font-semibold transition ${
                plan.planName === 'Growth'
                  ? 'bg-[#6258ff] text-white hover:bg-[#7168ff]'
                  : 'border border-[#303036] text-[#dedee3] hover:bg-white/5'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {isCurrentPlan
                ? 'Current plan'
                : !isPaidPlan
                  ? 'Included'
                  : checkoutPending
                    ? 'Connecting to Stripe…'
                    : canSelectPlan
                      ? currentPlan === 'Starter'
                        ? `Purchase ${plan.planName}`
                        : `Upgrade to ${plan.planName}`
                      : 'Unavailable'}
            </button>
          </section>
          );
        })}
      </div>

      {currentPlan !== 'Starter' && (
        <p className="mt-5 rounded-lg border border-[#8178ff]/20 bg-[#8178ff]/5 p-3 text-[10px] leading-5 text-[#d3d0ff]">
          Your current paid plan is active. Manage billing from your{' '}
          <Link href="/dashboard/seeker/billing" className="underline underline-offset-2">billing page</Link>.
        </p>
      )}

      <Link
        href="/dashboard/seeker"
        className="mt-5 inline-flex h-10 items-center rounded-md border border-[#303036] px-4 text-[11px] text-[#dedee3] transition hover:bg-white/5"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
