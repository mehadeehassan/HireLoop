'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import DashboardIcon from '@/components/dashboard/shared/DashboardIcon';
import BillingHistory, { type BillingInvoiceRow } from '@/components/dashboard/shared/BillingHistory';
import type { SeekerProfile } from './seeker-data';
import SeekerPageHeader from './SeekerPageHeader';

type PaymentMethod = {
  id: string;
  brand: string;
  last4: string;
  expiryMonth: number | null;
  expiryYear: number | null;
  isDefault: boolean;
};

type BillingSummary = {
  subscription: {
    plan: string;
    amountMinor: number;
    currency: string;
    interval: string;
    nextBillingDate: string;
    status: string;
    startDate: string;
    expiryDate: string;
    monthlyLimit: number;
    usedCount: number;
    remainingCount: number;
    nextResetDate: string;
    features: string[];
  } | null;
  paymentMethods: PaymentMethod[];
  invoices: BillingInvoiceRow[];
  plans: {
    planName: string;
    price: number;
    yearlyPrice: number;
    currency: string;
    monthlyApplicationLimit: number | null;
    monthlyJobPostLimit: number | null;
    features: string[];
  }[];
};

const emptyBilling: BillingSummary = {
  subscription: null,
  paymentMethods: [],
  invoices: [],
  plans: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizePlan(plan: string) {
  const value = plan.trim().toLowerCase();
  if (value === 'free') return 'Starter';
  if (value === 'growth') return 'Growth';
  if (value === 'premium') return 'Premium';
  return 'Starter';
}

function parseBillingSummary(value: unknown): BillingSummary {
  if (
    !isRecord(value) ||
    !Array.isArray(value.paymentMethods) ||
    !Array.isArray(value.invoices) ||
    !Array.isArray(value.plans)
  ) {
    throw new Error('The billing service returned an unexpected response.');
  }

  const paymentMethods = value.paymentMethods.filter(
    (method): method is PaymentMethod =>
      isRecord(method) &&
      typeof method.id === 'string' &&
      typeof method.brand === 'string' &&
      typeof method.last4 === 'string' &&
      /^\d{4}$/.test(method.last4) &&
      (typeof method.expiryMonth === 'number' || method.expiryMonth === null) &&
      (typeof method.expiryYear === 'number' || method.expiryYear === null) &&
      typeof method.isDefault === 'boolean',
  );
  const invoices = value.invoices.filter(
    (invoice): invoice is BillingInvoiceRow =>
      isRecord(invoice) &&
      typeof invoice.id === 'string' &&
      (typeof invoice.paymentId === 'string' || invoice.paymentId === null) &&
      (typeof invoice.checkoutSessionId === 'string' || invoice.checkoutSessionId === null) &&
      typeof invoice.number === 'string' &&
      typeof invoice.date === 'string' &&
      typeof invoice.plan === 'string' &&
      typeof invoice.amountMinor === 'number' &&
      typeof invoice.currency === 'string' &&
      typeof invoice.status === 'string' &&
      (typeof invoice.invoiceUrl === 'string' || invoice.invoiceUrl === null) &&
      (typeof invoice.invoicePdfUrl === 'string' || invoice.invoicePdfUrl === null),
  );

  let subscription: BillingSummary['subscription'] = null;
  if (value.subscription !== null) {
    if (
      !isRecord(value.subscription) ||
      typeof value.subscription.plan !== 'string' ||
      typeof value.subscription.amountMinor !== 'number' ||
      typeof value.subscription.currency !== 'string' ||
      typeof value.subscription.interval !== 'string' ||
      typeof value.subscription.nextBillingDate !== 'string' ||
      typeof value.subscription.status !== 'string' ||
      typeof value.subscription.startDate !== 'string' ||
      typeof value.subscription.expiryDate !== 'string' ||
      typeof value.subscription.monthlyLimit !== 'number' ||
      typeof value.subscription.usedCount !== 'number' ||
      typeof value.subscription.remainingCount !== 'number' ||
      typeof value.subscription.nextResetDate !== 'string' ||
      !Array.isArray(value.subscription.features) ||
      !value.subscription.features.every((feature) => typeof feature === 'string')
    ) {
      throw new Error('The billing service returned invalid subscription details.');
    }
    subscription = {
      plan: value.subscription.plan,
      amountMinor: value.subscription.amountMinor,
      currency: value.subscription.currency,
      interval: value.subscription.interval,
      nextBillingDate: value.subscription.nextBillingDate,
      status: value.subscription.status,
      startDate: value.subscription.startDate,
      expiryDate: value.subscription.expiryDate,
      monthlyLimit: value.subscription.monthlyLimit,
      usedCount: value.subscription.usedCount,
      remainingCount: value.subscription.remainingCount,
      nextResetDate: value.subscription.nextResetDate,
      features: value.subscription.features,
    };
  }

  const plans = value.plans.filter(
    (plan): plan is BillingSummary['plans'][number] =>
      isRecord(plan) &&
      typeof plan.planName === 'string' &&
      typeof plan.price === 'number' &&
      typeof plan.yearlyPrice === 'number' &&
      typeof plan.currency === 'string' &&
      (typeof plan.monthlyApplicationLimit === 'number' ||
        plan.monthlyApplicationLimit === null) &&
      (typeof plan.monthlyJobPostLimit === 'number' || plan.monthlyJobPostLimit === null) &&
      Array.isArray(plan.features) &&
      plan.features.every((feature) => typeof feature === 'string'),
  );

  return { subscription, paymentMethods, invoices, plans };
}

function parseVerifiedPaymentMethod(value: unknown): PaymentMethod | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.brand !== 'string' ||
    typeof value.last4 !== 'string' ||
    !value.brand.trim() ||
    !/^\d{4}$/.test(value.last4) ||
    (typeof value.expiryMonth !== 'number' && value.expiryMonth !== null) ||
    (typeof value.expiryYear !== 'number' && value.expiryYear !== null) ||
    typeof value.isDefault !== 'boolean'
  ) {
    return null;
  }
  return {
    id: value.id,
    brand: value.brand,
    last4: value.last4,
    expiryMonth: value.expiryMonth,
    expiryYear: value.expiryYear,
    isDefault: value.isDefault,
  };
}

