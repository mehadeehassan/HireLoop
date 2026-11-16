'use client';

import { Check, CircleAlert, History, LoaderCircle, Plus, Tag } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { isAdminAuditLogsList, type AdminAuditLogsList } from '@/lib/admin-settings-contract';

type Role = 'seeker' | 'recruiter';
type Plan = 'Starter' | 'Growth' | 'Premium';
type Interval = 'month' | 'year';
type PriceHistory = {
  interval: Interval;
  amount: number;
  currency: string;
  stripePriceId: string | null;
  replacedAt: string;
  replacedBy: string;
};
type PlanPrice = {
  role: Role;
  planName: Plan;
  price: number;
  yearlyPrice: number;
  currency: string;
  stripeProductId?: string;
  stripePrices?: Partial<Record<Interval, string>>;
  priceHistory?: PriceHistory[];
};
type Campaign = {
  id: string;
  name: string;
  type: 'percent' | 'fixed';
  value: number;
  currency: string | null;
  roles: Role[];
  plans: Plan[];
  intervals: Interval[];
  duration: 'once' | 'repeating' | 'forever';
  durationMonths: number | null;
  code: string | null;
  startsAt: string | null;
  expiresAt: string | null;
  maxRedemptions: number | null;
  timesRedeemed: number;
  active: boolean;
  createdAt: string | null;
};
type PricingData = { plans: PlanPrice[]; campaigns: Campaign[]; currencies: string[] };

const roleOptions: Role[] = ['seeker', 'recruiter'];
const planOptions: Plan[] = ['Starter', 'Growth', 'Premium'];
const intervalOptions: Interval[] = ['month', 'year'];
const inputClass = 'h-10 w-full rounded-md border border-white/[0.09] bg-[#111114] px-3 text-xs text-[#e7e7ec] outline-none transition focus:border-[#9b71ff]/70';
const cardClass = 'rounded-lg border border-white/[0.07] bg-[#111114]';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isPricingData(value: unknown): value is PricingData {
  return isRecord(value) && Array.isArray(value.plans) && Array.isArray(value.campaigns) &&
    Array.isArray(value.currencies) && value.plans.every((item) => isRecord(item) &&
      roleOptions.includes(item.role as Role) && planOptions.includes(item.planName as Plan) &&
      typeof item.price === 'number' && typeof item.yearlyPrice === 'number' && typeof item.currency === 'string' &&
      (item.stripePrices === undefined || (isRecord(item.stripePrices) &&
        (item.stripePrices.month === undefined || typeof item.stripePrices.month === 'string') &&
        (item.stripePrices.year === undefined || typeof item.stripePrices.year === 'string'))) &&
      (item.priceHistory === undefined || (Array.isArray(item.priceHistory) && item.priceHistory.every((entry) =>
        isRecord(entry) && intervalOptions.includes(entry.interval as Interval) &&
        typeof entry.amount === 'number' && typeof entry.currency === 'string' &&
        (entry.stripePriceId === null || typeof entry.stripePriceId === 'string') &&
        typeof entry.replacedAt === 'string')))) &&
    value.campaigns.every((item) => isRecord(item) && typeof item.id === 'string' &&
      typeof item.name === 'string' && typeof item.active === 'boolean' && typeof item.timesRedeemed === 'number' &&
      ['percent', 'fixed'].includes(String(item.type)) && typeof item.value === 'number' &&
      Array.isArray(item.roles) && item.roles.every((role) => roleOptions.includes(role as Role)) &&
      Array.isArray(item.plans) && item.plans.every((plan) => planOptions.includes(plan as Plan)) &&
      Array.isArray(item.intervals) && item.intervals.every((interval) => intervalOptions.includes(interval as Interval)) &&
      ['once', 'repeating', 'forever'].includes(String(item.duration)) &&
      (item.code === null || typeof item.code === 'string') &&
      (item.startsAt === null || typeof item.startsAt === 'string') &&
      (item.expiresAt === null || typeof item.expiresAt === 'string') &&
      (item.maxRedemptions === null || typeof item.maxRedemptions === 'number')) &&
    value.currencies.every((currency) => typeof currency === 'string');
}
function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(amount);
  } catch {
    return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
  }
}
async function readResponse(response: Response) {
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(isRecord(payload) && typeof payload.error === 'string' ? payload.error : 'The request failed.');
  }
  return payload;
}

