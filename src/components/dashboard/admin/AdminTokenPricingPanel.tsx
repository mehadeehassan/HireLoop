'use client';

import { useEffect, useState } from 'react';

type TokenPrice = { role: 'seeker' | 'recruiter'; unitAmountMinor: number; currency: string; minQuantity: number; maxQuantity: number; isActive: boolean; currencyCompatible: boolean };
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function isPrice(value: unknown): value is TokenPrice { return isRecord(value) && (value.role === 'seeker' || value.role === 'recruiter') && Number.isSafeInteger(value.unitAmountMinor) && typeof value.currency === 'string' && Number.isInteger(value.minQuantity) && Number.isInteger(value.maxQuantity) && typeof value.isActive === 'boolean' && (value.currencyCompatible === undefined || typeof value.currencyCompatible === 'boolean'); }
const zeroDecimalCurrencies = new Set(['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf']);
const minimumChargeByCurrency: Record<string, number> = { usd: 50, aed: 200, ars: 50, aud: 50, brl: 50, cad: 50, chf: 50, czk: 1500, dkk: 250, eur: 50, gbp: 30, hkd: 400, huf: 17500, idr: 50, ils: 50, inr: 50, jpy: 50, krw: 50, mxn: 1000, myr: 200, nok: 300, nzd: 50, php: 50, pln: 200, sgd: 50, sek: 300, thb: 1000, zar: 50 };
function toDecimal(minor: number, currency: string) { return (minor / (zeroDecimalCurrencies.has(currency.toLowerCase()) ? 1 : 100)).toFixed(2); }

export default function AdminTokenPricingPanel() {
  const [prices, setPrices] = useState<TokenPrice[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { amount: string; min: string; max: string; active: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/pricing/tokens', { cache: 'no-store' });
      const data: unknown = await response.json();
      if (!response.ok || !isRecord(data) || !Array.isArray(data.prices) || !data.prices.every(isPrice)) throw new Error(isRecord(data) && typeof data.error === 'string' ? data.error : 'Token pricing could not be loaded.');
      setPrices(data.prices);
      setDrafts(Object.fromEntries(data.prices.map((price) => [price.role, { amount: toDecimal(price.unitAmountMinor, price.currency), min: String(price.minQuantity), max: String(price.maxQuantity), active: price.isActive }])));
      setError('');
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Token pricing could not be loaded.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void Promise.resolve().then(load); }, []);
  async function save(role: TokenPrice['role']) {
    const draft = drafts[role];
    if (!draft) return;
    const unitAmount = Number(draft.amount);
    let minQuantity = Number(draft.min);
    const maxQuantity = Number(draft.max);
    if (!Number.isFinite(unitAmount) || unitAmount <= 0 || !Number.isInteger(minQuantity) || minQuantity < 1 || !Number.isInteger(maxQuantity) || maxQuantity < minQuantity || maxQuantity > 10000) { setError('Enter a valid price and quantity range (1–10,000).'); return; }
    const selectedPrice = prices.find((price) => price.role === role);
    const currency = selectedPrice?.currency.toLowerCase() || 'usd';
    const multiplier = zeroDecimalCurrencies.has(currency) ? 1 : 100;
    const unitAmountMinor = Math.round(unitAmount * multiplier);
    const minimumChargeMinor = minimumChargeByCurrency[currency];
    const requiredMinimum = minimumChargeMinor && unitAmountMinor > 0
      ? Math.ceil(minimumChargeMinor / unitAmountMinor)
      : minQuantity;
    if (requiredMinimum > maxQuantity) {
      setError(`The maximum quantity must be at least ${requiredMinimum} for this token price to meet Stripe’s minimum charge.`);
      setNotice('');
      return;
    }
    const minimumWasAdjusted = requiredMinimum > minQuantity;
    minQuantity = Math.max(minQuantity, requiredMinimum);
    setSaving(role); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/pricing/tokens', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role, unitAmount, minQuantity, maxQuantity, isActive: draft.active }) });
      const data: unknown = await response.json();
      if (!response.ok || !isPrice(data)) throw new Error(isRecord(data) && typeof data.error === 'string' ? data.error : 'Token price could not be saved.');
      await load();
      if (minimumWasAdjusted) setNotice(`${role} minimum quantity was set to ${minQuantity} to meet Stripe’s minimum charge.`);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Token price could not be saved.'); }
    finally { setSaving(null); }
  }
  return <section className="mb-6 rounded-xl border border-white/[0.07] bg-[#111114] p-5 sm:p-6">
    <h2 className="text-sm font-semibold text-white">Token price</h2>
    <p className="mt-1 text-[10px] text-[#92929b]">Set role-specific price and purchase quantity limits. Prices are converted to minor units by the server.</p>
    {error && <p role="alert" className="mt-3 rounded-md border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-300">{error}</p>}
    {notice && <p role="status" className="mt-3 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-300">{notice}</p>}
    {loading ? <p className="mt-4 text-xs text-[#92929b]">Loading token prices…</p> : <div className="mt-4 grid gap-4 lg:grid-cols-2">{prices.map((price) => {
      const draft = drafts[price.role];
      if (!draft) return null;
      return <div key={price.role} className="rounded-lg border border-white/[0.08] bg-[#0b0b0e] p-4">
        <h3 className="text-xs font-semibold capitalize text-white">{price.role}</h3>
        {!price.currencyCompatible && <p className="mt-2 text-[10px] text-amber-300">Growth and Premium plan currencies must match before token sales can be enabled.</p>}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="text-[10px] text-[#aaaab3]">Price ({price.currency.toUpperCase()})<input aria-label={`${price.role} token price`} type="number" min="0.01" step="0.01" value={draft.amount} onChange={(event) => setDrafts((current) => ({ ...current, [price.role]: { ...draft, amount: event.target.value } }))} className="mt-1 h-9 w-full rounded border border-white/10 bg-[#151519] px-2 text-xs text-white" /></label>
          <label className="text-[10px] text-[#aaaab3]">Minimum quantity<input aria-label={`${price.role} minimum quantity`} type="number" min="1" max="10000" step="1" value={draft.min} onChange={(event) => setDrafts((current) => ({ ...current, [price.role]: { ...draft, min: event.target.value } }))} className="mt-1 h-9 w-full rounded border border-white/10 bg-[#151519] px-2 text-xs text-white" /></label>
          <label className="text-[10px] text-[#aaaab3]">Maximum quantity<input aria-label={`${price.role} maximum quantity`} type="number" min="1" max="10000" step="1" value={draft.max} onChange={(event) => setDrafts((current) => ({ ...current, [price.role]: { ...draft, max: event.target.value } }))} className="mt-1 h-9 w-full rounded border border-white/10 bg-[#151519] px-2 text-xs text-white" /></label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-[10px] text-[#d6d6dc]"><input type="checkbox" checked={draft.active} onChange={(event) => setDrafts((current) => ({ ...current, [price.role]: { ...draft, active: event.target.checked } }))} />Enable token sales</label>
        <button type="button" onClick={() => void save(price.role)} disabled={saving === price.role} className="mt-4 rounded-md bg-[#6258ff] px-4 py-2 text-[10px] font-semibold text-white disabled:opacity-60">{saving === price.role ? 'Saving…' : 'Save token price'}</button>
      </div>;
    })}</div>}
  </section>;
}
