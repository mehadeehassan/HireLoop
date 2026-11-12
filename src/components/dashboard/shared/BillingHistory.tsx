'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import DashboardIcon from './DashboardIcon';

export type BillingInvoiceRow = {
  id: string;
  paymentId: string | null;
  checkoutSessionId: string | null;
  number: string;
  date: string;
  plan: string;
  amountMinor: number;
  currency: string;
  status: string;
  invoiceUrl: string | null;
  invoicePdfUrl: string | null;
};

type PaymentDetails = {
  plan: string;
  amountMinor: number;
  currency: string;
  paymentStatus: string;
  paymentMethod: string | null;
  paymentDate: string | null;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  stripeInvoiceId: string | null;
  invoiceNumber: string | null;
  invoiceUrl: string | null;
  invoicePdfUrl: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
  if (/open|pending|draft|processing/i.test(value)) return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
  if (/void|uncollectible|failed|cancelled/i.test(value)) return 'border-red-500/20 bg-red-500/10 text-red-300';
  return 'border-white/10 bg-white/5 text-[#b8b8c2]';
}

function parseDetails(value: unknown): PaymentDetails | null {
  if (!isRecord(value) || !isRecord(value.payment)) return null;
  const payment = value.payment;
  if (
    typeof payment.plan !== 'string' ||
    typeof payment.amountMinor !== 'number' ||
    typeof payment.currency !== 'string' ||
    typeof payment.paymentStatus !== 'string'
  ) {
    return null;
  }
  const optionalString = (field: unknown) => (typeof field === 'string' ? field : null);
  return {
    plan: payment.plan,
    amountMinor: payment.amountMinor,
    currency: payment.currency,
    paymentStatus: payment.paymentStatus,
    paymentMethod: optionalString(payment.paymentMethod),
    paymentDate: optionalString(payment.paymentDate),
    stripeSessionId: optionalString(payment.stripeSessionId),
    stripePaymentIntentId: optionalString(payment.stripePaymentIntentId),
    stripeInvoiceId: optionalString(payment.stripeInvoiceId),
    invoiceNumber: optionalString(payment.invoiceNumber),
    invoiceUrl: optionalString(payment.invoiceUrl),
    invoicePdfUrl: optionalString(payment.invoicePdfUrl),
  };
}

function safeInvoicePdfUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      !['invoice.stripe.com', 'pay.stripe.com', 'files.stripe.com'].includes(url.hostname)
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export default function BillingHistory({
  invoices,
  loading,
  error,
}: {
  invoices: BillingInvoiceRow[];
  loading: boolean;
  error: string;
}) {
  const [search, setSearch] = useState('');
  const [pendingAction, setPendingAction] = useState<{
    sessionId: string;
    action: 'resume' | 'cancel';
  } | null>(null);
  const [cancelTarget, setCancelTarget] = useState<BillingInvoiceRow | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<BillingInvoiceRow | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return invoices;
    return invoices.filter((invoice) =>
      `${invoice.number} ${invoice.plan} ${statusOverrides[invoice.id] || invoice.status}`
        .toLowerCase()
        .includes(query),
    );
  }, [invoices, search, statusOverrides]);

  useEffect(() => {
    if (!selectedInvoice && !cancelTarget) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSelectedInvoice(null);
        setCancelTarget(null);
      }
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedInvoice, cancelTarget]);

  async function showDetails(invoice: BillingInvoiceRow) {
    setSelectedInvoice(invoice);
    setPaymentDetails(null);
    setDetailsError('');
    if (!invoice.paymentId) {
      setPaymentDetails({
        plan: invoice.plan,
        amountMinor: invoice.amountMinor,
        currency: invoice.currency,
        paymentStatus: statusOverrides[invoice.id] || invoice.status,
        paymentMethod: null,
        paymentDate: invoice.date || null,
        stripeSessionId: invoice.checkoutSessionId,
        stripePaymentIntentId: null,
        stripeInvoiceId: invoice.id,
        invoiceNumber: invoice.number,
        invoiceUrl: invoice.invoiceUrl,
        invoicePdfUrl: invoice.invoicePdfUrl,
      });
      return;
    }

    setDetailsLoading(true);
    try {
      const response = await fetch(`/api/billing/payments/${encodeURIComponent(invoice.paymentId)}`, {
        cache: 'no-store',
      });
      const result: unknown = await response.json();
      const parsed = parseDetails(result);
      if (!response.ok || !parsed) {
        throw new Error(
          isRecord(result) && typeof result.error === 'string'
            ? result.error
            : 'Payment details could not be loaded.',
        );
      }
      setPaymentDetails(parsed);
    } catch (loadError) {
      setDetailsError(loadError instanceof Error ? loadError.message : 'Payment details could not be loaded.');
    } finally {
      setDetailsLoading(false);
    }
  }

  function downloadInvoice(invoice: BillingInvoiceRow, pdfUrl = invoice.invoicePdfUrl) {
    if (!invoice.paymentId) return;
    const downloadUrl = safeInvoicePdfUrl(pdfUrl);
    if (!downloadUrl) {
      toast.error('This invoice PDF is not available from Stripe.');
      return;
    }
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function updatePendingCheckout(sessionId: string, action: 'resume' | 'cancel') {
    setPendingAction({ sessionId, action });
    try {
      const response = await fetch(
        `/api/billing/checkout-sessions/${encodeURIComponent(sessionId)}/${action}`,
        { method: 'POST' },
      );
      const result: unknown = await response.json();
      if (!response.ok || !isRecord(result)) {
        const code = isRecord(result) && typeof result.code === 'string' ? result.code : null;
        if (response.status === 410 && action === 'cancel') {
          setStatusOverrides((current) => ({ ...current, [sessionId]: 'cancelled' }));
        }
        if (code === 'CHECKOUT_PROCESSING' || code === 'PAYMENT_CONFIRMATION_PENDING') {
          setStatusOverrides((current) => ({ ...current, [sessionId]: 'processing' }));
        }
        throw new Error(
          isRecord(result) && typeof result.error === 'string'
            ? result.error
            : 'Could not update this pending payment.',
        );
      }

      if (action === 'resume') {
        if (result.status === 'succeeded') {
          window.location.reload();
          return;
        }
        if (typeof result.url !== 'string') throw new Error('The payment link is unavailable.');
        window.location.assign(result.url);
        return;
      }
      if (result.status !== 'cancelled') throw new Error('Cancellation was not confirmed.');
      setStatusOverrides((current) => ({ ...current, [sessionId]: 'cancelled' }));
      setCancelTarget(null);
      toast.success('Pending checkout cancelled.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update this pending payment.');
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <>
      <section className="mt-5 overflow-hidden rounded-xl border border-[#26262b] bg-[#131316]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#26262b] px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-[#ededf2]">Billing History</h2>
            <p className="mt-1 text-[9px] text-[#777780]">
              Invoices and payment status from your billing provider.
            </p>
          </div>
          <div className="billing-no-print flex flex-wrap items-center gap-2">
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
              onClick={() => window.print()}
              disabled={!filteredInvoices.length}
              className="rounded-md border border-[#303036] px-3 py-2 text-[10px] text-[#dedee3] hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ↓ Export PDF
            </button>
          </div>
        </div>

        {error && (
          <p role="status" className="border-b border-amber-500/15 bg-amber-500/[0.04] px-5 py-3 text-[10px] text-amber-300">
            {error}
          </p>
        )}

        {loading ? (
          <div className="space-y-px">{[0, 1, 2, 3].map((row) => <div key={row} className="h-14 animate-pulse bg-white/[0.025]" />)}</div>
        ) : filteredInvoices.length ? (
          <div className="overflow-x-auto">
            <div className="grid min-w-[900px] grid-cols-[.9fr_1fr_.8fr_1.1fr_.7fr_1.25fr] gap-3 bg-[#19191e] px-5 py-3 text-[9px] uppercase tracking-wide text-[#85858e]">
              <span>Date</span><span>Plan</span><span>Amount</span><span>Invoice</span><span>Status</span><span className="text-right">Actions</span>
            </div>
            <ul className="min-w-[900px] divide-y divide-[#242428]">
              {filteredInvoices.map((invoice) => {
                const status = statusOverrides[invoice.id] || invoice.status;
                const isPending = status.toLowerCase() === 'pending';
                const sessionId = invoice.checkoutSessionId;
                return (
                  <li
                    key={invoice.id}
                    className="grid grid-cols-[.9fr_1fr_.8fr_1.1fr_.7fr_1.25fr] items-center gap-3 px-5 py-4 text-[10px] transition-colors hover:bg-white/[0.018]"
                  >
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
                    <span className={`w-fit rounded-full border px-2.5 py-1 text-[9px] capitalize ${statusStyle(status)}`}>
                      {status}
                    </span>
                    <div className="billing-no-print flex items-center justify-end gap-1.5">
                      {isPending && sessionId ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void updatePendingCheckout(sessionId, 'resume')}
                            disabled={Boolean(pendingAction)}
                            aria-label={`Continue payment for ${invoice.number}`}
                            title="Continue payment"
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#8178ff]/25 bg-[#8178ff]/10 px-2.5 text-[9px] font-medium text-[#d0ccff] transition hover:border-[#8178ff]/50 hover:bg-[#8178ff]/20 disabled:cursor-wait disabled:opacity-50"
                          >
                            <DashboardIcon name="play" className="size-3.5" />
                            {pendingAction?.sessionId === sessionId && pendingAction.action === 'resume'
                              ? 'Opening…'
                              : 'Pay now'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setCancelTarget(invoice)}
                            disabled={Boolean(pendingAction)}
                            aria-label={`Cancel pending payment ${invoice.number}`}
                            title="Cancel pending payment"
                            className="flex size-8 items-center justify-center rounded-lg border border-white/10 text-[#a6a6af] transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-wait disabled:opacity-50"
                          >
                            <DashboardIcon name="close" className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void showDetails(invoice)}
                            aria-label={`View details for invoice ${invoice.number}`}
                            title="View details"
                            className="flex size-8 items-center justify-center rounded-lg border border-white/10 text-[#b8b8c2] transition hover:border-[#8178ff]/40 hover:bg-[#8178ff]/10 hover:text-white"
                          >
                            <DashboardIcon name="eye" className="size-4" />
                          </button>
                        </>
                      ) : isPending && invoice.invoiceUrl ? (
                        <>
                          <a
                            href={invoice.invoiceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#8178ff]/25 bg-[#8178ff]/10 px-2.5 text-[9px] font-medium text-[#d0ccff] transition hover:border-[#8178ff]/50 hover:bg-[#8178ff]/20"
                          >
                            <DashboardIcon name="play" className="size-3.5" />
                            Pay invoice
                          </a>
                          <button
                            type="button"
                            onClick={() => void showDetails(invoice)}
                            aria-label={`View details for invoice ${invoice.number}`}
                            title="View details"
                            className="flex size-8 items-center justify-center rounded-lg border border-white/10 text-[#b8b8c2] transition hover:border-[#8178ff]/40 hover:bg-[#8178ff]/10 hover:text-white"
                          >
                            <DashboardIcon name="eye" className="size-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => void showDetails(invoice)}
                            aria-label={`View details for invoice ${invoice.number}`}
                            title="View details"
                            className="flex size-8 items-center justify-center rounded-lg border border-white/10 text-[#b8b8c2] transition hover:border-[#8178ff]/40 hover:bg-[#8178ff]/10 hover:text-white"
                          >
                            <DashboardIcon name="eye" className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void downloadInvoice(invoice)}
                            disabled={!invoice.paymentId || !invoice.invoicePdfUrl}
                            aria-label={`Download invoice ${invoice.number}`}
                            title={invoice.invoicePdfUrl ? 'Download invoice PDF' : 'Invoice PDF is not available'}
                            className="flex size-8 items-center justify-center rounded-lg border border-white/10 text-[#b8b8c2] transition hover:border-[#8178ff]/40 hover:bg-[#8178ff]/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <DashboardIcon name="download" className="size-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <p className="text-xs font-medium text-[#d9d9df]">
              {search ? 'No matching invoices' : 'No billing transactions yet'}
            </p>
            <p className="mt-1 text-[10px] text-[#85858e]">
              {error || 'Your invoices will appear here when the billing service provides them.'}
            </p>
          </div>
        )}
      </section>

      {selectedInvoice && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedInvoice(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="billing-details-title"
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#151519] shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-white/[0.08] px-5 py-4">
              <div>
                <p className="text-[9px] uppercase tracking-[0.18em] text-[#85858e]">Payment details</p>
                <h2 id="billing-details-title" className="mt-1 text-base font-semibold text-white">
                  Invoice {paymentDetails?.invoiceNumber || selectedInvoice.number}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                aria-label="Close payment details"
                className="flex size-8 items-center justify-center rounded-lg border border-white/10 text-[#a6a6af] hover:bg-white/5 hover:text-white"
              >
                <DashboardIcon name="close" className="size-4" />
              </button>
            </div>
            <div className="px-5 py-5">
              {detailsLoading ? (
                <div className="space-y-3">{[0, 1, 2, 3].map((row) => <div key={row} className="h-10 animate-pulse rounded-lg bg-white/[0.04]" />)}</div>
              ) : detailsError ? (
                <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/[0.06] p-3 text-xs text-red-300">
                  {detailsError}
                </p>
              ) : paymentDetails ? (
                <>
                  <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
                    <div>
                      <p className="text-[10px] text-[#85858e]">Amount</p>
                      <p className="mt-1 text-xl font-semibold text-white">
                        {formatMoney(paymentDetails.amountMinor, paymentDetails.currency)}
                      </p>
                    </div>
                    <span className={`rounded-full border px-3 py-1.5 text-[10px] capitalize ${statusStyle(paymentDetails.paymentStatus)}`}>
                      {paymentDetails.paymentStatus}
                    </span>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3">
                    {[
                      ['Plan', paymentDetails.plan],
                      ['Payment date', formatDate(paymentDetails.paymentDate || selectedInvoice.date)],
                      ['Payment method', paymentDetails.paymentMethod || 'Card'],
                      ['Invoice number', paymentDetails.invoiceNumber || selectedInvoice.number],
                      ['Invoice reference', paymentDetails.stripeInvoiceId],
                      ['Payment reference', paymentDetails.stripePaymentIntentId || paymentDetails.stripeSessionId],
                    ].filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0)
                      .map(([label, value]) => (
                        <div key={label} className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
                          <dt className="text-[9px] text-[#85858e]">{label}</dt>
                          <dd className="mt-1 break-all text-[10px] text-[#dedee3]">{value}</dd>
                        </div>
                      ))}
                  </dl>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {paymentDetails.invoicePdfUrl && selectedInvoice.paymentId && (
                      <button
                        type="button"
                        onClick={() => downloadInvoice(selectedInvoice, paymentDetails.invoicePdfUrl)}
                        className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2.5 text-[10px] font-semibold text-[#171719] transition hover:bg-[#dedee3] disabled:opacity-60"
                      >
                        <DashboardIcon name="download" className="size-4" />
                        Download PDF
                      </button>
                    )}
                    {paymentDetails.invoiceUrl && (
                      <a
                        href={paymentDetails.invoiceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-white/10 px-3 py-2.5 text-[10px] text-[#dedee3] transition hover:bg-white/5"
                      >
                        Open hosted invoice
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-xs text-[#85858e]">No payment details are available for this invoice.</p>
              )}
            </div>
          </section>
        </div>
      )}

      {cancelTarget && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !pendingAction) setCancelTarget(null);
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cancel-payment-title"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151519] p-5 shadow-2xl"
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-red-500/10 text-red-300">
              <DashboardIcon name="close" className="size-5" />
            </div>
            <h2 id="cancel-payment-title" className="mt-4 text-base font-semibold text-white">
              Cancel this pending payment?
            </h2>
            <p className="mt-2 text-xs leading-5 text-[#9b9ba4]">
              The checkout for invoice {cancelTarget.number} will be closed. Your current plan will not change.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                disabled={Boolean(pendingAction)}
                className="rounded-lg border border-white/10 px-3 py-2 text-[10px] text-[#dedee3] hover:bg-white/5 disabled:opacity-50"
              >
                Keep payment
              </button>
              <button
                type="button"
                onClick={() => {
                  if (cancelTarget.checkoutSessionId) {
                    void updatePendingCheckout(cancelTarget.checkoutSessionId, 'cancel');
                  }
                }}
                disabled={Boolean(pendingAction) || !cancelTarget.checkoutSessionId}
                className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-[10px] font-medium text-red-300 hover:bg-red-500/15 disabled:opacity-50"
              >
                {pendingAction?.action === 'cancel' ? 'Cancelling…' : 'Cancel checkout'}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
