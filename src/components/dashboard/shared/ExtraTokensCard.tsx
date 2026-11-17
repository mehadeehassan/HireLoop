'use client';

import { useEffect, useState } from 'react';

type Pricing = { unitAmountMinor: number | null; currency: string; minQuantity: number; maxQuantity: number; extraTokens: number; canBuy: boolean; reason: string };
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function money(minor: number, currency: string) {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(minor / 100); }
  catch { return `${(minor / 100).toFixed(2)} ${currency.toUpperCase()}`; }
}

export default function ExtraTokensCard({ role }: { role: 'seeker' | 'recruiter' }) {
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [buying, setBuying] = useState(false);
  useEffect(() => {
    let active = true;
    fetch('/api/billing/token-pricing', { cache: 'no-store' }).then(async (response) => {
      const data: unknown = await response.json();
      if (!response.ok || !isRecord(data) || !Number.isInteger(data.extraTokens) || !Number.isInteger(data.minQuantity) || !Number.isInteger(data.maxQuantity) || typeof data.canBuy !== 'boolean' || typeof data.reason !== 'string' || typeof data.currency !== 'string' || (data.unitAmountMinor !== null && !Number.isSafeInteger(data.unitAmountMinor))) throw new Error(isRecord(data) && typeof data.error === 'string' ? data.error : 'Token pricing could not be loaded.');
      if (active) {
        const parsed = data as unknown as Pricing;
        setPricing(parsed);
        setQuantity(parsed.minQuantity);
      }
    }).catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Token pricing could not be loaded.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function buyTokens() {
    if (!pricing || !pricing.canBuy || quantity < pricing.minQuantity || quantity > pricing.maxQuantity) return;
    setBuying(true);
    try {
      const response = await fetch('/api/billing/token-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quantity }) });
      const data: unknown = await response.json();
      if (!response.ok || !isRecord(data) || typeof data.url !== 'string') throw new Error(isRecord(data) && typeof data.error === 'string' ? data.error : 'Token checkout could not be started.');
      window.location.assign(data.url);
    } catch (buyError) {
      setError(buyError instanceof Error ? buyError.message : 'Token checkout could not be started.');
      setBuying(false);
    }
  }

  const unit = pricing?.unitAmountMinor ?? 0;
  const canBuyMessage = pricing?.reason === 'no_active_paid_plan' ? 'Upgrade to buy tokens' : pricing?.reason === 'sales_disabled' ? 'Token sales are unavailable' : '';
  const cardClass = role === 'seeker' ? 'border-[#26262b] bg-[#131316]' : 'border-[#252d43] bg-[#111827]/70';
  return <section className={`rounded-xl border p-5 sm:p-6 ${cardClass}`} aria-labelledby="extra-token-title">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="extra-token-title" className="text-sm font-semibold text-white">Extra tokens</h2><p className="mt-1 text-[10px] text-[#9ba4b7]">{role === 'seeker' ? 'Application tokens' : 'Job post tokens'}</p></div><p className="text-xs text-[#d7dbea]">Balance: <strong>{loading ? '—' : pricing?.extraTokens ?? '—'}</strong></p></div>
    {loading ? <p className="mt-4 text-xs text-[#9ba4b7]">Loading token pricing…</p> : error ? <p role="alert" className="mt-4 text-xs text-rose-300">{error}</p> : pricing && <>
      <p className="mt-4 text-xs text-[#d7dbea]">Price per token: {pricing.unitAmountMinor === null ? 'Unavailable' : money(unit, pricing.currency)}</p>
      <label className="mt-4 block text-[10px] text-[#9ba4b7]" htmlFor={`token-quantity-${role}`}>Quantity ({pricing.minQuantity}–{pricing.maxQuantity})</label>
      <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center"><input id={`token-quantity-${role}`} type="number" min={pricing.minQuantity} max={pricing.maxQuantity} step="1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="h-10 w-full rounded-md border border-white/10 bg-[#0d0d11] px-3 text-sm text-white sm:max-w-40" />
        <p className="text-xs text-white">Estimated total: {pricing.unitAmountMinor === null ? '—' : money(unit * quantity, pricing.currency)}</p>
      </div>
      {canBuyMessage ? <p className="mt-3 text-[10px] text-amber-300">{canBuyMessage}</p> : null}
      <button type="button" onClick={() => void buyTokens()} disabled={!pricing.canBuy || buying || !Number.isInteger(quantity) || quantity < pricing.minQuantity || quantity > pricing.maxQuantity} className="mt-4 rounded-md bg-[#6258ff] px-4 py-2.5 text-[10px] font-semibold text-white hover:bg-[#7168ff] disabled:cursor-not-allowed disabled:opacity-50">{buying ? 'Opening Stripe…' : 'Buy tokens'}</button>
      <p className="mt-4 text-[9px] text-[#9ba4b7]">Tokens are non-refundable. Extra tokens never expire and carry over to next month.</p>
    </>}
  </section>;
}
