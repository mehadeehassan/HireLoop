'use client';

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Ban,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Copy,
  CreditCard,
  Eye,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import type {
  AdminPayment,
  AdminPaymentOverview,
  AdminPaymentsList,
  AdminSubscription,
  AdminSubscriptionRoleSummary,
  AdminSubscriptionsList,
} from '@/lib/admin-payment-contract';
import {
  isAdminPayment,
  isAdminPaymentOverview,
  isAdminPaymentsList,
  isAdminSubscriptionsList,
  isRecord,
} from '@/lib/admin-payment-contract';

type PaymentSortField =
  | 'paymentDate'
  | 'amount'
  | 'status'
  | 'role'
  | 'plan'
  | 'createdAt';
type SubscriptionSortField =
  | 'plan'
  | 'status'
  | 'role'
  | 'startDate'
  | 'expiryDate'
  | 'createdAt';
type PaymentFilters = {
  search: string;
  role: string;
  status: string;
  plan: string;
  dateFrom: string;
  dateTo: string;
};
type SubscriptionFilters = {
  search: string;
  role: string;
  plan: string;
  status: string;
};

const pageSize = 10;
const paymentRoleOptions = ['seeker', 'recruiter'];
const paymentStatusOptions = ['paid', 'pending', 'failed', 'cancelled'];
const planOptions = ['Starter', 'Growth', 'Premium'];
const subscriptionStatusOptions = [
  'active',
  'trialing',
  'past_due',
  'canceled',
  'unpaid',
  'incomplete',
  'paused',
];
const initialPaymentFilters: PaymentFilters = {
  search: '',
  role: 'all',
  status: 'all',
  plan: 'all',
  dateFrom: '',
  dateTo: '',
};
const initialSubscriptionFilters: SubscriptionFilters = {
  search: '',
  role: 'all',
  plan: 'all',
  status: 'all',
};
const inputClass =
  'h-10 w-full rounded-md border border-white/[0.09] bg-[#111114] px-3 text-xs text-[#e7e7ec] outline-none transition placeholder:text-[#73737c] focus:border-[#9b71ff]/70';
const selectClass = `${inputClass} pr-8`;

function getErrorMessage(value: unknown, fallback: string) {
  return isRecord(value) && typeof value.error === 'string' ? value.error : fallback;
}

async function getResponsePayload(response: Response) {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('The payment service returned an invalid response.');
  }
  if (!response.ok) throw new Error(getErrorMessage(payload, 'The payment request failed.'));
  return payload;
}

function formatMoney(amount: number | null, currency: string) {
  if (amount === null) return '—';
  const code = currency?.toUpperCase() || 'USD';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${code}`;
  }
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatDateTime(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function shortId(value: string) {
  return value.length > 14 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success('Copied to clipboard.');
  } catch {
    toast.error('Could not copy to the clipboard.');
  }
}

function getPaymentStatusStyle(status: string) {
  switch (status.toLowerCase()) {
    case 'paid':
      return 'border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300';
    case 'pending':
      return 'border-amber-400/20 bg-amber-400/[0.08] text-amber-300';
    case 'failed':
      return 'border-rose-400/20 bg-rose-400/[0.08] text-rose-300';
    case 'cancelled':
      return 'border-white/[0.09] bg-white/[0.04] text-[#aaaab3]';
    default:
      return 'border-white/[0.09] bg-white/[0.04] text-[#aaaab3]';
  }
}

function getSubscriptionStatusStyle(status: string) {
  switch (status.toLowerCase()) {
    case 'active':
      return 'border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300';
    case 'trialing':
      return 'border-sky-400/20 bg-sky-400/[0.08] text-sky-300';
    case 'past_due':
    case 'incomplete':
      return 'border-amber-400/20 bg-amber-400/[0.08] text-amber-300';
    case 'canceled':
    case 'unpaid':
    case 'expired':
      return 'border-rose-400/20 bg-rose-400/[0.08] text-rose-300';
    default:
      return 'border-white/[0.09] bg-white/[0.04] text-[#aaaab3]';
  }
}

function getRoleStyle(role: string | null) {
  switch (role?.toLowerCase()) {
    case 'seeker':
      return 'border-sky-400/20 bg-sky-400/[0.08] text-sky-300';
    case 'recruiter':
      return 'border-violet-400/20 bg-violet-400/[0.08] text-violet-300';
    default:
      return 'border-white/[0.09] bg-white/[0.04] text-[#aaaab3]';
  }
}

function getPlanStyle(plan: string | null) {
  switch (plan?.toLowerCase()) {
    case 'starter':
      return 'border-white/[0.09] bg-white/[0.04] text-[#c3c3ca]';
    case 'growth':
      return 'border-sky-400/20 bg-sky-400/[0.08] text-sky-300';
    case 'premium':
      return 'border-violet-400/20 bg-violet-400/[0.08] text-violet-300';
    default:
      return 'border-white/[0.09] bg-white/[0.04] text-[#aaaab3]';
  }
}

function Pill({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-medium capitalize ${className}`}
    >
      {children}
    </span>
  );
}

