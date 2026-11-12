'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import RecruiterPageHeader from './RecruiterPageHeader';

type UpgradePlan = {
  planName: string;
  price: number;
  yearlyPrice: number;
  currency: string;
  monthlyJobPostLimit: number | null;
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
      (typeof plan.monthlyJobPostLimit === 'number' || plan.monthlyJobPostLimit === null) &&
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

export default function RecruiterUpgrade() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [plans, setPlans] = useState<UpgradePlan[]>([]);
  const [currentPlan, setCurrentPlan] = useState('Starter');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [portalPending, setPortalPending] = useState(false);

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

  async function openBillingPortal() {
    if (portalPending) return;
    setPortalPending(true);
    try {
      const response = await fetch('/api/billing/portal-session', { method: 'POST' });
      const result: unknown = await response.json();
      if (!response.ok || !isRecord(result) || typeof result.url !== 'string') {
        throw new Error(
          isRecord(result) && typeof result.error === 'string'
            ? result.error
            : 'Billing management could not be opened.',
        );
      }
      window.location.assign(result.url);
    } catch (portalError) {
      toast.error(portalError instanceof Error ? portalError.message : 'Billing management could not be opened.');
      setPortalPending(false);
    }
  }

  const orderedPlans = [...plans].sort(
    (first, second) =>
      ['Starter', 'Growth', 'Premium'].indexOf(first.planName) -
      ['Starter', 'Growth', 'Premium'].indexOf(second.planName),
  );

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <RecruiterPageHeader
        eyebrow="Plans"
        title="Choose a recruiter plan"
        description="Compare the available plans and choose the one that fits your hiring needs."
      />

      <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
        <div className="inline-flex items-center rounded-full border border-[#252d43] bg-[#111827] p-1" role="group" aria-label="Billing period">
          {(['monthly', 'yearly'] as const).map((period) => (
            <button
              key={period}
              type="button"
              aria-pressed={billingPeriod === period}
              onClick={() => setBillingPeriod(period)}
              className={`min-h-9 rounded-full px-4 text-[11px] capitalize transition ${
                billingPeriod === period ? 'bg-white text-[#151517]' : 'text-[#c5ccda] hover:bg-white/5'
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
        <div role="alert" className="mx-auto mb-5 flex max-w-6xl flex-wrap items-center justify-between gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
          <span>{error}</span>
          <button type="button" onClick={retryPlans} className="rounded border border-red-300/20 px-3 py-1.5 hover:bg-white/5">
            Retry
          </button>
        </div>
      )}

      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-3">
        {loading
          ? [0, 1, 2].map((item) => (
              <div key={item} className="h-[440px] animate-pulse rounded-xl border border-[#252d43] bg-[#111827]/70" />
            ))
          : orderedPlans.map((plan) => {
          const isCurrentPlan = currentPlan.toLowerCase() === plan.planName.toLowerCase();
          const isPaidPlan = plan.planName !== 'Starter';
          const canSelectPlan = isPaidPlan && (planRank[plan.planName] ?? -1) > (planRank[currentPlan] ?? 0);
          const monthlyPrice = billingPeriod === 'yearly' ? plan.yearlyPrice / 12 : plan.price;
          const planLimit = plan.monthlyJobPostLimit;
          return (
          <section
            key={plan.planName}
            className={`flex flex-col rounded-xl border bg-[#111827]/70 p-6 sm:p-8 ${
              plan.planName === 'Growth'
                ? 'border-[#6258ff]/40 shadow-[0_20px_70px_rgba(27,25,82,.2)]'
                : 'border-[#252d43]'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="rounded-full bg-[#6258ff]/15 px-3 py-1 text-[10px] font-medium text-[#b8b2ff]">
                  Recruiter plan
                </span>
                <h2 className="mt-4 text-2xl font-semibold text-white">{plan.planName}</h2>
              </div>
              {plan.planName === 'Growth' && (
                <span className="rounded-full border border-[#6258ff]/30 px-3 py-1.5 text-[10px] text-[#b8b2ff]">
                  Popular
                </span>
              )}
            </div>
            <p className="mt-4 text-2xl font-semibold text-white">
              {!isPaidPlan
                ? 'Free'
                : formatPrice(monthlyPrice, plan.currency)}
              {isPaidPlan && (
                <span className="ml-1 text-[10px] font-normal text-[#9ba4b7]">/month</span>
              )}
            </p>
            {billingPeriod === 'yearly' && isPaidPlan && (
              <p className="mt-1 text-[10px] text-[#9ba4b7]">
                {formatPrice(plan.yearlyPrice, plan.currency)} billed yearly
              </p>
            )}
            <p className="mt-2 min-h-10 text-xs leading-5 text-[#9ba4b7]">
              {planLimit === null
                ? 'Plan features and limits for your hiring team.'
                : `Up to ${planLimit} job posts each month.`}
            </p>

            <ul className="mt-6 flex-1 space-y-3 border-t border-[#252d43] pt-6">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-xs text-[#d7dbea]">
                  <span
                    className="flex size-5 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] text-emerald-400"
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
              className={`mt-7 h-10 rounded-md px-5 text-[11px] font-semibold transition ${
                plan.planName === 'Growth'
                  ? 'bg-[#6258ff] text-white hover:bg-[#7168ff]'
                  : 'border border-[#303a55] text-[#c5ccda] hover:bg-white/5'
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
        <div className="mx-auto mt-5 flex max-w-5xl flex-wrap items-center justify-between gap-3 rounded-lg border border-[#6258ff]/20 bg-[#6258ff]/5 p-3 text-[10px] leading-5 text-[#d3d0ff]">
          <p>Your current paid plan is active. Manage billing securely through Stripe.</p>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/recruiter/billing" className="rounded border border-[#6258ff]/30 px-3 py-1.5 hover:bg-white/5">
              Billing details
            </Link>
            <button type="button" onClick={() => void openBillingPortal()} disabled={portalPending} className="rounded border border-[#6258ff]/30 px-3 py-1.5 hover:bg-white/5 disabled:opacity-50">
              {portalPending ? 'Opening…' : 'Manage billing'}
            </button>
          </div>
        </div>
      )}

      <Link
        href="/dashboard/recruiter"
        className="mt-5 inline-flex h-10 items-center rounded-md border border-[#303a55] px-4 text-[11px] text-[#c5ccda] transition hover:bg-white/5"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
