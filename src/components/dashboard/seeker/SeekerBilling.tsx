'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import DashboardIcon from '@/components/dashboard/DashboardIcon';
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

type BillingInvoice = {
  id: string;
  number: string;
  date: string;
  plan: string;
  amountMinor: number;
  currency: string;
  status: string;
  invoiceUrl: string | null;
};

type BillingSummary = {
  subscription: {
    plan: string;
    amountMinor: number;
    currency: string;
    interval: string;
    nextBillingDate: string;
  } | null;
  paymentMethods: PaymentMethod[];
  invoices: BillingInvoice[];
};

const emptyBilling: BillingSummary = {
  subscription: null,
  paymentMethods: [],
  invoices: [],
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
    !Array.isArray(value.invoices)
  ) {
    throw new Error('The billing service returned an unexpected response.');
  }

  const paymentMethods = value.paymentMethods.filter(
    (method): method is PaymentMethod =>
      isRecord(method) &&
      typeof method.id === 'string' &&
      typeof method.brand === 'string' &&
      typeof method.last4 === 'string' &&
      (typeof method.expiryMonth === 'number' || method.expiryMonth === null) &&
      (typeof method.expiryYear === 'number' || method.expiryYear === null) &&
      typeof method.isDefault === 'boolean',
  );
  const invoices = value.invoices.filter(
    (invoice): invoice is BillingInvoice =>
      isRecord(invoice) &&
      typeof invoice.id === 'string' &&
      typeof invoice.number === 'string' &&
      typeof invoice.date === 'string' &&
      typeof invoice.plan === 'string' &&
      typeof invoice.amountMinor === 'number' &&
      typeof invoice.currency === 'string' &&
      typeof invoice.status === 'string' &&
      (typeof invoice.invoiceUrl === 'string' || invoice.invoiceUrl === null),
  );

  let subscription: BillingSummary['subscription'] = null;
  if (value.subscription !== null) {
    if (
      !isRecord(value.subscription) ||
      typeof value.subscription.plan !== 'string' ||
      typeof value.subscription.amountMinor !== 'number' ||
      typeof value.subscription.currency !== 'string' ||
      typeof value.subscription.interval !== 'string' ||
      typeof value.subscription.nextBillingDate !== 'string'
    ) {
      throw new Error('The billing service returned invalid subscription details.');
    }
    subscription = {
      plan: value.subscription.plan,
      amountMinor: value.subscription.amountMinor,
      currency: value.subscription.currency,
      interval: value.subscription.interval,
      nextBillingDate: value.subscription.nextBillingDate,
    };
  }

  return { subscription, paymentMethods, invoices };
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
  const [search, setSearch] = useState('');

  useEffect(() => {
    const controller = new AbortController();
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

    void loadBilling();

    const paymentResult = new URLSearchParams(window.location.search).get('payment');
    if (paymentResult === 'success') {
      toast.success('Payment method setup completed. Billing details are refreshing.');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (paymentResult === 'cancelled') {
      toast.info('Payment method setup was cancelled.');
      window.history.replaceState({}, '', window.location.pathname);
    }

    return () => controller.abort();
  }, []);

  const currentPlan = normalizePlan(profile?.plan || billing.subscription?.plan || 'Starter');
  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return billing.invoices;
    return billing.invoices.filter((invoice) =>
      `${invoice.number} ${invoice.plan} ${invoice.status}`.toLowerCase().includes(query),
    );
  }, [billing.invoices, search]);

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
        throw new Error(
          isRecord(result) && typeof result.error === 'string'
            ? result.error
            : 'The payment service could not start this action.',
        );
      }
      window.location.assign(result.url);
    } catch (error) {
      console.error(`Could not start billing ${nextAction} flow`, error);
      toast.error(error instanceof Error ? error.message : 'Could not start the billing flow.');
      setAction(null);
    }
  }

  function exportBillingHistory() {
    window.print();
  }

  const subscription = billing.subscription;
  const planAmount =
    subscription && normalizePlan(subscription.plan) === currentPlan
      ? formatMoney(subscription.amountMinor, subscription.currency)
      : currentPlan === 'Starter'
        ? '$0.00'
        : 'Managed by billing';

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
                  Next billing date: {formatDate(subscription.nextBillingDate)}
                </p>
              )}
            </div>
          </div>

          <ul className="mt-6 grid gap-3 border-t border-[#26262b] pt-5 sm:grid-cols-2">
            {['Browse jobs', 'Save opportunities', 'Track applications', 'Manage your profile'].map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-[10px] text-[#c5c5cc]">
                <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500/15 text-[9px] text-emerald-400" aria-hidden="true">✓</span>
                {feature}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/#pricing" className="inline-flex rounded-md bg-white px-4 py-2.5 text-[10px] font-semibold text-[#171719] hover:bg-[#dedee3]">
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
              <p className="mt-3 text-xs font-medium text-[#d9d9df]">No payment method on file</p>
              <p className="mt-1 max-w-xs text-[10px] leading-5 text-[#85858e]">
                Add a card securely through Stripe. HireLoop never receives or stores your card number.
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

      <section className="mt-5 overflow-hidden rounded-xl border border-[#26262b] bg-[#131316]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#26262b] px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-[#ededf2]">Billing History</h2>
            <p className="mt-1 text-[9px] text-[#777780]">Invoices and payment status from your billing provider.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label>
              <span className="sr-only">Search invoices</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search invoices..."
                className="h-9 w-40 rounded-md border border-[#303036] bg-[#101013] px-3 text-[10px] text-white outline-none placeholder:text-[#777780] focus:border-[#8178ff]"
              />
            </label>
            <button
              type="button"
              onClick={exportBillingHistory}
              disabled={!filteredInvoices.length}
              className="billing-no-print rounded-md border border-[#303036] px-3 py-2 text-[10px] text-[#dedee3] hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ↓ Export PDF
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-px">{[0, 1, 2, 3].map((row) => <div key={row} className="h-14 animate-pulse bg-white/[0.025]" />)}</div>
        ) : filteredInvoices.length ? (
          <div className="overflow-x-auto">
            <div className="grid min-w-[680px] grid-cols-[1fr_1.2fr_.8fr_1fr_.7fr] gap-3 bg-[#19191e] px-5 py-3 text-[9px] uppercase tracking-wide text-[#85858e]">
              <span>Date</span><span>Plan</span><span>Amount</span><span>Invoice</span><span>Status</span>
            </div>
            <ul className="min-w-[680px] divide-y divide-[#242428]">
              {filteredInvoices.map((invoice) => (
                <li key={invoice.id} className="grid grid-cols-[1fr_1.2fr_.8fr_1fr_.7fr] items-center gap-3 px-5 py-4 text-[10px]">
                  <time className="text-[#c7c7ce]">{formatDate(invoice.date)}</time>
                  <span className="truncate text-[#e1e1e7]">{invoice.plan || 'Subscription'}</span>
                  <span className="text-[#c7c7ce]">{formatMoney(invoice.amountMinor, invoice.currency)}</span>
                  {invoice.invoiceUrl ? (
                    <a href={invoice.invoiceUrl} target="_blank" rel="noreferrer" className="truncate text-[#aaa2ff] hover:text-white">
                      {invoice.number}
                    </a>
                  ) : (
                    <span className="truncate text-[#85858e]">{invoice.number}</span>
                  )}
                  <span className={`w-fit rounded-full border px-2.5 py-1 text-[9px] capitalize ${statusStyle(invoice.status)}`}>
                    {invoice.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <p className="text-xs font-medium text-[#d9d9df]">
              {search ? 'No matching invoices' : 'No billing transactions yet'}
            </p>
            <p className="mt-1 text-[10px] text-[#85858e]">
              {billingError || 'Your invoices will appear here when the billing service provides them.'}
            </p>
          </div>
        )}
      </section>

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