export default function AdminPricingManager() {
  const [data, setData] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auditHistory, setAuditHistory] = useState<AdminAuditLogsList | null>(null);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, { amount: string; currency: string }>>({});
  const [savingPrice, setSavingPrice] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ key: string; plan: PlanPrice; interval: Interval; amount: number; currency: string; requestId: string } | null>(null);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [campaignDraft, setCampaignDraft] = useState({
    name: '', type: 'percent' as 'percent' | 'fixed', value: '', currency: 'usd',
    roles: ['seeker'] as Role[], plans: ['Growth'] as Plan[], intervals: ['month'] as Interval[],
    duration: 'once' as 'once' | 'repeating' | 'forever', durationMonths: '3', code: '',
    startsAt: '', expiresAt: '', maxRedemptions: '',
  });
  const campaignRequestId = useRef<string | null>(null);

  const fetchData = useCallback(async () => {
    const [payload, auditPayload] = await Promise.all([
      fetch('/api/admin/pricing', { cache: 'no-store' }).then(readResponse),
      fetch('/api/admin/settings/audit-logs?page=1&pageSize=20&section=pricing', { cache: 'no-store' }).then(readResponse),
    ]);
    if (!isPricingData(payload)) throw new Error('The pricing response was invalid.');
    if (!isAdminAuditLogsList(auditPayload)) throw new Error('The pricing audit response was invalid.');
    setData(payload);
    setAuditHistory(auditPayload);
    setPriceDrafts(Object.fromEntries(payload.plans.flatMap((plan) => intervalOptions.map((interval) => {
      const key = `${plan.role}:${plan.planName}:${interval}`;
      return [key, { amount: String(interval === 'month' ? plan.price : plan.yearlyPrice), currency: plan.currency }];
    }))));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchData();
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Could not load subscription pricing.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  useEffect(() => {
    void Promise.resolve().then(fetchData)
      .catch((loadError: unknown) => {
        const message = loadError instanceof Error ? loadError.message : 'Could not load subscription pricing.';
        setError(message);
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }, [fetchData]);

  const campaigns = data?.campaigns ?? [];
  function applicableAutomaticDiscount(plan: PlanPrice, interval: Interval, amount: number, currency: string) {
    const item = campaigns.find((campaign) => campaign.active && !campaign.code &&
      campaign.roles.includes(plan.role) && campaign.plans.includes(plan.planName) &&
      campaign.intervals.includes(interval) &&
      (campaign.type !== 'fixed' || campaign.currency?.toLowerCase() === currency.toLowerCase()));
    if (!item) return null;
    const value = item.type === 'percent' ? amount * item.value / 100 : item.value;
    if (value <= 0 || value > amount) return null;
    return { label: item.type === 'percent' ? `${item.value}%` : formatPrice(value, currency), value };
  }
  const history = useMemo(() => (data?.plans ?? []).flatMap((plan) =>
    (plan.priceHistory ?? []).map((item) => ({ ...item, role: plan.role, plan: plan.planName })),
  ).sort((a, b) => new Date(b.replacedAt).getTime() - new Date(a.replacedAt).getTime()), [data]);

  function confirmPrice(plan: PlanPrice, interval: Interval) {
    const key = `${plan.role}:${plan.planName}:${interval}`;
    const draft = priceDrafts[key];
    const amount = Number(draft?.amount);
    if (!Number.isFinite(amount) || amount < 0 || amount > 999999) {
      toast.error('Enter a valid non-negative price.');
      return;
    }
    setPreview({ key, plan, interval, amount, currency: draft.currency, requestId: crypto.randomUUID() });
  }

  async function savePrice() {
    if (!preview) return;
    const { plan, interval, amount, currency, key } = preview;
    setSavingPrice(key);
    try {
      const response = await fetch(`/api/admin/pricing/${plan.role}/${plan.planName}/${interval}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency, requestId: preview.requestId }),
      });
      await readResponse(response);
      toast.success(`${plan.role} ${plan.planName} ${interval} price updated.`);
      setPreview(null);
      await load();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Could not update this price.');
    } finally {
      setSavingPrice(null);
    }
  }

  async function createCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(campaignDraft.value);
    if (!campaignDraft.name.trim() || !Number.isFinite(value) || value <= 0 ||
      (campaignDraft.type === 'percent' && value > 100)) {
      toast.error('Enter a campaign name and a valid discount value.');
      return;
    }
    setSavingCampaign(true);
    try {
      campaignRequestId.current ??= crypto.randomUUID();
      const response = await fetch('/api/admin/pricing/discounts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...campaignDraft, value,
          requestId: campaignRequestId.current,
          startsAt: campaignDraft.startsAt ? new Date(campaignDraft.startsAt).toISOString() : null,
          expiresAt: campaignDraft.expiresAt ? new Date(campaignDraft.expiresAt).toISOString() : null,
          maxRedemptions: campaignDraft.maxRedemptions || null,
        }),
      });
      await readResponse(response);
      toast.success('Stripe discount campaign created.');
      campaignRequestId.current = null;
      setCampaignDraft((current) => ({ ...current, name: '', value: '', code: '' }));
      await load();
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : 'Could not create the campaign.');
    } finally {
      setSavingCampaign(false);
    }
  }

  async function toggleCampaign(campaign: Campaign) {
    try {
      await readResponse(await fetch(`/api/admin/pricing/discounts/${campaign.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !campaign.active }),
      }));
      toast.success(`Campaign ${campaign.active ? 'deactivated' : 'activated'}.`);
      await load();
    } catch (toggleError) {
      toast.error(toggleError instanceof Error ? toggleError.message : 'Could not update campaign status.');
    }
  }

  if (loading && !data) return <div className={`${cardClass} p-5 text-xs text-[#8f8f98]`}>Loading live Stripe and plan data…</div>;
  if (error && !data) return <div role="alert" className={`${cardClass} p-5 text-xs text-rose-200`}>{error} <button type="button" onClick={() => void load()} className="ml-2 underline">Retry</button></div>;

  return (
    <div className="space-y-4">
      <section className="flex items-start gap-2 rounded-md border border-sky-400/20 bg-sky-400/[0.05] px-3 py-2.5 text-[11px] leading-5 text-sky-200">
        <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <p>Each new price is created in Stripe and becomes active for future checkouts after MongoDB commits. Currency is shared by monthly and yearly prices; changing it creates new Stripe Prices for both intervals. Existing subscriptions and invoices keep their current price. Stripe validates currencies for this account when the price is created.</p>
      </section>

      {roleOptions.map((role) => (
        <section key={role} className={`${cardClass} overflow-hidden`}>
          <header className="border-b border-white/[0.07] p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-[#e3e3e9]">{role === 'seeker' ? 'Seeker' : 'Recruiter'} subscription pricing</h3>
            <p className="mt-1 text-[10px] text-[#777780]">Prices are loaded from the backend plans collection. Previous Stripe prices remain intact.</p>
          </header>
          <div className="grid gap-3 p-4 lg:grid-cols-3 sm:p-5">
            {(data?.plans ?? []).filter((plan) => plan.role === role).map((plan) => (
              <article key={`${role}:${plan.planName}`} className="rounded-md border border-white/[0.07] bg-[#0d0d10] p-3.5">
                <div className="mb-3 flex items-center justify-between"><span className="text-xs font-medium text-[#e1e1e7]">{plan.planName}</span><span className="text-[9px] text-[#777780]">{plan.stripeProductId ? 'Stripe product linked' : 'Product on first publish'}</span></div>
                {intervalOptions.map((interval) => {
                  const key = `${role}:${plan.planName}:${interval}`;
                  const draft = priceDrafts[key] ?? { amount: '', currency: plan.currency };
                  const oldAmount = interval === 'month' ? plan.price : plan.yearlyPrice;
                  const newAmount = Number(draft.amount);
                  const change = oldAmount > 0 ? ((newAmount - oldAmount) / oldAmount) * 100 : null;
                  return <div key={interval} className="mb-3 last:mb-0">
                    <label className="mb-1 block text-[10px] text-[#9c9ca5]">{interval === 'month' ? 'Monthly' : 'Yearly'} · current {formatPrice(oldAmount, plan.currency)}</label>
                    <div className="grid grid-cols-[1fr_95px] gap-2">
                      <input aria-label={`${role} ${plan.planName} ${interval} price`} type="number" min="0" step="0.01" value={draft.amount} onChange={(event) => setPriceDrafts((current) => ({ ...current, [key]: { ...draft, amount: event.target.value } }))} className={inputClass} />
                      <select aria-label={`${role} ${plan.planName} ${interval} currency`} value={draft.currency} onChange={(event) => setPriceDrafts((current) => ({ ...current, [key]: { ...draft, currency: event.target.value } }))} className={inputClass}>
                        {(data?.currencies ?? []).map((currency) => <option key={currency} value={currency}>{currency.toUpperCase()}</option>)}
                      </select>
                    </div>
                    {Number.isFinite(newAmount) && draft.amount !== '' && <p className="mt-1 text-[9px] text-[#777780]">Preview {formatPrice(newAmount, draft.currency)} / {interval}{change === null ? '' : ` · ${change > 0 ? '+' : ''}${change.toFixed(2)}%`}</p>}
                    <p className="mt-1 truncate font-mono text-[9px] text-[#66666e]" title={plan.stripePrices?.[interval] || 'No Stripe Price created yet'}>Active Price ID: {plan.stripePrices?.[interval] || 'Not created yet'}</p>
                    <button type="button" onClick={() => confirmPrice(plan, interval)} disabled={savingPrice === key || !draft.amount} className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md border border-white/[0.09] px-2.5 text-[10px] text-[#c3c3ca] hover:bg-white/[0.05] disabled:opacity-40">{savingPrice === key ? <LoaderCircle className="size-3 animate-spin" /> : <Check className="size-3" />} Publish new Stripe price</button>
                  </div>;
                })}
              </article>
            ))}
          </div>
        </section>
      ))}

      <section className={`${cardClass} p-4 sm:p-5`}>
        <div className="mb-4 flex items-center gap-2"><Tag aria-hidden="true" className="size-4 text-[#b49aff]" /><div><h3 className="text-sm font-semibold text-[#e3e3e9]">Discount and promo code management</h3><p className="mt-1 text-[10px] text-[#777780]">Stripe Coupons and Promotion Codes are created on the backend. Leave the code blank to create an automatic campaign.</p></div></div>
        <form onSubmit={(event) => void createCampaign(event)} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-[10px] text-[#9c9ca5]">Discount name<input required maxLength={100} value={campaignDraft.name} onChange={(e) => setCampaignDraft({ ...campaignDraft, name: e.target.value })} className={`${inputClass} mt-1`} /></label>
          <label className="text-[10px] text-[#9c9ca5]">Discount type<select value={campaignDraft.type} onChange={(e) => setCampaignDraft({ ...campaignDraft, type: e.target.value as 'percent' | 'fixed' })} className={`${inputClass} mt-1`}><option value="percent">Percentage</option><option value="fixed">Fixed amount</option></select></label>
          <label className="text-[10px] text-[#9c9ca5]">Discount value<input required type="number" min="0.01" max={campaignDraft.type === 'percent' ? 100 : undefined} step="0.01" value={campaignDraft.value} onChange={(e) => setCampaignDraft({ ...campaignDraft, value: e.target.value })} className={`${inputClass} mt-1`} /></label>
          <label className="text-[10px] text-[#9c9ca5]">Currency (for fixed amount)<select value={campaignDraft.currency} onChange={(e) => setCampaignDraft({ ...campaignDraft, currency: e.target.value })} className={`${inputClass} mt-1`}>{(data?.currencies ?? []).map((currency) => <option key={currency} value={currency}>{currency.toUpperCase()}</option>)}</select></label>
          <label className="text-[10px] text-[#9c9ca5]">Promo code (optional)<input maxLength={32} pattern="[A-Za-z0-9_-]{3,32}" placeholder="WELCOME20" value={campaignDraft.code} onChange={(e) => setCampaignDraft({ ...campaignDraft, code: e.target.value.toUpperCase() })} className={`${inputClass} mt-1`} /></label>
          <label className="text-[10px] text-[#9c9ca5]">Duration<select value={campaignDraft.duration} onChange={(e) => setCampaignDraft({ ...campaignDraft, duration: e.target.value as typeof campaignDraft.duration })} className={`${inputClass} mt-1`}><option value="once">Once</option><option value="repeating">Repeating</option><option value="forever">Forever</option></select></label>
          {campaignDraft.duration === 'repeating' && <label className="text-[10px] text-[#9c9ca5]">Duration months<input required type="number" min="1" max="36" value={campaignDraft.durationMonths} onChange={(e) => setCampaignDraft({ ...campaignDraft, durationMonths: e.target.value })} className={`${inputClass} mt-1`} /></label>}
          <label className="text-[10px] text-[#9c9ca5]">Start date (optional)<input type="datetime-local" value={campaignDraft.startsAt} onChange={(e) => setCampaignDraft({ ...campaignDraft, startsAt: e.target.value })} className={`${inputClass} mt-1`} /></label>
          <label className="text-[10px] text-[#9c9ca5]">Expiry date (optional)<input type="datetime-local" value={campaignDraft.expiresAt} onChange={(e) => setCampaignDraft({ ...campaignDraft, expiresAt: e.target.value })} className={`${inputClass} mt-1`} /></label>
          <label className="text-[10px] text-[#9c9ca5]">Maximum redemptions<input type="number" min="1" max="1000000" placeholder="Unlimited" value={campaignDraft.maxRedemptions} onChange={(e) => setCampaignDraft({ ...campaignDraft, maxRedemptions: e.target.value })} className={`${inputClass} mt-1`} /></label>
          <fieldset className="text-[10px] text-[#9c9ca5]"><legend>Applicable roles</legend><div className="mt-2 flex gap-3">{roleOptions.map((role) => <label key={role} className="inline-flex items-center gap-1.5"><input type="checkbox" checked={campaignDraft.roles.includes(role)} onChange={(e) => setCampaignDraft({ ...campaignDraft, roles: e.target.checked ? [...campaignDraft.roles, role] : campaignDraft.roles.filter((item) => item !== role) })} />{role}</label>)}</div></fieldset>
          <fieldset className="text-[10px] text-[#9c9ca5]"><legend>Applicable plans</legend><div className="mt-2 flex flex-wrap gap-3">{planOptions.map((plan) => <label key={plan} className="inline-flex items-center gap-1.5"><input type="checkbox" checked={campaignDraft.plans.includes(plan)} onChange={(e) => setCampaignDraft({ ...campaignDraft, plans: e.target.checked ? [...campaignDraft.plans, plan] : campaignDraft.plans.filter((item) => item !== plan) })} />{plan}</label>)}</div></fieldset>
          <fieldset className="text-[10px] text-[#9c9ca5]"><legend>Billing intervals</legend><div className="mt-2 flex gap-3">{intervalOptions.map((interval) => <label key={interval} className="inline-flex items-center gap-1.5"><input type="checkbox" checked={campaignDraft.intervals.includes(interval)} onChange={(e) => setCampaignDraft({ ...campaignDraft, intervals: e.target.checked ? [...campaignDraft.intervals, interval] : campaignDraft.intervals.filter((item) => item !== interval) })} />{interval}</label>)}</div></fieldset>
          <div className="sm:col-span-2 xl:col-span-4"><button type="submit" disabled={savingCampaign} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#6d4df5] px-3 text-xs font-medium text-white transition hover:bg-[#7d60f7] disabled:opacity-50">{savingCampaign ? <LoaderCircle className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}Create Stripe campaign</button></div>
        </form>
      </section>

      <section className={`${cardClass} overflow-hidden`}>
        <header className="flex items-center gap-2 border-b border-white/[0.07] p-4 sm:p-5"><Tag aria-hidden="true" className="size-4 text-[#b49aff]" /><div><h3 className="text-sm font-semibold text-[#e3e3e9]">Promo codes and campaigns</h3><p className="mt-1 text-[10px] text-[#777780]">Redemptions and validity are verified against Stripe during checkout.</p></div></header>
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] border-collapse text-left"><thead><tr className="border-b border-white/[0.07] text-[9px] uppercase tracking-[0.08em] text-[#777780]"><th className="px-4 py-3">Campaign</th><th className="px-3 py-3">Discount</th><th className="px-3 py-3">Applies to</th><th className="px-3 py-3">Duration</th><th className="px-3 py-3">Redemptions</th><th className="px-3 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody>{campaigns.map((campaign) => <tr key={campaign.id} className="border-b border-white/[0.05] text-[10px] last:border-0"><td className="px-4 py-3"><span className="block font-medium text-[#dedee5]">{campaign.name}</span><span className="text-[#777780]">{campaign.code || 'Automatic'}</span></td><td className="px-3 py-3 text-[#dedee5]">{campaign.type === 'percent' ? `${campaign.value}%` : formatPrice(campaign.value, campaign.currency || 'usd')}</td><td className="px-3 py-3 text-[#aaaab3]">{campaign.roles.join(', ')} · {campaign.plans.join(', ')} · {campaign.intervals.join(', ')}</td><td className="px-3 py-3 text-[#aaaab3]">{campaign.duration}{campaign.durationMonths ? ` · ${campaign.durationMonths} months` : ''}</td><td className="px-3 py-3 text-[#aaaab3]">{campaign.timesRedeemed}{campaign.maxRedemptions ? ` / ${campaign.maxRedemptions}` : ''}</td><td className="px-3 py-3"><span className={campaign.active ? 'text-emerald-300' : 'text-[#777780]'}>{campaign.active ? 'Active' : 'Inactive'}</span></td><td className="px-4 py-3 text-right"><button type="button" onClick={() => void toggleCampaign(campaign)} className="rounded border border-white/[0.09] px-2.5 py-1.5 text-[#c3c3ca] hover:bg-white/[0.05]">{campaign.active ? 'Deactivate' : 'Activate'}</button></td></tr>)}</tbody></table>{campaigns.length === 0 && <p className="p-5 text-center text-xs text-[#777780]">No discount campaigns yet.</p>}</div>
      </section>

      <section className={`${cardClass} overflow-hidden`}>
        <header className="flex items-center gap-2 border-b border-white/[0.07] p-4 sm:p-5"><History aria-hidden="true" className="size-4 text-[#b49aff]" /><div><h3 className="text-sm font-semibold text-[#e3e3e9]">Previous price history</h3><p className="mt-1 text-[10px] text-[#777780]">Older Stripe price IDs remain available for invoice and payment history.</p></div></header>
        <div className="overflow-x-auto"><table className="w-full min-w-[650px] border-collapse text-left"><thead><tr className="border-b border-white/[0.07] text-[9px] uppercase tracking-[0.08em] text-[#777780]"><th className="px-4 py-3">Replaced</th><th className="px-3 py-3">Role / Plan</th><th className="px-3 py-3">Interval</th><th className="px-3 py-3">Previous price</th><th className="px-4 py-3">Stripe Price ID</th></tr></thead><tbody>{history.map((item, index) => <tr key={`${item.role}:${item.plan}:${item.interval}:${item.replacedAt}:${index}`} className="border-b border-white/[0.05] text-[10px] last:border-0"><td className="px-4 py-3 text-[#aaaab3]">{new Date(item.replacedAt).toLocaleString()}</td><td className="px-3 py-3 text-[#dedee5]">{item.role} · {item.plan}</td><td className="px-3 py-3 text-[#aaaab3]">{item.interval}</td><td className="px-3 py-3 text-[#dedee5]">{formatPrice(item.amount, item.currency)}</td><td className="px-4 py-3 font-mono text-[9px] text-[#aaaab3]">{item.stripePriceId || 'Legacy inline price'}</td></tr>)}</tbody></table>{history.length === 0 && <p className="p-5 text-center text-xs text-[#777780]">Price updates will appear here.</p>}</div>
      </section>

      <section className={`${cardClass} overflow-hidden`}>
        <header className="flex items-center gap-2 border-b border-white/[0.07] p-4 sm:p-5"><History aria-hidden="true" className="size-4 text-[#b49aff]" /><div><h3 className="text-sm font-semibold text-[#e3e3e9]">Pricing and discount audit history</h3><p className="mt-1 text-[10px] text-[#777780]">Immutable admin records for price changes, campaign creation, and status updates.</p></div></header>
        <div className="overflow-x-auto"><table className="w-full min-w-[740px] border-collapse text-left"><thead><tr className="border-b border-white/[0.07] text-[9px] uppercase tracking-[0.08em] text-[#777780]"><th className="px-4 py-3">When</th><th className="px-3 py-3">Admin</th><th className="px-3 py-3">Action</th><th className="px-3 py-3">Previous</th><th className="px-4 py-3">New value</th></tr></thead><tbody>{(auditHistory?.logs ?? []).map((item) => <tr key={item.id} className="border-b border-white/[0.05] text-[10px] last:border-0"><td className="whitespace-nowrap px-4 py-3 text-[#aaaab3]">{item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}</td><td className="px-3 py-3 text-[#aaaab3]">{item.actorName || item.actorEmail || item.actorId || 'Admin'}</td><td className="px-3 py-3 text-[#dedee5]">{item.action.replace('subscription_', '').replaceAll('.', ' ')}</td><td className="max-w-[240px] px-3 py-3 text-[#aaaab3]">{typeof item.previousValue === 'string' ? item.previousValue : item.previousValue ?? '—'}</td><td className="max-w-[280px] px-4 py-3 text-[#dedee5]">{typeof item.newValue === 'string' ? item.newValue : item.newValue ?? '—'}</td></tr>)}</tbody></table>{!auditHistory?.logs.length && <p className="p-5 text-center text-xs text-[#777780]">Pricing or discount changes will appear here.</p>}</div>
      </section>

      {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
      {preview && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4"><section role="dialog" aria-modal="true" className={`${cardClass} w-full max-w-md p-5 shadow-2xl`}><h3 className="text-sm font-semibold text-[#e3e3e9]">Review new Stripe price</h3><dl className="mt-4 space-y-2 text-xs"><div className="flex justify-between"><dt className="text-[#85858e]">Current</dt><dd className="text-[#dedee5]">{formatPrice(preview.interval === 'month' ? preview.plan.price : preview.plan.yearlyPrice, preview.plan.currency)} / {preview.interval}</dd></div><div className="flex justify-between"><dt className="text-[#85858e]">New price</dt><dd className="text-[#dedee5]">{formatPrice(preview.amount, preview.currency)} / {preview.interval}</dd></div>{preview.currency.toLowerCase() === preview.plan.currency.toLowerCase() ? <><div className="flex justify-between"><dt className="text-[#85858e]">Difference</dt><dd className="text-[#dedee5]">{formatPrice(preview.amount - (preview.interval === 'month' ? preview.plan.price : preview.plan.yearlyPrice), preview.currency)} / {preview.interval}</dd></div><div className="flex justify-between"><dt className="text-[#85858e]">Percentage change</dt><dd className="text-[#dedee5]">{(preview.interval === 'month' ? preview.plan.price : preview.plan.yearlyPrice) === 0 ? '—' : `${(((preview.amount - (preview.interval === 'month' ? preview.plan.price : preview.plan.yearlyPrice)) / (preview.interval === 'month' ? preview.plan.price : preview.plan.yearlyPrice)) * 100).toFixed(2)}%`}</dd></div></> : <div className="flex justify-between"><dt className="text-[#85858e]">Currency change</dt><dd className="text-[#dedee5]">{preview.plan.currency.toUpperCase()} → {preview.currency.toUpperCase()}</dd></div>}{(() => { const discount = applicableAutomaticDiscount(preview.plan, preview.interval, preview.amount, preview.currency); return discount ? <><div className="flex justify-between"><dt className="text-[#85858e]">Discount applied</dt><dd className="text-emerald-300">{discount.label}</dd></div><div className="flex justify-between font-medium"><dt className="text-[#85858e]">Final price</dt><dd className="text-[#dedee5]">{formatPrice(Math.max(0, preview.amount - discount.value), preview.currency)} / {preview.interval}</dd></div></> : null; })()}</dl><p className="mt-3 rounded border border-amber-400/20 bg-amber-400/[0.05] p-2.5 text-[10px] leading-4 text-amber-200">Future checkouts will use this new price. Existing subscribers will remain on their current Stripe price.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setPreview(null)} className="h-9 rounded-md border border-white/[0.09] px-3 text-xs text-[#c3c3ca]">Cancel</button><button type="button" onClick={() => void savePrice()} disabled={Boolean(savingPrice)} className="h-9 rounded-md bg-[#6d4df5] px-3 text-xs text-white disabled:opacity-50">{savingPrice ? 'Publishing…' : 'Confirm & publish'}</button></div></section></div>}
    </div>
  );
}