function SortButton<T extends string>({
  label,
  field,
  currentSort,
  direction,
  onSort,
}: {
  label: string;
  field: T;
  currentSort: T;
  direction: 'asc' | 'desc';
  onSort: (field: T) => void;
}) {
  const active = field === currentSort;
  const Icon = active ? (direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      aria-label={`Sort by ${label}${active ? `, currently ${direction}ending` : ''}`}
      className="inline-flex items-center gap-1 whitespace-nowrap transition hover:text-[#e5e5ea]"
    >
      {label}
      <Icon
        aria-hidden="true"
        className={`size-3 ${active ? 'text-[#b49aff]' : 'text-[#66666e]'}`}
      />
    </button>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  note,
}: {
  label: string;
  value: number | null;
  icon: typeof CreditCard;
  accent: string;
  note: string;
}) {
  return (
    <div className="rounded-lg border border-white/[0.07] bg-[#111114] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] text-[#85858d]">{label}</p>
          <p className="mt-2 text-[25px] font-semibold tracking-tight text-[#ededf2]">
            {value === null ? '—' : value.toLocaleString()}
          </p>
        </div>
        <span className={`flex size-9 items-center justify-center rounded-md ${accent}`}>
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </div>
      <p className="mt-2 text-[10px] text-[#71717a]">{note}</p>
    </div>
  );
}

