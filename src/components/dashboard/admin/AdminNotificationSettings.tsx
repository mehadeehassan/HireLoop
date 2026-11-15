'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { adminNotificationTypes, isAdminNotificationPreferences, type AdminNotificationType, type AdminNotificationPreferences } from '@/lib/admin-notifications-contract';

const card = 'rounded-lg border border-white/[0.07] bg-[#111114] p-4 sm:p-5';

function Switch({ checked, disabled, label, onClick }: { checked: boolean; disabled?: boolean; label: string; onClick: () => void }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={onClick} className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition ${checked ? 'border-emerald-400/30 bg-emerald-400/25' : 'border-white/[0.12] bg-white/[0.06]'} disabled:cursor-not-allowed disabled:opacity-40`}><span className={`inline-block size-4 rounded-full bg-white shadow transition ${checked ? 'translate-x-6' : 'translate-x-1'}`} /></button>;
}

async function readPayload(response: Response) {
  const value: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = value && typeof value === 'object' && 'error' in value && typeof value.error === 'string' ? value.error : 'Could not save notification settings.';
    throw new Error(message);
  }
  return value;
}

export default function AdminNotificationSettings({ globalSettings, onSaved }: { globalSettings: Record<string, boolean>; onSaved: () => void }) {
  const [preferences, setPreferences] = useState<AdminNotificationPreferences | null>(null);
  const [globals, setGlobals] = useState(globalSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/notifications/preferences', { cache: 'no-store' })
      .then(readPayload)
      .then((payload) => {
        if (!isAdminNotificationPreferences(payload)) throw new Error('Notification preferences response was invalid.');
        if (active) setPreferences(payload);
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load notification preferences.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function togglePersonal(type: AdminNotificationType) {
    if (!preferences || saving) return;
    const current = preferences.types[type].adminEnabled;
    const next = !current;
    setSaving(`personal:${type}`);
    setPreferences((value) => value ? { ...value, types: { ...value.types, [type]: { ...value.types[type], adminEnabled: next } } } : value);
    try {
      const payload = await readPayload(await fetch('/api/admin/notifications/preferences', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ types: { [type]: { inApp: next } } }),
      }));
      if (!isAdminNotificationPreferences(payload)) throw new Error('Notification preferences response was invalid.');
      setPreferences(payload);
      toast.success(`${adminNotificationTypes[type][0]} ${next ? 'enabled' : 'muted'} for your account.`);
    } catch (reason) {
      setPreferences((value) => value ? { ...value, types: { ...value.types, [type]: { ...value.types[type], adminEnabled: current } } } : value);
      toast.error(reason instanceof Error ? reason.message : 'Could not save your preference.');
    } finally { setSaving(null); }
  }

  async function toggleGlobal(type: AdminNotificationType) {
    if (saving) return;
    const current = globals[type] !== false;
    const next = !current;
    setSaving(`global:${type}`);
    setGlobals((value) => ({ ...value, [type]: next }));
    try {
      const payload = await readPayload(await fetch('/api/admin/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ controls: { notifications: { [type]: next } } }),
      }));
      if (!payload || typeof payload !== 'object') throw new Error('The settings update response was invalid.');
      toast.success(`${adminNotificationTypes[type][0]} ${next ? 'enabled platform-wide' : 'disabled platform-wide'}.`);
      onSaved();
    } catch (reason) {
      setGlobals((value) => ({ ...value, [type]: current }));
      toast.error(reason instanceof Error ? reason.message : 'Could not save the global notification setting.');
    } finally { setSaving(null); }
  }

  return <div className="space-y-4">
    <div role="note" className="rounded-md border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2.5 text-[11px] leading-5 text-amber-200">Only in-app admin alerts are delivered. Email and push are not configured.</div>
    {error && <div role="alert" className="flex items-center justify-between rounded-md border border-rose-400/20 bg-rose-400/[0.06] px-3 py-2 text-xs text-rose-200">{error}<button type="button" onClick={() => { setError(null); setLoading(true); fetch('/api/admin/notifications/preferences', { cache: 'no-store' }).then(readPayload).then((payload) => { if (!isAdminNotificationPreferences(payload)) throw new Error('Preferences response was invalid.'); setPreferences(payload); }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Could not load preferences.')).finally(() => setLoading(false)); }} className="underline">Retry</button></div>}
    <section className={card} aria-busy={loading}>
      <h2 className="text-sm font-semibold text-[#e3e3e9]">My notification preferences</h2>
      <p className="mt-1 text-[10px] text-[#777780]">Choose which in-app alerts this admin account receives.</p>
      <div className="mt-4 divide-y divide-white/[0.06]">
        {(Object.keys(adminNotificationTypes) as AdminNotificationType[]).map((type) => {
          const item = preferences?.types[type];
          const globallyEnabled = globals[type] !== false;
          return <div key={type} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
            <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-xs font-medium text-[#dcdce3]">{item?.label || adminNotificationTypes[type][0]}</h3><span className="rounded border border-emerald-400/20 px-1.5 py-0.5 text-[9px] text-emerald-200">In-app active</span></div><p className="mt-1 max-w-xl text-[10px] leading-5 text-[#777780]">{item?.description || adminNotificationTypes[type][1]}</p>{!globallyEnabled && <p className="text-[9px] text-amber-300">Disabled platform-wide</p>}</div>
            <Switch checked={item?.adminEnabled ?? true} disabled={loading || !preferences || saving !== null || !globallyEnabled} label={`${item?.label || type} in-app preference`} onClick={() => void togglePersonal(type)} />
          </div>;
        })}
      </div>
    </section>
    <section className={card}>
      <h2 className="text-sm font-semibold text-[#e3e3e9]">Global platform notifications</h2>
      <p className="mt-1 text-[10px] text-[#777780]">Platform-wide event controls. Every change is recorded in the Activity Log.</p>
      <div className="mt-4 divide-y divide-white/[0.06]">
        {(Object.keys(adminNotificationTypes) as AdminNotificationType[]).map((type) => <div key={type} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-xs font-medium text-[#dcdce3]">{adminNotificationTypes[type][0]}</h3><p className="mt-1 text-[10px] text-[#777780]">{adminNotificationTypes[type][1]}</p></div><Switch checked={globals[type] !== false} disabled={saving !== null} label={`${adminNotificationTypes[type][0]} global setting`} onClick={() => void toggleGlobal(type)} /></div>)}
      </div>
    </section>
  </div>;
}
