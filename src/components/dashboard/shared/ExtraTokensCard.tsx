'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Pricing = {
  unitAmountMinor: number | null;
  currency: string;
  minQuantity: number;
  maxQuantity: number;
  extraTokens: number;
  canBuy: boolean;
  reason: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPricing(value: unknown): value is Pricing {
  return isRecord(value) &&
    (value.unitAmountMinor === null || Number.isSafeInteger(value.unitAmountMinor)) &&
    typeof value.currency === 'string' &&
    Number.isInteger(value.minQuantity) &&
    (value.minQuantity as number) >= 1 &&
    Number.isInteger(value.maxQuantity) &&
    (value.maxQuantity as number) >= (value.minQuantity as number) &&
    Number.isInteger(value.extraTokens) &&
    typeof value.canBuy === 'boolean' &&
    typeof value.reason === 'string';
}

function formatMoney(amountMinor: number, currency: string) {
  const zeroDecimal = new Set(['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf']);
  const amount = amountMinor / (zeroDecimal.has(currency.toLowerCase()) ? 1 : 100);
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
  }
}

export default function ExtraTokensCard({ role }: { role: 'seeker' | 'recruiter' }) {
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadPricing() {
      try {
        const response = await fetch('/api/billing/token-pricing', { cache: 'no-store' });
        const data: unknown = await response.json();
        if (!response.ok || !isPricing(data)) {
          throw new Error(isRecord(data) && typeof data.error === 'string'
            ? data.error
            : 'Token pricing could not be loaded.');
        }
        if (active) {
          setPricing(data);
          setQuantity((current) => Math.min(data.maxQuantity, Math.max(data.minQuantity, current)));
          setError('');
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Token pricing could not be loaded.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void Promise.resolve().then(loadPricing);
    window.addEventListener('focus', loadPricing);
    return () => {
      active = false;
      window.removeEventListener('focus', loadPricing);
    };
  }, []);

  async function buyTokens() {
    if (!pricing || !pricing.canBuy || quantity < pricing.minQuantity || quantity > pricing.maxQuantity) return;
    setBuying(true);
    try {
      const response = await fetch('/api/billing/token-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      });
      const data: unknown = await response.json();
      if (!response.ok || !isRecord(data) || typeof data.url !== 'string') {
        throw new Error(isRecord(data) && typeof data.error === 'string'
          ? data.error
          : 'Token checkout could not be started.');
      }
      window.location.assign(data.url);
    } catch (buyError) {
      setError(buyError instanceof Error ? buyError.message : 'Token checkout could not be started.');
      setBuying(false);
    }
  }

  const label = role === 'seeker' ? 'Application tokens' : 'Job post tokens';
  const cardClass = role === 'seeker' ? 'border-[#26262b] bg-[#131316]' : 'border-[#252d43] bg-[#111827]/70';
  const unitAmount = pricing?.unitAmountMinor ?? 0;
  const quantityOptions = pricing
    ? [...new Set([pricing.minQuantity, Math.min(pricing.maxQuantity, pricing.minQuantity + 4), Math.min(pricing.maxQuantity, pricing.minQuantity + 9)])]
    : [];

  if (pricing?.reason === 'no_active_paid_plan') {
    return (
      <section id="extra-tokens" className={`rounded-xl border p-5 sm:p-6 ${cardClass}`} aria-labelledby="extra-token-title">
        <h2 id="extra-token-title" className="text-sm font-semibold text-white">Extra tokens</h2>
        <p role="status" className="mt-3 text-xs text-[#d7dbea]">You&apos;ve used all your monthly quota. Upgrade to buy tokens.</p>
        <Link href={`/dashboard/${role}/upgrade`} className="mt-4 inline-flex rounded-md bg-[#6258ff] px-4 py-2.5 text-[10px] font-semibold text-white hover:bg-[#7168ff]">Upgrade plan</Link>
      </section>
    );
  }

  if (pricing?.reason === 'sales_disabled') {
    return (
      <section id="extra-tokens" className={`rounded-xl border p-5 sm:p-6 ${cardClass}`} aria-labelledby="extra-token-title">
        <h2 id="extra-token-title" className="text-sm font-semibold text-white">Extra tokens</h2>
        <p role="status" className="mt-3 text-xs text-[#d7dbea]">Token sales are unavailable right now.</p>
      </section>
    );
  }

  return (
    <section id="extra-tokens" className={`rounded-xl border p-5 sm:p-6 ${cardClass}`} aria-labelledby="extra-token-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="extra-token-title" className="text-sm font-semibold text-white">Extra tokens</h2>
          <p className="mt-1 text-[10px] text-[#9ba4b7]">{label}</p>
        </div>
        {pricing && <p className="rounded-full border border-[#8178ff]/30 bg-[#8178ff]/10 px-3 py-1.5 text-[10px] text-[#d7d4ff]">Balance: <strong>{pricing.extraTokens}</strong></p>}
      </div>

      {loading ? (
        <p className="mt-4 text-xs text-[#9ba4b7]">Loading token pricing…</p>
      ) : error ? (
        <p role="alert" className="mt-4 text-xs text-rose-300">{error}</p>
      ) : pricing && (
        <>
          <p className="mt-4 text-xs text-[#d7dbea]">Your monthly quota is used. Extra tokens let you keep going.</p>
          <p className="mt-3 text-[10px] text-[#9ba4b7]">Price per token: {pricing.unitAmountMinor === null ? 'Unavailable' : formatMoney(unitAmount, pricing.currency)}</p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor={`token-quantity-${role}`} className="block text-[10px] text-[#9ba4b7]">Quantity ({pricing.minQuantity}–{pricing.maxQuantity})</label>
              <div className="mt-1 flex h-10 items-center overflow-hidden rounded-md border border-white/10 bg-[#0d0d11]">
                <button type="button" aria-label="Decrease token quantity" disabled={quantity <= pricing.minQuantity} onClick={() => setQuantity((current) => Math.max(pricing.minQuantity, current - 1))} className="h-full px-3 text-white hover:bg-white/10 disabled:opacity-40">−</button>
                <input id={`token-quantity-${role}`} type="number" min={pricing.minQuantity} max={pricing.maxQuantity} step="1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="h-full w-20 border-x border-white/10 bg-transparent px-2 text-center text-sm text-white outline-none" />
                <button type="button" aria-label="Increase token quantity" disabled={quantity >= pricing.maxQuantity} onClick={() => setQuantity((current) => Math.min(pricing.maxQuantity, current + 1))} className="h-full px-3 text-white hover:bg-white/10 disabled:opacity-40">+</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2" aria-label="Suggested token quantities">
              {quantityOptions.map((option) => <button key={option} type="button" onClick={() => setQuantity(option)} aria-pressed={quantity === option} className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] text-[#d7dbea] hover:border-[#8178ff]/50 aria-pressed:border-[#8178ff] aria-pressed:bg-[#8178ff]/15">{option} tokens</button>)}
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-white/[0.08] bg-black/20 p-4">
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[#9ba4b7]">Order summary</h3>
            <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-[#d7dbea]">
              <span>{quantity} {label.toLowerCase()} × {pricing.unitAmountMinor === null ? '—' : formatMoney(unitAmount, pricing.currency)}</span>
              <strong className="text-white">Estimated total: {pricing.unitAmountMinor === null ? '—' : formatMoney(unitAmount * quantity, pricing.currency)}</strong>
            </div>
          </div>

          {error && <p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>}
          <button type="button" onClick={() => void buyTokens()} disabled={!pricing.canBuy || buying || !Number.isInteger(quantity) || quantity < pricing.minQuantity || quantity > pricing.maxQuantity} className="mt-4 rounded-md bg-[#6258ff] px-4 py-2.5 text-[10px] font-semibold text-white hover:bg-[#7168ff] disabled:cursor-not-allowed disabled:opacity-50">{buying ? 'Opening Stripe…' : 'Buy tokens'}</button>
          <p className="mt-4 text-[9px] text-[#9ba4b7]">Tokens are non-refundable. Extra tokens never expire and carry over to next month.</p>
        </>
      )}
    </section>
  );
}