function RevenueCard({
  overview,
  loading,
}: {
  overview: AdminPaymentOverview | null;
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/[0.07] bg-[#111114] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-[#85858d]">Total Revenue</p>
          <div className="mt-2 space-y-1">
            {overview && overview.revenue.length > 0 ? (
              overview.revenue.slice(0, 3).map((entry) => (
                <p
                  key={entry.currency}
                  className="text-[21px] font-semibold tracking-tight text-[#ededf2]"
                >
                  {formatMoney(entry.amount, entry.currency)}
                </p>
              ))
            ) : (
              <p className="text-[25px] font-semibold tracking-tight text-[#ededf2]">
                {loading ? '…' : '—'}
              </p>
            )}
          </div>
        </div>
        <span className="flex size-9 items-center justify-center rounded-md bg-emerald-400/10 text-emerald-300">
          <Wallet aria-hidden="true" className="size-4" />
        </span>
      </div>
      <p className="mt-2 text-[10px] text-[#71717a]">
        {overview && overview.revenue.length > 3
          ? `+${overview.revenue.length - 3} more currencies · `
          : ''}
        Paid payments only, grouped by currency
      </p>
    </div>
  );
}

function RoleSummaryCard({
  role,
  summary,
}: {
  role: 'seeker' | 'recruiter';
  summary?: AdminSubscriptionRoleSummary;
}) {
  const Icon = role === 'seeker' ? UserRound : Building2;
  const title = role === 'seeker' ? 'Seeker subscriptions' : 'Recruiter subscriptions';
  return (
    <div className="rounded-lg border border-white/[0.07] bg-[#111114] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] text-[#85858d]">{title}</p>
          <p className="mt-2 text-[25px] font-semibold tracking-tight text-[#ededf2]">
            {summary ? summary.paidActive.toLocaleString() : '—'}
          </p>
          <p className="mt-1 text-[10px] text-[#71717a]">Active paid subscriptions</p>
        </div>
        <span className="flex size-9 items-center justify-center rounded-md bg-violet-400/10 text-violet-300">
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {(['Starter', 'Growth', 'Premium'] as const).map((plan) => (
          <div
            key={plan}
            className="rounded-md border border-white/[0.07] bg-[#0d0d10] px-2.5 py-2"
          >
            <p className="text-[9px] uppercase tracking-[0.06em] text-[#777780]">{plan}</p>
            <p className="mt-1 text-sm font-semibold text-[#dcdce3]">
              {summary ? summary.plans[plan].toLocaleString() : '—'}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-[#71717a]">
        {summary
          ? `${summary.total.toLocaleString()} total records · ${summary.active.toLocaleString()} active including Starter`
          : 'Loading subscription records…'}
      </p>
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-rose-400/20 bg-rose-400/[0.06] px-3 py-2.5 text-xs text-rose-200"
    >
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="ml-auto shrink-0 font-medium text-rose-100 underline underline-offset-2"
      >
        Retry
      </button>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof CreditCard;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
      <span className="flex size-12 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.025]">
        <Icon aria-hidden="true" className="size-5 text-[#767680]" />
      </span>
      <h3 className="mt-4 text-sm font-medium text-[#d4d4db]">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-5 text-[#777780]">{description}</p>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3 p-5" aria-label="Loading records">
      {[0, 1, 2, 3, 4].map((row) => (
        <div key={row} className="h-11 animate-pulse rounded bg-white/[0.025]" />
      ))}
    </div>
  );
}

function TablePagination({
  page,
  totalPages,
  total,
  loading,
  noun,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  loading: boolean;
  noun: string;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-white/[0.07] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="text-[10px] text-[#777780]">
        {total === 0
          ? `No ${noun}`
          : `Showing ${(page - 1) * pageSize + 1}–${Math.min(
              page * pageSize,
              total,
            )} of ${total.toLocaleString()} ${noun}`}
        {loading && <span className="ml-2 text-[#a889ff]">Updating…</span>}
      </p>
      <div className="flex items-center gap-2">
        <label className="mr-2 text-[10px] text-[#777780]">
          Page {page} of {totalPages}
        </label>
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="flex size-7 items-center justify-center rounded border border-white/[0.08] text-[#aaaab3] transition hover:bg-white/[0.05] disabled:opacity-35"
        >
          <ChevronLeft aria-hidden="true" className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="Next page"
          disabled={page >= totalPages || loading}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          className="flex size-7 items-center justify-center rounded border border-white/[0.08] text-[#aaaab3] transition hover:bg-white/[0.05] disabled:opacity-35"
        >
          <ChevronRight aria-hidden="true" className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function DetailValue({
  label,
  value,
  mono = false,
  copyValue,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyValue?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.08em] text-[#777780]">{label}</p>
      <div className="mt-1 flex items-start gap-2">
        <p
          className={`min-w-0 break-words text-xs text-[#d3d3da] ${
            mono ? 'font-mono text-[10px]' : ''
          }`}
        >
          {value || '—'}
        </p>
        {copyValue && (
          <button
            type="button"
            aria-label={`Copy ${label}`}
            onClick={() => void copyText(copyValue)}
            className="flex size-5 shrink-0 items-center justify-center rounded text-[#85858d] transition hover:bg-white/[0.06] hover:text-white"
          >
            <Copy aria-hidden="true" className="size-3" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminPaymentsManager() {
  const [overview, setOverview] = useState<AdminPaymentOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [paymentFilters, setPaymentFilters] =
    useState<PaymentFilters>(initialPaymentFilters);
  const [paymentSearchDraft, setPaymentSearchDraft] = useState('');
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentSortBy, setPaymentSortBy] =
    useState<PaymentSortField>('paymentDate');
  const [paymentSortDirection, setPaymentSortDirection] = useState<'asc' | 'desc'>(
    'desc',
  );
  const [paymentsData, setPaymentsData] = useState<AdminPaymentsList | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  const [subscriptionFilters, setSubscriptionFilters] =
    useState<SubscriptionFilters>(initialSubscriptionFilters);
  const [subscriptionSearchDraft, setSubscriptionSearchDraft] = useState('');
  const [subscriptionPage, setSubscriptionPage] = useState(1);
  const [subscriptionSortBy, setSubscriptionSortBy] =
    useState<SubscriptionSortField>('startDate');
  const [subscriptionSortDirection, setSubscriptionSortDirection] = useState<
    'asc' | 'desc'
  >('desc');
  const [subscriptionsData, setSubscriptionsData] =
    useState<AdminSubscriptionsList | null>(null);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(true);
  const [subscriptionsError, setSubscriptionsError] = useState<string | null>(null);

  const [refreshVersion, setRefreshVersion] = useState(0);
  const [detail, setDetail] = useState<AdminPayment | null>(null);
  const [detailPaymentId, setDetailPaymentId] = useState<string | null>(null);
  const [detailVersion, setDetailVersion] = useState(0);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPaymentFilters((current) =>
        current.search === paymentSearchDraft
          ? current
          : { ...current, search: paymentSearchDraft.trim() },
      );
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [paymentSearchDraft]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSubscriptionFilters((current) =>
        current.search === subscriptionSearchDraft
          ? current
          : { ...current, search: subscriptionSearchDraft.trim() },
      );
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [subscriptionSearchDraft]);

  const paymentQueryString = useMemo(() => {
    const params = new URLSearchParams({
      page: String(paymentPage),
      pageSize: String(pageSize),
      role: paymentFilters.role,
      status: paymentFilters.status,
      plan: paymentFilters.plan,
      sortBy: paymentSortBy,
      sortDirection: paymentSortDirection,
    });
    if (paymentFilters.search) params.set('search', paymentFilters.search);
    if (paymentFilters.dateFrom) params.set('dateFrom', paymentFilters.dateFrom);
    if (paymentFilters.dateTo) params.set('dateTo', paymentFilters.dateTo);
    return params.toString();
  }, [paymentFilters, paymentPage, paymentSortBy, paymentSortDirection]);

  const subscriptionQueryString = useMemo(() => {
    const params = new URLSearchParams({
      page: String(subscriptionPage),
      pageSize: String(pageSize),
      role: subscriptionFilters.role,
      plan: subscriptionFilters.plan,
      status: subscriptionFilters.status,
      sortBy: subscriptionSortBy,
      sortDirection: subscriptionSortDirection,
    });
    if (subscriptionFilters.search) {
      params.set('search', subscriptionFilters.search);
    }
    return params.toString();
  }, [
    subscriptionFilters,
    subscriptionPage,
    subscriptionSortBy,
    subscriptionSortDirection,
  ]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setOverviewLoading(true);
      setOverviewError(null);
      fetch('/api/admin/payments/overview', {
        signal: controller.signal,
        cache: 'no-store',
      })
        .then(getResponsePayload)
        .then((payload: unknown) => {
          if (!isAdminPaymentOverview(payload)) {
            throw new Error('The payment overview response was invalid.');
          }
          setOverview(payload);
        })
        .catch((requestError: unknown) => {
          if (
            requestError instanceof DOMException &&
            requestError.name === 'AbortError'
          ) {
            return;
          }
          setOverviewError(
            requestError instanceof Error
              ? requestError.message
              : 'Could not load the payment overview.',
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setOverviewLoading(false);
        });
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [refreshVersion]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setPaymentsLoading(true);
      setPaymentsError(null);
      fetch(`/api/admin/payments?${paymentQueryString}`, {
        signal: controller.signal,
        cache: 'no-store',
      })
        .then(getResponsePayload)
        .then((payload: unknown) => {
          if (!isAdminPaymentsList(payload)) {
            throw new Error('The payment list response was invalid.');
          }
          setPaymentsData(payload);
        })
        .catch((requestError: unknown) => {
          if (
            requestError instanceof DOMException &&
            requestError.name === 'AbortError'
          ) {
            return;
          }
          setPaymentsError(
            requestError instanceof Error
              ? requestError.message
              : 'Could not load payments.',
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setPaymentsLoading(false);
        });
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [paymentQueryString, refreshVersion]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSubscriptionsLoading(true);
      setSubscriptionsError(null);
      fetch(`/api/admin/subscriptions?${subscriptionQueryString}`, {
        signal: controller.signal,
        cache: 'no-store',
      })
        .then(getResponsePayload)
        .then((payload: unknown) => {
          if (!isAdminSubscriptionsList(payload)) {
            throw new Error('The subscription list response was invalid.');
          }
          setSubscriptionsData(payload);
        })
        .catch((requestError: unknown) => {
          if (
            requestError instanceof DOMException &&
            requestError.name === 'AbortError'
          ) {
            return;
          }
          setSubscriptionsError(
            requestError instanceof Error
              ? requestError.message
              : 'Could not load subscriptions.',
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setSubscriptionsLoading(false);
        });
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [subscriptionQueryString, refreshVersion]);

  useEffect(() => {
    if (!detailPaymentId) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setDetailLoading(true);
      setDetailError(null);
      fetch(`/api/admin/payments/${encodeURIComponent(detailPaymentId)}`, {
        signal: controller.signal,
        cache: 'no-store',
      })
        .then(getResponsePayload)
        .then((payload: unknown) => {
          if (!isRecord(payload) || !isAdminPayment(payload.payment)) {
            throw new Error('The payment details response was invalid.');
          }
          setDetail(payload.payment);
        })
        .catch((requestError: unknown) => {
          if (
            requestError instanceof DOMException &&
            requestError.name === 'AbortError'
          ) {
            return;
          }
          setDetailError(
            requestError instanceof Error
              ? requestError.message
              : 'Could not load payment details.',
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setDetailLoading(false);
        });
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [detailPaymentId, detailVersion]);

  function updatePaymentFilter(key: keyof PaymentFilters, value: string) {
    setPaymentPage(1);
    setPaymentFilters((current) => ({ ...current, [key]: value }));
  }

  function changePaymentSort(field: PaymentSortField) {
    setPaymentPage(1);
    if (paymentSortBy === field) {
      setPaymentSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setPaymentSortBy(field);
      setPaymentSortDirection(field === 'role' || field === 'plan' ? 'asc' : 'desc');
    }
  }

  function clearPaymentFilters() {
    setPaymentSearchDraft('');
    setPaymentFilters(initialPaymentFilters);
    setPaymentPage(1);
  }

  function updateSubscriptionFilter(key: keyof SubscriptionFilters, value: string) {
    setSubscriptionPage(1);
    setSubscriptionFilters((current) => ({ ...current, [key]: value }));
  }

  function changeSubscriptionSort(field: SubscriptionSortField) {
    setSubscriptionPage(1);
    if (subscriptionSortBy === field) {
      setSubscriptionSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSubscriptionSortBy(field);
      setSubscriptionSortDirection(
        field === 'role' || field === 'plan' ? 'asc' : 'desc',
      );
    }
  }

  function clearSubscriptionFilters() {
    setSubscriptionSearchDraft('');
    setSubscriptionFilters(initialSubscriptionFilters);
    setSubscriptionPage(1);
  }

  function openDetail(payment: AdminPayment) {
    setDetail(payment);
    setDetailError(null);
    setDetailPaymentId(payment.id);
  }

  function closeDetail() {
    setDetail(null);
    setDetailPaymentId(null);
    setDetailError(null);
  }

  const refreshing = overviewLoading || paymentsLoading || subscriptionsLoading;
  const paymentPageCount = paymentsData?.pagination.totalPages ?? 1;
  const subscriptionPageCount = subscriptionsData?.pagination.totalPages ?? 1;
  const paymentHasFilters =
    paymentFilters.role !== 'all' ||
    paymentFilters.status !== 'all' ||
    paymentFilters.plan !== 'all' ||
    Boolean(paymentFilters.dateFrom) ||
    Boolean(paymentFilters.dateTo) ||
    Boolean(paymentSearchDraft);
  const subscriptionHasFilters =
    subscriptionFilters.role !== 'all' ||
    subscriptionFilters.plan !== 'all' ||
    subscriptionFilters.status !== 'all' ||
    Boolean(subscriptionSearchDraft);
  const showPaymentEmpty =
    !paymentsLoading && !paymentsError && paymentsData?.payments.length === 0;
  const showSubscriptionEmpty =
    !subscriptionsLoading &&
    !subscriptionsError &&
    subscriptionsData?.subscriptions.length === 0;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[#a889ff]">
            Admin Console <span className="mx-1.5 text-[#55555d]">/</span> Finance
          </p>
          <h1 className="text-[25px] font-semibold tracking-tight text-[#ededf2] sm:text-[28px]">
            Payments & Subscriptions
          </h1>
          <p className="mt-1.5 max-w-2xl text-xs leading-5 text-[#85858d]">
            Read-only payment history and role-scoped subscription records. Stripe
            webhooks remain the source of truth for payment status.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshVersion((value) => value + 1)}
          className="inline-flex h-9 items-center gap-2 self-start rounded-md border border-white/[0.09] bg-[#111114] px-3 text-xs text-[#c3c3ca] transition hover:bg-white/[0.05] sm:self-auto"
        >
          <RefreshCw
            aria-hidden="true"
            className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`}
          />
          Refresh
        </button>
      </section>

      {overviewError && (
        <ErrorBanner
          message={overviewError}
          onRetry={() => setRefreshVersion((value) => value + 1)}
        />
      )}

      <section
        aria-label="Payment statistics"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        <StatCard
          label="Total Payments"
          value={overview?.payments.total ?? null}
          icon={CreditCard}
          accent="bg-violet-400/10 text-violet-300"
          note="Every payment record in the database"
        />
        <StatCard
          label="Successful Payments"
          value={overview?.payments.successful ?? null}
          icon={Check}
          accent="bg-emerald-400/10 text-emerald-300"
          note="Stripe-confirmed paid payments"
        />
        <StatCard
          label="Pending Payments"
          value={overview?.payments.pending ?? null}
          icon={Clock3}
          accent="bg-amber-400/10 text-amber-300"
          note="Awaiting payment confirmation"
        />
        <StatCard
          label="Failed Payments"
          value={overview?.payments.failed ?? null}
          icon={Ban}
          accent="bg-rose-400/10 text-rose-300"
          note={
            overview
              ? `${overview.payments.cancelled.toLocaleString()} cancelled separately`
              : 'Failed payment attempts'
          }
        />
        <RevenueCard overview={overview} loading={overviewLoading} />
        <StatCard
          label="Active Subscriptions"
          value={overview?.subscriptions.paidActive ?? null}
          icon={TrendingUp}
          accent="bg-sky-400/10 text-sky-300"
          note="Growth and Premium with active status"
        />
      </section>

      <section
        aria-label="Subscription breakdown"
        className="grid gap-3 lg:grid-cols-2"
      >
        <RoleSummaryCard role="seeker" summary={overview?.subscriptions.byRole.seeker} />
        <RoleSummaryCard
          role="recruiter"
          summary={overview?.subscriptions.byRole.recruiter}
        />
      </section>

      <section className="overflow-hidden rounded-lg border border-white/[0.07] bg-[#111114]">
        <div className="flex flex-col gap-4 border-b border-white/[0.07] p-4 sm:p-5">
          <div>
            <h2 className="text-sm font-semibold text-[#e3e3e9]">Payment history</h2>
            <p className="mt-1 text-[10px] text-[#777780]">
              All user payments with safe card metadata and invoice references.
              Amounts are shown in the stored currency.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-7">
            <label className="relative sm:col-span-2 xl:col-span-2">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#777780]"
              />
              <input
                type="search"
                value={paymentSearchDraft}
                onChange={(event) => {
                  setPaymentSearchDraft(event.target.value);
                  setPaymentPage(1);
                }}
                aria-label="Search payments by user, email, or payment ID"
                placeholder="User, email, or payment ID..."
                className={`${inputClass} pl-9`}
              />
            </label>
            <select
              aria-label="Filter payments by role"
              value={paymentFilters.role}
              onChange={(event) => updatePaymentFilter('role', event.target.value)}
              className={selectClass}
            >
              <option value="all">All roles</option>
              {(paymentsData?.filterOptions.roles ?? paymentRoleOptions).map((role) => (
                <option key={role} value={role}>
                  {role === 'seeker' ? 'Seeker' : 'Recruiter'}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter payments by status"
              value={paymentFilters.status}
              onChange={(event) => updatePaymentFilter('status', event.target.value)}
              className={selectClass}
            >
              <option value="all">Any status</option>
              {(paymentsData?.filterOptions.statuses ?? paymentStatusOptions).map(
                (status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ),
              )}
            </select>
            <select
              aria-label="Filter payments by plan"
              value={paymentFilters.plan}
              onChange={(event) => updatePaymentFilter('plan', event.target.value)}
              className={selectClass}
            >
              <option value="all">All plans</option>
              {(paymentsData?.filterOptions.plans ?? planOptions).map((plan) => (
                <option key={plan} value={plan}>
                  {plan}
                </option>
              ))}
            </select>
            <input
              type="date"
              aria-label="Payment date from"
              value={paymentFilters.dateFrom}
              onChange={(event) => updatePaymentFilter('dateFrom', event.target.value)}
              className={inputClass}
            />
            <input
              type="date"
              aria-label="Payment date to"
              value={paymentFilters.dateTo}
              onChange={(event) => updatePaymentFilter('dateTo', event.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={clearPaymentFilters}
              disabled={!paymentHasFilters}
              className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[10px] text-[#9999a2] transition hover:bg-white/[0.04] hover:text-white disabled:opacity-40"
            >
              <RotateCcw aria-hidden="true" className="size-3" />
              Clear filters
            </button>
            {paymentsData && (
              <span className="ml-auto text-[10px] text-[#73737c]">
                {paymentsData.pagination.total.toLocaleString()} matching payments
              </span>
            )}
          </div>
        </div>

        {paymentsError && (
          <div className="p-4">
            <ErrorBanner
              message={paymentsError}
              onRetry={() => setRefreshVersion((value) => value + 1)}
            />
          </div>
        )}

        {!paymentsData && paymentsLoading ? (
          <TableSkeleton />
        ) : showPaymentEmpty ? (
          <EmptyState
            icon={CreditCard}
            title="No payments found"
            description={
              paymentHasFilters
                ? 'Try adjusting your filters or search terms.'
                : 'No payment records are available yet.'
            }
          />
        ) : paymentsData ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.07] text-[9px] uppercase tracking-[0.08em] text-[#777780]">
                    <th className="px-4 py-3 font-medium sm:px-5">Payment</th>
                    <th className="px-3 py-3 font-medium">User</th>
                    <th className="px-3 py-3 font-medium">
                      <SortButton
                        label="Role"
                        field="role"
                        currentSort={paymentSortBy}
                        direction={paymentSortDirection}
                        onSort={changePaymentSort}
                      />
                    </th>
                    <th className="px-3 py-3 font-medium">
                      <SortButton
                        label="Plan"
                        field="plan"
                        currentSort={paymentSortBy}
                        direction={paymentSortDirection}
                        onSort={changePaymentSort}
                      />
                    </th>
                    <th className="px-3 py-3 font-medium">
                      <SortButton
                        label="Amount"
                        field="amount"
                        currentSort={paymentSortBy}
                        direction={paymentSortDirection}
                        onSort={changePaymentSort}
                      />
                    </th>
                    <th className="px-3 py-3 font-medium">
                      <SortButton
                        label="Status"
                        field="status"
                        currentSort={paymentSortBy}
                        direction={paymentSortDirection}
                        onSort={changePaymentSort}
                      />
                    </th>
                    <th className="px-3 py-3 font-medium">Method</th>
                    <th className="px-3 py-3 font-medium">Invoice ref</th>
                    <th className="px-3 py-3 font-medium">
                      <SortButton
                        label="Date"
                        field="paymentDate"
                        currentSort={paymentSortBy}
                        direction={paymentSortDirection}
                        onSort={changePaymentSort}
                      />
                    </th>
                    <th className="px-4 py-3 text-right font-medium sm:px-5">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsData.payments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-b border-white/[0.05] transition-colors last:border-0 hover:bg-white/[0.018]"
                    >
                      <td className="max-w-[170px] px-4 py-3.5 sm:px-5">
                        <button
                          type="button"
                          onClick={() => openDetail(payment)}
                          className="block max-w-full truncate text-left font-mono text-[10px] text-[#d8d8e0] transition hover:text-[#c2aaff]"
                          title={payment.id}
                        >
                          {shortId(payment.id)}
                        </button>
                        <p className="mt-1 text-[9px] uppercase text-[#777780]">
                          {payment.currency}
                        </p>
                      </td>
                      <td className="max-w-[190px] px-3 py-3.5">
                        <span className="block truncate text-[10px] font-medium text-[#d4d4db]">
                          {payment.user.name || 'Unknown user'}
                        </span>
                        <span className="mt-1 block truncate text-[9px] text-[#777780]">
                          {payment.user.email || payment.userId || 'No account ID'}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <Pill className={getRoleStyle(payment.role)}>
                          {payment.role || '—'}
                        </Pill>
                      </td>
                      <td className="px-3 py-3.5">
                        <Pill className={getPlanStyle(payment.plan)}>
                          {payment.plan || '—'}
                        </Pill>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="text-[11px] font-medium text-[#e2e2e8]">
                          {formatMoney(payment.amount, payment.currency)}
                        </span>
                        <span className="mt-1 block text-[9px] uppercase text-[#777780]">
                          {payment.currency}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <Pill className={getPaymentStatusStyle(payment.status)}>
                          {payment.status}
                        </Pill>
                      </td>
                      <td className="px-3 py-3.5 text-[10px] uppercase text-[#a8a8b0]">
                        {payment.paymentMethod || '—'}
                      </td>
                      <td className="max-w-[150px] px-3 py-3.5">
                        <span
                          className="block truncate font-mono text-[9px] text-[#a8a8b0]"
                          title={payment.invoiceReference || undefined}
                        >
                          {payment.invoiceReference || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-[10px] text-[#96969e]">
                        {formatDate(payment.paymentDate)}
                      </td>
                      <td className="px-4 py-3.5 sm:px-5">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            aria-label={`View payment ${payment.id}`}
                            onClick={() => openDetail(payment)}
                            className="flex size-7 items-center justify-center rounded text-[#92929b] transition hover:bg-white/[0.07] hover:text-white"
                          >
                            <Eye aria-hidden="true" className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={paymentPage}
              totalPages={paymentPageCount}
              total={paymentsData.pagination.total}
              loading={paymentsLoading}
              noun="payments"
              onPageChange={setPaymentPage}
            />
          </>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-lg border border-white/[0.07] bg-[#111114]">
        <div className="flex flex-col gap-4 border-b border-white/[0.07] p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-[#e3e3e9]">
                <Users aria-hidden="true" className="size-4 text-[#b49aff]" />
                Subscription details
              </h2>
              <p className="mt-1 text-[10px] text-[#777780]">
                Seeker and recruiter records are kept separate by role. Usage is
                read-only and reflects the current UTC month.
              </p>
            </div>
            {subscriptionsData && (
              <span className="text-[10px] text-[#73737c]">
                {subscriptionsData.pagination.total.toLocaleString()} matching
                subscriptions
              </span>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <label className="relative sm:col-span-2">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#777780]"
              />
              <input
                type="search"
                value={subscriptionSearchDraft}
                onChange={(event) => {
                  setSubscriptionSearchDraft(event.target.value);
                  setSubscriptionPage(1);
                }}
                aria-label="Search subscriptions by user or email"
                placeholder="Search user or email..."
                className={`${inputClass} pl-9`}
              />
            </label>
            <select
              aria-label="Filter subscriptions by role"
              value={subscriptionFilters.role}
              onChange={(event) =>
                updateSubscriptionFilter('role', event.target.value)
              }
              className={selectClass}
            >
              <option value="all">All roles</option>
              {(subscriptionsData?.filterOptions.roles ?? paymentRoleOptions).map(
                (role) => (
                  <option key={role} value={role}>
                    {role === 'seeker' ? 'Seeker' : 'Recruiter'}
                  </option>
                ),
              )}
            </select>
            <select
              aria-label="Filter subscriptions by plan"
              value={subscriptionFilters.plan}
              onChange={(event) =>
                updateSubscriptionFilter('plan', event.target.value)
              }
              className={selectClass}
            >
              <option value="all">All plans</option>
              {(subscriptionsData?.filterOptions.plans ?? planOptions).map((plan) => (
                <option key={plan} value={plan}>
                  {plan}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter subscriptions by status"
              value={subscriptionFilters.status}
              onChange={(event) =>
                updateSubscriptionFilter('status', event.target.value)
              }
              className={selectClass}
            >
              <option value="all">Any status</option>
              {(
                subscriptionsData?.filterOptions.statuses ??
                subscriptionStatusOptions
              ).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={clearSubscriptionFilters}
              disabled={!subscriptionHasFilters}
              className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[10px] text-[#9999a2] transition hover:bg-white/[0.04] hover:text-white disabled:opacity-40"
            >
              <RotateCcw aria-hidden="true" className="size-3" />
              Clear filters
            </button>
          </div>
        </div>

        {subscriptionsError && (
          <div className="p-4">
            <ErrorBanner
              message={subscriptionsError}
              onRetry={() => setRefreshVersion((value) => value + 1)}
            />
          </div>
        )}

        {!subscriptionsData && subscriptionsLoading ? (
          <TableSkeleton />
        ) : showSubscriptionEmpty ? (
          <EmptyState
            icon={Users}
            title="No subscriptions found"
            description={
              subscriptionHasFilters
                ? 'Try adjusting your filters or search terms.'
                : 'No subscription records are available yet.'
            }
          />
        ) : subscriptionsData ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.07] text-[9px] uppercase tracking-[0.08em] text-[#777780]">
                    <th className="px-4 py-3 font-medium sm:px-5">User</th>
                    <th className="px-3 py-3 font-medium">
                      <SortButton
                        label="Role"
                        field="role"
                        currentSort={subscriptionSortBy}
                        direction={subscriptionSortDirection}
                        onSort={changeSubscriptionSort}
                      />
                    </th>
                    <th className="px-3 py-3 font-medium">
                      <SortButton
                        label="Plan"
                        field="plan"
                        currentSort={subscriptionSortBy}
                        direction={subscriptionSortDirection}
                        onSort={changeSubscriptionSort}
                      />
                    </th>
                    <th className="px-3 py-3 font-medium">
                      <SortButton
                        label="Status"
                        field="status"
                        currentSort={subscriptionSortBy}
                        direction={subscriptionSortDirection}
                        onSort={changeSubscriptionSort}
                      />
                    </th>
                    <th className="px-3 py-3 font-medium">
                      <SortButton
                        label="Started"
                        field="startDate"
                        currentSort={subscriptionSortBy}
                        direction={subscriptionSortDirection}
                        onSort={changeSubscriptionSort}
                      />
                    </th>
                    <th className="px-3 py-3 font-medium">
                      <SortButton
                        label="Expires"
                        field="expiryDate"
                        currentSort={subscriptionSortBy}
                        direction={subscriptionSortDirection}
                        onSort={changeSubscriptionSort}
                      />
                    </th>
                    <th className="px-3 py-3 font-medium">Usage</th>
                    <th className="px-3 py-3 font-medium">Next reset</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptionsData.subscriptions.map((subscription) => (
                    <SubscriptionRow
                      key={`${subscription.userId}-${subscription.role}`}
                      subscription={subscription}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={subscriptionPage}
              totalPages={subscriptionPageCount}
              total={subscriptionsData.pagination.total}
              loading={subscriptionsLoading}
              noun="subscriptions"
              onPageChange={setSubscriptionPage}
            />
          </>
        ) : null}
      </section>

      {detail && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-3 backdrop-blur-[2px] sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDetail();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-payment-detail-title"
            className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-white/[0.1] bg-[#111114] shadow-2xl shadow-black/50"
          >
            <header className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-[#a889ff]">
                  Payment details
                </p>
                <h2
                  id="admin-payment-detail-title"
                  className="mt-1 truncate font-mono text-sm font-semibold text-[#ededf2]"
                >
                  {shortId(detail.id)}
                </h2>
                <p className="mt-1 truncate text-[11px] text-[#8b8b94]">
                  {detail.user.name || 'Unknown user'}
                  {detail.user.email ? ` · ${detail.user.email}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {detailLoading && (
                  <span className="text-[10px] text-[#a889ff]">Refreshing…</span>
                )}
                <button
                  type="button"
                  aria-label="Close payment details"
                  onClick={closeDetail}
                  className="flex size-8 items-center justify-center rounded-md text-[#9999a2] transition hover:bg-white/[0.06] hover:text-white"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>
            </header>

            <div className="overflow-y-auto px-4 py-5 sm:px-6">
              {detailError && (
                <div className="mb-4">
                  <ErrorBanner
                    message={detailError}
                    onRetry={() => setDetailVersion((value) => value + 1)}
                  />
                </div>
              )}
              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                <DetailValue
                  label="Payment ID"
                  value={detail.id}
                  mono
                  copyValue={detail.id}
                />
                <DetailValue label="User" value={detail.user.name || 'Unknown user'} />
                <DetailValue label="Email" value={detail.user.email || '—'} />
                <DetailValue label="Role" value={detail.role || '—'} />
                <DetailValue label="Plan" value={detail.plan || '—'} />
                <DetailValue
                  label="Amount"
                  value={formatMoney(detail.amount, detail.currency)}
                />
                <DetailValue label="Currency" value={detail.currency.toUpperCase()} />
                <DetailValue label="Status" value={detail.status} />
                <DetailValue
                  label="Payment date"
                  value={formatDateTime(detail.paymentDate)}
                />
                <DetailValue
                  label="Payment method"
                  value={detail.paymentMethod || '—'}
                />
                <DetailValue
                  label="Invoice reference"
                  value={detail.invoiceReference || '—'}
                  mono
                  copyValue={detail.invoiceReference || undefined}
                />
                <DetailValue
                  label="Stripe session"
                  value={detail.stripeSessionId || '—'}
                  mono
                  copyValue={detail.stripeSessionId || undefined}
                />
                <DetailValue
                  label="Stripe invoice"
                  value={detail.stripeInvoiceId || '—'}
                  mono
                  copyValue={detail.stripeInvoiceId || undefined}
                />
              </div>

              <div className="mt-6 rounded-md border border-white/[0.07] bg-[#0d0d10] p-3.5 text-[11px] leading-5 text-[#8f8f98]">
                <div className="flex items-start gap-2">
                  <ShieldCheck
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-[#59d89b]"
                  />
                  <p>
                    Read-only view. Refunds, manual charges, and subscription
                    overrides are not available here. Stripe webhooks remain the
                    source of truth for payment status, and no raw card data is stored
                    or displayed.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function SubscriptionRow({ subscription }: { subscription: AdminSubscription }) {
  const usagePercent =
    subscription.limit > 0
      ? Math.min(100, (subscription.used / subscription.limit) * 100)
      : 0;

  return (
    <tr className="border-b border-white/[0.05] transition-colors last:border-0 hover:bg-white/[0.018]">
      <td className="max-w-[210px] px-4 py-3.5 sm:px-5">
        <span className="block truncate text-[10px] font-medium text-[#d4d4db]">
          {subscription.user.name || 'Unknown user'}
        </span>
        <span className="mt-1 block truncate text-[9px] text-[#777780]">
          {subscription.user.email || subscription.userId || 'No account ID'}
        </span>
      </td>
      <td className="px-3 py-3.5">
        <Pill className={getRoleStyle(subscription.role)}>{subscription.role}</Pill>
      </td>
      <td className="px-3 py-3.5">
        <Pill className={getPlanStyle(subscription.plan)}>{subscription.plan}</Pill>
      </td>
      <td className="px-3 py-3.5">
        <Pill className={getSubscriptionStatusStyle(subscription.status)}>
          {subscription.status}
        </Pill>
      </td>
      <td className="px-3 py-3.5 text-[10px] text-[#96969e]">
        {formatDate(subscription.startDate)}
      </td>
      <td className="px-3 py-3.5 text-[10px] text-[#96969e]">
        {subscription.expiryDate ? formatDate(subscription.expiryDate) : 'No expiry'}
      </td>
      <td className="px-3 py-3.5">
        <div className="min-w-[110px]">
          <div className="flex items-center justify-between gap-2 text-[10px] text-[#a8a8b0]">
            <span>
              {subscription.used.toLocaleString()} /{' '}
              {subscription.limit.toLocaleString()}
            </span>
            <span>{Math.round(usagePercent)}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-[#9b71ff]"
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>
      </td>
      <td className="px-3 py-3.5 text-[10px] text-[#96969e]">
        {formatDate(subscription.nextResetDate)}
      </td>
    </tr>
  );
}
