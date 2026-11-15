'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Bell, CircleAlert, Info, RefreshCw, CheckCheck } from 'lucide-react';
import { isAdminNotificationList, type AdminNotification, type AdminNotificationList } from '@/lib/admin-notifications-contract';

async function readJson(response: Response) {
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string' ? payload.error : 'Could not load admin notifications.';
    throw new Error(message);
  }
  return payload;
}

function relativeTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Recently';
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function SeverityIcon({ severity }: { severity: AdminNotification['severity'] }) {
  if (severity === 'critical') return <CircleAlert aria-hidden="true" className="size-4 text-rose-300" />;
  if (severity === 'warning') return <AlertTriangle aria-hidden="true" className="size-4 text-amber-300" />;
  return <Info aria-hidden="true" className="size-4 text-violet-300" />;
}

export default function AdminNotificationMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [list, setList] = useState<AdminNotificationList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const refreshCount = useCallback(async () => {
    const payload = await readJson(await fetch('/api/admin/notifications/unread-count', { cache: 'no-store' }));
    if (!payload || typeof payload !== 'object' || !Number.isSafeInteger((payload as { unreadCount?: unknown }).unreadCount)) throw new Error('Unread count response was invalid.');
    setUnreadCount(Number((payload as { unreadCount: number }).unreadCount));
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await readJson(await fetch('/api/admin/notifications?limit=20', { cache: 'no-store' }));
      if (!isAdminNotificationList(payload)) throw new Error('Notification response was invalid.');
      setList(payload);
      setUnreadCount(payload.unreadCount);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load notifications.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    const update = () => {
      if (document.visibilityState !== 'visible') return;
      void refreshCount().catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Could not refresh notifications.'); });
      if (open) void loadList();
    };
    const initialTimer = window.setTimeout(() => {
      void refreshCount().catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load notifications.'); });
    }, 0);
    const timer = window.setInterval(update, 30_000);
    const onVisibility = () => { if (document.visibilityState === 'visible') update(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', update);
    return () => { active = false; window.clearTimeout(initialTimer); window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('focus', update); };
  }, [refreshCount, loadList, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); buttonRef.current?.focus(); }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const items = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
        if (!items.length) return;
        event.preventDefault();
        const current = items.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === 'ArrowDown'
          ? (current + 1) % items.length
          : (current <= 0 ? items.length - 1 : current - 1);
        items[next].focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  async function markAllRead() {
    try {
      await readJson(await fetch('/api/admin/notifications/read-all', { method: 'POST' }));
      setUnreadCount(0);
      setList((value) => value ? { ...value, unreadCount: 0, notifications: value.notifications.map((item) => ({ ...item, read: true })) } : value);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not mark notifications read.'); }
  }

  async function openNotification(item: AdminNotification) {
    if (!item.read) {
      try {
        await readJson(await fetch(`/api/admin/notifications/${encodeURIComponent(item.id)}/read`, { method: 'PATCH' }));
        setUnreadCount((count) => Math.max(0, count - 1));
        setList((value) => value ? { ...value, notifications: value.notifications.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry) } : value);
      } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not mark notification read.'); return; }
    }
    if (item.link.startsWith('/dashboard/admin')) router.push(item.link);
    setOpen(false);
  }

  return <div className="relative">
    <button ref={buttonRef} type="button" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} aria-haspopup="menu" aria-expanded={open} onClick={() => { const next = !open; setOpen(next); if (next) void loadList(); }} className="relative flex size-9 items-center justify-center rounded-md text-[#a6a6ae] transition hover:bg-white/[0.06] hover:text-white">
      <Bell aria-hidden="true" className="size-4" />
      {unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full border border-[#0d0d10] bg-rose-500 px-1 text-center text-[9px] font-semibold leading-[14px] text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
    </button>
    {open && <section role="menu" aria-label="Admin notifications" className="absolute right-0 top-11 z-50 w-[min(92vw,390px)] overflow-hidden rounded-lg border border-white/[0.09] bg-[#141418] shadow-2xl">
      <header className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3"><div><h2 className="text-xs font-semibold text-[#ededf2]">Notifications</h2><p className="mt-0.5 text-[10px] text-[#777780]">{unreadCount} unread</p></div><button type="button" disabled={!unreadCount} onClick={() => void markAllRead()} className="inline-flex items-center gap-1.5 text-[10px] text-[#bba8ff] hover:text-white disabled:opacity-40"><CheckCheck aria-hidden="true" className="size-3.5" />Mark all read</button></header>
      <div className="max-h-[min(65vh,460px)] overflow-y-auto" aria-live="polite">
        {loading && <div className="flex items-center justify-center gap-2 px-4 py-8 text-xs text-[#888890]"><RefreshCw aria-hidden="true" className="size-3.5 animate-spin" />Loading notifications…</div>}
        {!loading && error && <div role="alert" className="space-y-3 p-4 text-xs text-rose-200"><p>{error}</p><button type="button" onClick={() => void loadList()} className="rounded border border-rose-300/20 px-2.5 py-1.5 hover:bg-white/[0.05]">Retry</button></div>}
        {!loading && !error && list?.notifications.length === 0 && <p className="px-4 py-10 text-center text-xs text-[#85858d]">You’re all caught up.</p>}
        {!loading && !error && list?.notifications.map((item) => <button key={item.id} role="menuitem" type="button" onClick={() => void openNotification(item)} className="flex w-full gap-3 border-b border-white/[0.05] px-4 py-3 text-left transition last:border-0 hover:bg-white/[0.04]"><span className="mt-0.5 shrink-0"><SeverityIcon severity={item.severity} /></span><span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-2"><span className="text-[11px] font-medium text-[#e2e2e8]">{item.title}</span>{!item.read && <span aria-label="Unread" className="mt-1 size-1.5 shrink-0 rounded-full bg-violet-400" />}</span><span className="mt-1 block text-[10px] leading-4 text-[#94949d]">{item.message}</span><span className="mt-1.5 block text-[9px] text-[#696971]">{relativeTime(item.createdAt)}</span></span></button>)}
      </div>
    </section>}
  </div>;
}