function formatMoney(amountMinor: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amountMinor / 100);
  } catch {
    return `${(amountMinor / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function formatDate(value: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

function statusStyle(status: string) {
  const value = status.toLowerCase();
  if (/paid|succeeded|active/i.test(value)) return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
  if (/open|pending|draft/i.test(value)) return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
  if (/void|uncollectible|failed/i.test(value)) return 'border-red-500/20 bg-red-500/10 text-red-300';
  return 'border-white/10 bg-white/5 text-[#b8b8c2]';
}

export default function SeekerBilling() {
  const [profile, setProfile] = useState<SeekerProfile | null>(null);
  const [billing, setBilling] = useState(emptyBilling);
  const [loading, setLoading] = useState(true);
  const [billingError, setBillingError] = useState('');
  const [profileError, setProfileError] = useState('');
  const [action, setAction] = useState<'setup' | 'portal' | null>(null);
  const [verifyingPaymentMethod, setVerifyingPaymentMethod] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let initialLoadTimer: number | null = null;
    let verificationStatusTimer: number | null = null;
    const scheduleInitialLoad = () => {
      initialLoadTimer = window.setTimeout(() => void loadBilling(), 0);
    };
    async function loadBilling() {
      const [profileResult, billingResult] = await Promise.allSettled([
        fetch('/api/seeker/profile', { cache: 'no-store', signal: controller.signal }),
        fetch('/api/seeker/billing', { cache: 'no-store', signal: controller.signal }),
      ]);
      if (controller.signal.aborted) return;

      setBillingError('');
      setProfileError('');
      if (profileResult.status === 'fulfilled' && profileResult.value.ok) {
        try {
          const profileData: unknown = await profileResult.value.json();
          if (isRecord(profileData)) setProfile(profileData as SeekerProfile);
          else setProfileError('Your profile returned an unexpected response.');
        } catch {
          setProfileError('Your profile returned an unexpected response.');
        }
      } else {
        setProfileError('Your current plan could not be loaded.');
      }

      if (billingResult.status === 'fulfilled' && billingResult.value.ok) {
        try {
          const summary: unknown = await billingResult.value.json();
          setBilling(parseBillingSummary(summary));
        } catch (loadError) {
          setBillingError(
            loadError instanceof Error ? loadError.message : 'Billing details could not be loaded.',
          );
        }
      } else if (billingResult.status === 'fulfilled') {
        const errorData: unknown = await billingResult.value.json().catch(() => null);
        setBillingError(
          isRecord(errorData) && typeof errorData.error === 'string'
            ? errorData.error
            : 'Billing details are not available from the payment service yet.',
        );
      } else if (!controller.signal.aborted) {
        setBillingError('Could not connect to the billing service.');
      }

      setLoading(false);
    }

    const searchParams = new URLSearchParams(window.location.search);
    const paymentResult = searchParams.get('payment');
    if (paymentResult === 'success') {
      const sessionId = searchParams.get('session_id');
      verificationStatusTimer = window.setTimeout(() => setVerifyingPaymentMethod(true), 0);
      void (async () => {
        let clearInvalidCheckoutReturn = false;
        try {
          let method: PaymentMethod | null = null;
          for (let attempt = 0; attempt < 4; attempt += 1) {
            const response = await fetch('/api/billing/payment-methods/verify-setup-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(sessionId ? { sessionId } : {}),
              signal: controller.signal,
            });
            const result: unknown = await response.json().catch(() => null);
            method =
              response.ok && isRecord(result)
                ? parseVerifiedPaymentMethod(result.paymentMethod)
                : null;

            if (method) break;
            if (response.ok) {
              throw new Error('The saved card could not be verified.');
            }
            if (![409, 502, 503].includes(response.status) || attempt === 3) {
              clearInvalidCheckoutReturn = response.status === 422;
              throw new Error(
                isRecord(result) && typeof result.error === 'string'
                  ? result.error
                  : 'The saved card could not be verified.',
              );
            }
            await new Promise((resolve) => window.setTimeout(resolve, 750 * (attempt + 1)));
          }
          if (!method) throw new Error('The saved card could not be verified.');

          const returnUrl = new URL(window.location.href);
          returnUrl.searchParams.delete('payment');
          returnUrl.searchParams.delete('session_id');
          window.history.replaceState(
            {},
            '',
            `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`,
          );

          const addVerifiedMethod = () => {
            setBilling((current) => ({
              ...current,
              paymentMethods: [
                method,
                ...current.paymentMethods.filter((item) => item.id !== method.id),
              ],
            }));
          };
          const refresh = loadBilling();
          addVerifiedMethod();
          void refresh.then(() => {
            if (!controller.signal.aborted) addVerifiedMethod();
          });
          toast.success('Card saved and verified.');
        } catch (verificationError) {
          if (controller.signal.aborted) return;
          if (clearInvalidCheckoutReturn) {
            const returnUrl = new URL(window.location.href);
            returnUrl.searchParams.delete('payment');
            returnUrl.searchParams.delete('session_id');
            window.history.replaceState(
              {},
              '',
              `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`,
            );
          }
          toast.error(
            verificationError instanceof Error
              ? verificationError.message
              : 'The saved card could not be verified.',
          );
          void loadBilling();
        } finally {
          if (!controller.signal.aborted) setVerifyingPaymentMethod(false);
        }
      })();
    } else if (paymentResult === 'cancelled') {
      scheduleInitialLoad();
      toast.info('Payment method setup was cancelled.');
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      scheduleInitialLoad();
    }

    return () => {
      if (initialLoadTimer !== null) window.clearTimeout(initialLoadTimer);
      if (verificationStatusTimer !== null) window.clearTimeout(verificationStatusTimer);
      controller.abort();
    };
  }, []);

  const currentPlan = normalizePlan(billing.subscription?.plan || profile?.plan || 'Starter');
  async function startBillingAction(nextAction: 'setup' | 'portal') {
    if (action) return;
    setAction(nextAction);
    try {
      const response = await fetch('/api/seeker/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: nextAction }),
      });
      const result: unknown = await response.json();
      if (!response.ok || !isRecord(result) || typeof result.url !== 'string') {
        const message =
          isRecord(result) && typeof result.error === 'string'
            ? result.error
            : 'The payment service could not start this action.';
        const code = isRecord(result) && typeof result.code === 'string' ? result.code : null;
        throw new Error(
          code ? `${message} (code: ${code})` : message,
        );
      }
      window.location.assign(result.url);
    } catch (error) {
      console.error(`Could not start billing ${nextAction} flow`, error);
      toast.error(error instanceof Error ? error.message : 'Could not start the billing flow.');
      setAction(null);
    }
  }

  const subscription = billing.subscription;
  const planAmount =
    subscription && normalizePlan(subscription.plan) === currentPlan
      ? formatMoney(subscription.amountMinor, subscription.currency)
      : currentPlan === 'Starter'
        ? '$0.00'
        : 'Managed by billing';
  const usagePercent = subscription?.monthlyLimit
    ? Math.min(100, (subscription.usedCount / subscription.monthlyLimit) * 100)
    : 0;

  return (
    <div id="billing-print-area" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-7">
      <SeekerPageHeader
        title="Subscription & Billing"
        description="Manage your plan, payment methods, and billing history."
      />

      {profileError && (
        <p role="alert" className="mb-4 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
          {profileError}
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <section className="rounded-xl border border-[#26262b] bg-[#131316] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="rounded bg-white px-2 py-1 text-[8px] font-medium uppercase tracking-wide text-[#27272d]">
                Current plan
              </span>
              <h2 className="mt-4 text-base font-semibold text-[#ededf2]">{currentPlan} Tier</h2>
              <span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[8px] uppercase tracking-wide ${statusStyle(subscription?.status || 'active')}`}>
                {subscription?.status || 'active'}
              </span>
              <p className="mt-1 max-w-md text-[11px] leading-5 text-[#92929b]">
                {currentPlan === 'Starter'
                  ? 'Explore opportunities, save jobs, and keep track of your applications.'
                  : 'Your subscription and plan changes are managed securely by the billing provider.'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-white">
                {loading ? '—' : planAmount}
                <span className="text-[10px] font-normal text-[#92929b]">
                  {currentPlan === 'Starter' ? ' / month' : subscription ? ` / ${subscription.interval}` : ''}
                </span>
              </p>
              {subscription?.nextBillingDate && (
                <p className="mt-1 text-[9px] text-[#92929b]">
                  {currentPlan === 'Starter' ? 'Plan renews:' : 'Plan expires:'}{' '}
                  {formatDate(subscription.nextBillingDate)}
                </p>
              )}
            </div>
          </div>

          <ul className="mt-6 grid gap-3 border-t border-[#26262b] pt-5 sm:grid-cols-2">
            {(subscription?.features || []).map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-[10px] text-[#c5c5cc]">
                <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500/15 text-[9px] text-emerald-400" aria-hidden="true">✓</span>
                {feature}
              </li>
            ))}
          </ul>

          <div className="mt-5 rounded-lg border border-[#26262b] bg-[#101013] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-[10px] font-medium text-[#d9d9df]">Monthly applications</h3>
                <p className="mt-1 text-[9px] text-[#85858e]">
                  {subscription?.usedCount ?? 0} used · {subscription?.remainingCount ?? 0} remaining
                </p>
              </div>
              <p className="text-xs font-semibold text-white">
                {subscription?.monthlyLimit ?? 0} <span className="text-[9px] font-normal text-[#85858e]">total</span>
              </p>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#8178ff] transition-[width]"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            {subscription?.nextResetDate && (
              <p className="mt-2 text-[9px] text-[#85858e]">
                Usage resets {formatDate(subscription.nextResetDate)}
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/dashboard/seeker/upgrade" className="inline-flex rounded-md bg-white px-4 py-2.5 text-[10px] font-semibold text-[#171719] hover:bg-[#dedee3]">
              Compare Plans
            </Link>
            <button
              type="button"
              onClick={() => void startBillingAction('portal')}
              disabled={Boolean(action)}
              className="rounded-md border border-[#303036] px-4 py-2.5 text-[10px] text-[#dedee3] hover:bg-white/5 disabled:cursor-wait disabled:opacity-60"
            >
              {action === 'portal' ? 'Opening…' : 'Manage Plan'}
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-[#26262b] bg-[#131316] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[#ededf2]">Payment Method</h2>
            <span className="text-[8px] uppercase tracking-wide text-[#777780]">Secure by Stripe</span>
          </div>
          {billing.paymentMethods.length ? (
            <ul className="mt-5 space-y-3">
              {billing.paymentMethods.map((method) => (
                <li key={method.id} className="relative overflow-hidden rounded-lg border border-[#34303f] bg-[radial-gradient(ellipse_at_top_right,_#3a1450,_#17131f_55%,_#101013)] p-4">
                  <div className="flex items-center justify-between">
                    <span className="flex size-7 items-center justify-center rounded bg-amber-300/90 text-[9px] font-bold text-amber-950" aria-hidden="true">▦</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-white">{method.brand}</span>
                  </div>
                  <p className="mt-5 text-sm tracking-[0.18em] text-white">•••• •••• •••• {method.last4}</p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[8px] uppercase text-[#aaa2b5]">Card holder</p>
                      <p className="mt-1 text-[10px] text-white">{profile?.name || 'Seeker'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] uppercase text-[#aaa2b5]">Expires</p>
                      <p className="mt-1 text-[10px] text-white">
                        {method.expiryMonth && method.expiryYear
                          ? `${String(method.expiryMonth).padStart(2, '0')}/${String(method.expiryYear).slice(-2)}`
                          : '—'}
                      </p>
                    </div>
                  </div>
                  {method.isDefault && (
                    <span className="absolute left-3 top-3 rounded bg-white/10 px-2 py-1 text-[8px] uppercase text-white">
                      Default
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-5 flex min-h-32 flex-col items-center justify-center rounded-lg border border-dashed border-[#35353b] bg-[#101013] px-4 text-center">
              <DashboardIcon name="wallet" className="size-5 text-[#85858e]" />
              <p className="mt-3 text-xs font-medium text-[#d9d9df]">
                {verifyingPaymentMethod ? 'Verifying your saved card with Stripe…' : 'No card on file'}
              </p>
              <p className="mt-1 max-w-xs text-[10px] leading-5 text-[#85858e]">
                {verifyingPaymentMethod
                  ? 'Your card will appear here as soon as Stripe confirms it.'
                  : 'Add a card directly through Stripe Checkout. Stripe Link wallets are not displayed as cards.'}
              </p>
            </div>
          )}
          {billingError && (
            <p role="status" className="mt-3 text-[10px] leading-5 text-amber-300">
              {billingError}
            </p>
          )}
          <button
            type="button"
            onClick={() => void startBillingAction('setup')}
            disabled={Boolean(action)}
            className="mt-4 w-full rounded-md border border-[#303036] px-3 py-2.5 text-[10px] text-[#c5c5cc] hover:bg-white/5 disabled:cursor-wait disabled:opacity-60"
          >
            {action === 'setup' ? 'Connecting to Stripe…' : '+ Add New Payment Method'}
          </button>
        </section>
      </div>

      <BillingHistory invoices={billing.invoices} loading={loading} error={billingError} />

      <section className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#26262b] bg-[#131316] px-5 py-4">
        <div>
          <h2 className="text-xs font-semibold text-[#ededf2]">Need help with your invoice?</h2>
          <p className="mt-1 max-w-xl text-[10px] leading-5 text-[#85858e]">
            Contact our support team if you have questions about a payment or billing details.
          </p>
        </div>
        <Link href="/contact" className="rounded-md border border-[#303036] px-3 py-2 text-[10px] text-[#dedee3] hover:bg-white/5">
          Contact Support
        </Link>
      </section>
    </div>
  );
}
