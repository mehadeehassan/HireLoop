'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import BillingHistory, { type BillingInvoiceRow } from '@/components/dashboard/shared/BillingHistory';
import DashboardIcon from '@/components/dashboard/shared/DashboardIcon';
import RecruiterPageHeader from './RecruiterPageHeader';

type PaymentMethod = {
  id: string;
  brand: string;
  last4: string;
  expiryMonth: number | null;
  expiryYear: number | null;
  isDefault: boolean;
};

type RecruiterBillingSummary = {
  currentPlan: string;
  status: string;
  startDate: string | null;
  expiryDate: string | null;
  monthlyLimit: number;
  usedCount: number;
  remainingCount: number;
  nextResetDate: string | null;
  billingInterval: string;
  price: number;
  currency: string;
  features: string[];
  paymentMethods: PaymentMethod[];
};

type BillingPlan = {
  planName: string;
  price: number;
  yearlyPrice: number;
  currency: string;
  monthlyJobPostLimit: number | null;
  features: string[];
};

const initialSummary: RecruiterBillingSummary = {
  currentPlan: 'Starter',
  status: 'active',
  startDate: null,
  expiryDate: null,
  monthlyLimit: 0,
  usedCount: 0,
  remainingCount: 0,
  nextResetDate: null,
  billingInterval: 'month',
  price: 0,
  currency: 'USD',
  features: [],
  paymentMethods: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatMoney(value: number, currency: string) {
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

function formatDate(value: string | null) {
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
  if (/void|uncollectible|failed|cancelled/i.test(value)) return 'border-red-500/20 bg-red-500/10 text-red-300';
  return 'border-white/10 bg-white/5 text-[#b8b8c2]';
}

function parseOverview(value: unknown): RecruiterBillingSummary {
  if (
    !isRecord(value) ||
    typeof value.currentPlan !== 'string' ||
    typeof value.status !== 'string' ||
    typeof value.monthlyLimit !== 'number' ||
    typeof value.usedCount !== 'number' ||
    typeof value.remainingCount !== 'number' ||
    typeof value.price !== 'number' ||
    typeof value.currency !== 'string' ||
    !Array.isArray(value.features) ||
    !Array.isArray(value.paymentMethods)
  ) {
    throw new Error('The billing service returned invalid subscription details.');
  }
  const paymentMethods = value.paymentMethods.filter(
    (
      method,
    ): method is Record<string, unknown> & { id: string; brand: string; last4: string } =>
      isRecord(method) &&
      typeof method.id === 'string' &&
      typeof method.brand === 'string' &&
      typeof method.last4 === 'string',
  ).map((method) => ({
    id: method.id,
    brand: method.brand,
    last4: method.last4,
    expiryMonth:
      typeof method.expiryMonth === 'number' && Number.isInteger(method.expiryMonth)
        ? method.expiryMonth
        : null,
    expiryYear:
      typeof method.expiryYear === 'number' && Number.isInteger(method.expiryYear)
        ? method.expiryYear
        : null,
    isDefault: method.isDefault === true,
  }));
  return {
    currentPlan: value.currentPlan,
    status: value.status,
    startDate: typeof value.startDate === 'string' ? value.startDate : null,
    expiryDate: typeof value.expiryDate === 'string' ? value.expiryDate : null,
    monthlyLimit: value.monthlyLimit,
    usedCount: value.usedCount,
    remainingCount: value.remainingCount,
    nextResetDate: typeof value.nextResetDate === 'string' ? value.nextResetDate : null,
    billingInterval: typeof value.billingInterval === 'string' ? value.billingInterval : 'month',
    price: value.price,
    currency: value.currency,
    features: value.features.filter((feature): feature is string => typeof feature === 'string'),
    paymentMethods,
  };
}

function parseVerifiedPaymentMethod(value: unknown): PaymentMethod | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.brand !== 'string' ||
    typeof value.last4 !== 'string' ||
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

function parseInvoices(value: unknown): BillingInvoiceRow[] {
  if (!isRecord(value) || !Array.isArray(value.invoices)) {
    throw new Error('The billing service returned invalid payment history.');
  }
  return value.invoices.filter(
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
}

function parsePlans(value: unknown): BillingPlan[] {
  if (!isRecord(value) || !Array.isArray(value.plans)) {
    throw new Error('The billing service returned invalid subscription plans.');
  }
  return value.plans.filter(
    (plan): plan is BillingPlan =>
      isRecord(plan) &&
      typeof plan.planName === 'string' &&
      typeof plan.price === 'number' &&
      typeof plan.yearlyPrice === 'number' &&
      typeof plan.currency === 'string' &&
      (typeof plan.monthlyJobPostLimit === 'number' || plan.monthlyJobPostLimit === null) &&
      Array.isArray(plan.features) &&
      plan.features.every((feature) => typeof feature === 'string'),
  );
}

export default function RecruiterBilling() {
  const [summary, setSummary] = useState(initialSummary);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [invoices, setInvoices] = useState<BillingInvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState<'setup' | 'portal' | null>(null);

  const loadBilling = useCallback(async (signal?: AbortSignal) => {
    try {
      const responses = await Promise.all([
        fetch('/api/billing/me', { cache: 'no-store', signal }),
        fetch('/api/billing/plans', { cache: 'no-store', signal }),
        fetch('/api/billing/payments?page=1&limit=10&sortBy=createdAt&sortOrder=desc', {
          cache: 'no-store',
          signal,
        }),
      ]);
      const data = await Promise.all(
        responses.map((response) => response.json().catch(() => null) as Promise<unknown>),
      );
      if (responses.some((response) => !response.ok)) {
        const failure = data.find((item) => isRecord(item) && typeof item.error === 'string');
        throw new Error(
          isRecord(failure) && typeof failure.error === 'string'
            ? failure.error
            : 'Billing details could not be loaded.',
        );
      }
      if (signal?.aborted) return;
      setSummary(parseOverview(data[0]));
      setPlans(parsePlans(data[1]));
      setInvoices(parseInvoices(data[2]));
    } catch (loadError) {
      if (!signal?.aborted) {
        setError(loadError instanceof Error ? loadError.message : 'Billing details could not be loaded.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  function retryBilling() {
    setLoading(true);
    setError('');
    void loadBilling();
  }

  useEffect(() => {
    const controller = new AbortController();
    let initialLoadTimer: number | null = null;
    const scheduleInitialLoad = () => {
      initialLoadTimer = window.setTimeout(() => void loadBilling(controller.signal), 0);
    };
    const searchParams = new URLSearchParams(window.location.search);
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      const sessionId = searchParams.get('session_id');
      window.history.replaceState({}, '', window.location.pathname);
      void (async () => {
        try {
          const response = await fetch('/api/billing/payment-methods/verify-setup-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sessionId ? { sessionId } : {}),
            signal: controller.signal,
          });
          const result: unknown = await response.json().catch(() => null);
          const method = isRecord(result)
            ? parseVerifiedPaymentMethod(result.paymentMethod)
            : null;
          if (!response.ok || !method) {
            throw new Error(
              isRecord(result) && typeof result.error === 'string'
                ? result.error
                : 'The saved card could not be verified.',
            );
          }

          const addVerifiedMethod = () => {
            setSummary((current) => ({
              ...current,
              paymentMethods: [
                method,
                ...current.paymentMethods.filter((item) => item.id !== method.id),
              ],
            }));
          };
          const refresh = loadBilling(controller.signal);
          addVerifiedMethod();
          void refresh.then(() => {
            if (!controller.signal.aborted) addVerifiedMethod();
          });
          toast.success('Card saved and verified.');
        } catch (verificationError) {
          if (controller.signal.aborted) return;
          toast.error(
            verificationError instanceof Error
              ? verificationError.message
              : 'The saved card could not be verified.',
          );
          void loadBilling(controller.signal);
        }
      })();
    } else if (paymentStatus === 'cancelled') {
      scheduleInitialLoad();
      toast.info('Payment method setup was cancelled.');
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      scheduleInitialLoad();
    }
    return () => {
      if (initialLoadTimer !== null) window.clearTimeout(initialLoadTimer);
      controller.abort();
    };
  }, [loadBilling]);

  async function startBillingAction(nextAction: 'setup' | 'portal') {
    if (action) return;
    setAction(nextAction);
    try {
      const path =
        nextAction === 'setup'
          ? '/api/billing/payment-methods/setup-session'
          : '/api/billing/portal-session';
      const response = await fetch(path, { method: 'POST' });
      const result: unknown = await response.json();
      if (!response.ok || !isRecord(result) || typeof result.url !== 'string') {
        throw new Error(
          isRecord(result) && typeof result.error === 'string'
            ? result.error
            : 'The payment service could not start this action.',
        );
      }
      window.location.assign(result.url);
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'Could not start billing management.');
      setAction(null);
    }
  }

  const usagePercent = summary.monthlyLimit
    ? Math.min(100, (summary.usedCount / summary.monthlyLimit) * 100)
    : 0;
  const currentPlanFeatures =
    plans.find((plan) => plan.planName === summary.currentPlan)?.features || summary.features;
  const monthlyJobLimit =
    plans.find((plan) => plan.planName === summary.currentPlan)?.monthlyJobPostLimit ??
    summary.monthlyLimit;

  return (
    <div id="billing-print-area" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <RecruiterPageHeader
        eyebrow="Billing"
        title="Subscription & Billing"
        description="Manage your recruiter plan, payment methods, and invoices."
      />

      {error && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
          <span>{error}</span>
          <button type="button" onClick={retryBilling} className="rounded border border-red-300/20 px-3 py-1.5 hover:bg-white/5">
            Retry
          </button>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <section className="rounded-xl border border-[#252d43] bg-[#111827]/70 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="rounded bg-white px-2 py-1 text-[8px] font-medium uppercase tracking-wide text-[#27272d]">
                Current plan
              </span>
              <h2 className="mt-4 text-base font-semibold text-white">
                {loading ? 'Loading plan…' : `${summary.currentPlan} Plan`}
              </h2>
              <span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[8px] uppercase tracking-wide ${statusStyle(summary.status)}`}>
                {summary.status}
              </span>
              <p className="mt-2 max-w-md text-[11px] leading-5 text-[#9ba4b7]">
                Plan limits and subscription status are managed by your billing account.
              </p>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[9px]">
                <p className="text-[#9ba4b7]">
                  Started <span className="ml-1 text-[#d7dbea]">{formatDate(summary.startDate)}</span>
                </p>
                <p className="text-[#9ba4b7]">
                  Next billing <span className="ml-1 text-[#d7dbea]">{formatDate(summary.expiryDate)}</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-white">
                {loading ? '—' : formatMoney(summary.price, summary.currency)}
                <span className="text-[10px] font-normal text-[#9ba4b7]">
                  {summary.currentPlan === 'Starter' ? ' / month' : ` / ${summary.billingInterval}`}
                </span>
              </p>
              {summary.expiryDate && (
                <p className="mt-1 text-[9px] text-[#9ba4b7]">
                  Next billing date: {formatDate(summary.expiryDate)}
                </p>
              )}
            </div>
          </div>

          <ul className="mt-6 grid gap-3 border-t border-[#252d43] pt-5 sm:grid-cols-2">
            {currentPlanFeatures.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-[10px] text-[#d7dbea]">
                <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500/15 text-[9px] text-emerald-400" aria-hidden="true">✓</span>
                {feature}
              </li>
            ))}
          </ul>

          <div className="mt-5 rounded-lg border border-[#252d43] bg-[#0f1724] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-[10px] font-medium text-[#d7dbea]">Monthly job posts</h3>
                <p className="mt-1 text-[9px] text-[#9ba4b7]">
                  {summary.usedCount} used · {summary.remainingCount} remaining
                </p>
              </div>
              <p className="text-xs font-semibold text-white">
                {monthlyJobLimit} <span className="text-[9px] font-normal text-[#9ba4b7]">total</span>
              </p>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#6258ff] transition-[width]" style={{ width: `${usagePercent}%` }} />
            </div>
            {summary.nextResetDate && (
              <p className="mt-2 text-[9px] text-[#9ba4b7]">Usage resets {formatDate(summary.nextResetDate)}</p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/dashboard/recruiter/upgrade" className="inline-flex rounded-md bg-white px-4 py-2.5 text-[10px] font-semibold text-[#151517] hover:bg-[#dedee3]">
              Compare Plans
            </Link>
            <button
              type="button"
              onClick={() => void startBillingAction('portal')}
              disabled={Boolean(action)}
              className="rounded-md border border-[#303a55] px-4 py-2.5 text-[10px] text-[#d7dbea] hover:bg-white/5 disabled:cursor-wait disabled:opacity-60"
            >
              {action === 'portal' ? 'Opening…' : 'Manage Plan'}
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-[#252d43] bg-[#111827]/70 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">Payment Method</h2>
            <span className="text-[8px] uppercase tracking-wide text-[#9ba4b7]">Secure by Stripe</span>
          </div>
          {summary.paymentMethods.length ? (
            <ul className="mt-5 space-y-3">
              {summary.paymentMethods.map((method) => (
                <li key={method.id} className="relative overflow-hidden rounded-lg border border-[#303a55] bg-[radial-gradient(ellipse_at_top_right,_#2c2860,_#171827_55%,_#10131c)] p-4">
                  <div className="flex items-center justify-between">
                    <span className="flex size-7 items-center justify-center rounded bg-white/10 text-[#d7dbea]" aria-hidden="true">
                      <DashboardIcon name="wallet" className="size-4" />
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-white">{method.brand}</span>
                  </div>
                  <p className="mt-5 text-sm tracking-[0.18em] text-white">•••• •••• •••• {method.last4}</p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[8px] uppercase text-[#9ba4b7]">Account</p>
                      <p className="mt-1 text-[10px] text-white">Recruiter</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] uppercase text-[#9ba4b7]">Expires</p>
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
            <div className="mt-5 flex min-h-32 flex-col items-center justify-center rounded-lg border border-dashed border-[#303a55] bg-[#0f1724] px-4 text-center">
              <DashboardIcon name="wallet" className="size-5 text-[#9ba4b7]" />
              <p className="mt-3 text-xs font-medium text-[#d7dbea]">No payment method on file</p>
              <p className="mt-1 max-w-xs text-[10px] leading-5 text-[#9ba4b7]">
                Add a card securely through Stripe. HireLoop never receives or stores your card number.
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={() => void startBillingAction('setup')}
            disabled={Boolean(action)}
            className="mt-4 w-full rounded-md border border-[#303a55] px-3 py-2.5 text-[10px] text-[#d7dbea] hover:bg-white/5 disabled:cursor-wait disabled:opacity-60"
          >
            {action === 'setup' ? 'Connecting to Stripe…' : '+ Add Payment Method'}
          </button>
        </section>
      </div>

      <BillingHistory invoices={invoices} loading={loading} error={error} />

      <section className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#252d43] bg-[#111827]/70 px-5 py-4">
        <div>
          <h2 className="text-xs font-semibold text-white">Need help with your invoice?</h2>
          <p className="mt-1 max-w-xl text-[10px] leading-5 text-[#9ba4b7]">
            Contact our support team if you have questions about a payment or billing details.
          </p>
        </div>
        <Link href="/contact" className="rounded-md border border-[#303a55] px-3 py-2 text-[10px] text-[#d7dbea] hover:bg-white/5">
          Contact Support
        </Link>
      </section>
    </div>
  );
}
