'use client';

import {
  BriefcaseBusiness,
  Building2,
  CreditCard,
  ClipboardList,
  Download,
  RefreshCw,
  UserRound,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';

type AdminDashboardPeriod = '30d' | '90d' | 'all';
type DashboardSummary = {
  totalUsers: number;
  totalSeekers: number;
  totalRecruiters: number;
  totalCompanies: number;
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  totalPayments: number;
};
type AdminTransaction = {
  id: string;
  ownerName: string | null;
  ownerEmail: string | null;
  plan: string | null;
  role: string | null;
  reference: string;
  amount: number | null;
  currency: string | null;
  status: string | null;
  paymentDate: string | null;
  createdAt: string | null;
};
type AdminDashboardData = {
  period: AdminDashboardPeriod;
  summary: DashboardSummary;
  transactions: AdminTransaction[];
};

const metrics = [
  { label: 'Total Users', key: 'totalUsers', icon: Users },
  { label: 'Total Seekers', key: 'totalSeekers', icon: UserRound },
  { label: 'Total Recruiters', key: 'totalRecruiters', icon: BriefcaseBusiness },
  { label: 'Total Companies', key: 'totalCompanies', icon: Building2 },
  { label: 'Total Jobs', key: 'totalJobs', icon: ClipboardList },
  { label: 'Active Jobs', key: 'activeJobs', icon: BriefcaseBusiness },
  { label: 'Total Applications', key: 'totalApplications', icon: ClipboardList },
  { label: 'Total Payments', key: 'totalPayments', icon: CreditCard },
] as const;

const periodLabels: Record<AdminDashboardPeriod, string> = {
  '30d': 'Last 30 Days',
  '90d': 'Last 90 Days',
  all: 'All Time',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isAdminDashboardData(value: unknown): value is AdminDashboardData {
  if (!isRecord(value) || !isRecord(value.summary) || !Array.isArray(value.transactions)) {
    return false;
  }
  if (!['30d', '90d', 'all'].includes(String(value.period))) return false;

  const summary = value.summary;
  const summaryKeys = metrics.map(({ key }) => key);
  if (!summaryKeys.every((key) => (
    typeof summary[key] === 'number' &&
    Number.isSafeInteger(summary[key]) &&
    summary[key] >= 0
  ))) {
    return false;
  }

  return value.transactions.every((transaction) => (
    isRecord(transaction) &&
    typeof transaction.id === 'string' &&
    typeof transaction.reference === 'string' &&
    nullableString(transaction.ownerName) &&
    nullableString(transaction.ownerEmail) &&
    nullableString(transaction.plan) &&
    nullableString(transaction.role) &&
    (transaction.amount === null ||
      (typeof transaction.amount === 'number' && Number.isFinite(transaction.amount))) &&
    nullableString(transaction.currency) &&
    nullableString(transaction.status) &&
    nullableString(transaction.paymentDate) &&
    nullableString(transaction.createdAt)
  ));
}

function formatAmount(amount: number | null, currency: string | null) {
  if (amount === null) return '—';
  if (!currency) return amount.toLocaleString();
  const normalizedCurrency = currency.toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
    return `${amount.toLocaleString()} ${currency}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: normalizedCurrency,
  }).format(amount);
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function statusStyle(status: string | null) {
  switch (status?.toLowerCase()) {
    case 'paid':
    case 'succeeded':
    case 'success':
      return { label: 'Success', className: 'bg-emerald-400/10 text-emerald-400' };
    case 'pending':
    case 'open':
      return { label: 'Pending', className: 'bg-amber-400/10 text-amber-400' };
    case 'failed':
    case 'canceled':
    case 'cancelled':
      return { label: 'Failed', className: 'bg-rose-400/10 text-rose-400' };
    default:
      return { label: status || 'Unknown', className: 'bg-white/[0.07] text-[#aaaab2]' };
  }
}

function csvCell(value: string | number | null) {
  const text = value === null ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function exportReport(data: AdminDashboardData) {
  const rows: Array<Array<string | number | null>> = [
    ['Metric', 'Value'],
    ...metrics.map(({ label, key }) => [label, data.summary[key]]),
    [],
    ['Account', 'Email', 'Plan', 'Role', 'Reference', 'Amount', 'Status', 'Date'],
    ...data.transactions.map((transaction) => [
      transaction.ownerName,
      transaction.ownerEmail,
      transaction.plan,
      transaction.role,
      transaction.reference,
      formatAmount(transaction.amount, transaction.currency),
      transaction.status,
      formatDate(transaction.paymentDate || transaction.createdAt),
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'hireloop-admin-dashboard.csv';
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function LoadingCards() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <div
          key={metric.key}
          aria-hidden="true"
          className="h-[116px] animate-pulse rounded-xl border border-white/[0.07] bg-[#131316]"
        />
      ))}
    </div>
  );
}

export default function AdminDashboardOverview() {
  const [period, setPeriod] = useState<AdminDashboardPeriod>('30d');
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      try {
        const response = await fetch(`/api/admin/dashboard?period=${period}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
          const message = isRecord(payload) && typeof payload.error === 'string'
            ? payload.error
            : 'Could not load dashboard statistics.';
          throw new Error(message);
        }
        if (!isAdminDashboardData(payload)) {
          throw new Error('The dashboard service returned invalid data.');
        }
        setData(payload);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(loadError instanceof Error ? loadError.message : 'Could not load dashboard statistics.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadDashboard();
    return () => controller.abort();
  }, [period, retryCount]);

  const allCountsAreZero = data && Object.values(data.summary).every((value) => value === 0);

  return (
    <div className="mx-auto w-full max-w-[1440px] py-5 lg:py-7">
      <div className="mb-5 text-[11px] text-[#85858d]">
        Admin <span className="px-1.5 text-[#4f4f56]">/</span> Dashboard Overview
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.03em] text-[#f0f0f3] sm:text-2xl">
            Dashboard Overview
          </h1>
          <p className="mt-1 text-xs text-[#8d8d95]">
            Current platform activity and subscription payments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="admin-transaction-period">
            Transaction date range
          </label>
          <select
            id="admin-transaction-period"
            value={period}
            onChange={(event) => {
              setLoading(true);
              setData(null);
              setError('');
              setPeriod(event.target.value as AdminDashboardPeriod);
            }}
            className="h-9 rounded-md border border-white/[0.09] bg-[#17171b] px-3 text-xs text-[#d3d3d9] outline-none focus:border-[#9b71ff]/70"
          >
            {Object.entries(periodLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => data && exportReport(data)}
            disabled={!data || loading}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-[#f0f0f2] px-3 text-xs font-medium text-[#17171b] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Download aria-hidden="true" className="size-3.5" />
            Export Report
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 flex flex-col gap-3 rounded-lg border border-rose-400/20 bg-rose-400/[0.06] p-4 text-sm text-rose-200 sm:flex-row sm:items-center sm:justify-between"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setData(null);
              setError('');
              setRetryCount((count) => count + 1);
            }}
            className="inline-flex shrink-0 items-center gap-2 rounded-md border border-rose-300/20 px-3 py-2 text-xs transition hover:bg-rose-300/10"
          >
            <RefreshCw aria-hidden="true" className="size-3.5" />
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <LoadingCards />
      ) : data ? (
        <>
          {allCountsAreZero && (
            <p className="mb-4 rounded-lg border border-white/[0.07] bg-[#131316] px-4 py-3 text-xs text-[#a2a2aa]">
              No platform records are available yet.
            </p>
          )}
          <section aria-label="Platform statistics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(({ label, key, icon: Icon }) => (
              <article
                key={key}
                className="min-h-[116px] rounded-xl border border-white/[0.07] bg-[#131316] p-4 transition-colors hover:border-white/[0.12]"
              >
                <div className="mb-3 flex items-start justify-between">
                  <span className="flex size-8 items-center justify-center rounded-md bg-[#252529] text-[#d2d2d8]">
                    <Icon aria-hidden="true" className="size-4" strokeWidth={1.8} />
                  </span>
                  <span className="text-[10px] text-[#77777f]">All time</span>
                </div>
                <p className="text-[11px] text-[#9999a1]">{label}</p>
                <p className="mt-0.5 text-[21px] font-semibold leading-6 tracking-[-0.02em] text-[#ededf0]">
                  {data.summary[key].toLocaleString()}
                </p>
              </article>
            ))}
          </section>

          <section
            aria-labelledby="admin-recent-transactions"
            className="mt-5 overflow-hidden rounded-xl border border-white/[0.07] bg-[#131316]"
          >
            <div className="flex flex-col gap-2 border-b border-white/[0.07] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <h2 id="admin-recent-transactions" className="text-sm font-semibold text-[#ededf0]">
                  Recent Subscription Transactions
                </h2>
                <p className="mt-1 text-[10px] text-[#85858d]">
                  Payment records from {periodLabels[data.period].toLowerCase()}.
                </p>
              </div>
              <span className="text-[10px] text-[#85858d]">
                {data.transactions.length.toLocaleString()} shown
              </span>
            </div>

            {data.transactions.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <CreditCard aria-hidden="true" className="mx-auto size-6 text-[#66666e]" />
                <p className="mt-3 text-xs font-medium text-[#c5c5cc]">No transactions in this period</p>
                <p className="mt-1 text-[11px] text-[#85858d]">
                  Payment records will appear here when available.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.015] text-[9px] font-medium uppercase tracking-[0.08em] text-[#77777f]">
                      <th scope="col" className="px-4 py-3 font-medium sm:px-5">User / Recruiter</th>
                      <th scope="col" className="px-3 py-3 font-medium">Plan Type</th>
                      <th scope="col" className="px-3 py-3 font-medium">Transaction ID</th>
                      <th scope="col" className="px-3 py-3 font-medium">Amount</th>
                      <th scope="col" className="px-3 py-3 font-medium">Date</th>
                      <th scope="col" className="px-4 py-3 font-medium sm:px-5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transactions.map((transaction) => {
                      const status = statusStyle(transaction.status);
                      const account = transaction.ownerName || transaction.ownerEmail || 'Account unavailable';

                      return (
                        <tr
                          key={transaction.id}
                          className="border-b border-white/[0.055] last:border-0 transition-colors hover:bg-white/[0.02]"
                        >
                          <td className="px-4 py-3.5 sm:px-5">
                            <p className="max-w-[210px] truncate text-[11px] font-medium text-[#e2e2e7]">
                              {account}
                            </p>
                            <p className="mt-0.5 text-[10px] text-[#85858d]">
                              {transaction.ownerEmail || transaction.role || '—'}
                            </p>
                          </td>
                          <td className="px-3 py-3.5">
                            <span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-[10px] text-[#c2c2c9]">
                              {transaction.plan || '—'}
                            </span>
                          </td>
                          <td className="px-3 py-3.5 font-mono text-[10px] text-[#a1a1a9]">
                            {transaction.reference.slice(0, 20)}
                          </td>
                          <td className="px-3 py-3.5 text-[10px] font-medium text-[#dedee3]">
                            {formatAmount(transaction.amount, transaction.currency)}
                          </td>
                          <td className="px-3 py-3.5 text-[10px] text-[#a1a1a9]">
                            {formatDate(transaction.paymentDate || transaction.createdAt)}
                          </td>
                          <td className="px-4 py-3.5 sm:px-5">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium ${status.className}`}>
                              {status.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
