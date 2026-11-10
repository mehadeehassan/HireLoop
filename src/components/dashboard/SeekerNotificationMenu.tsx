'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SeekerApplication } from './seeker/seeker-data';

const readStateKey = 'hireloop:seeker-notification-read';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getTimestamp(application: SeekerApplication) {
  const timestamp = new Date(application.updatedAt || application.createdAt || 0).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function timeAgo(value: string) {
  const timestamp = new Date(value).getTime();
  if (!value || Number.isNaN(timestamp)) return 'Recently';
  const hours = Math.max(0, Math.floor((Date.now() - timestamp) / 3_600_000));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : new Date(timestamp).toLocaleDateString();
}

function getReadState() {
  const raw = localStorage.getItem(readStateKey);
  const parsed: unknown = raw ? JSON.parse(raw) : {};
  if (!isRecord(parsed)) throw new Error('Notification read state is invalid.');
  return Object.fromEntries(
    Object.entries(parsed).filter(
      ([id, timestamp]) => id.length > 0 && typeof timestamp === 'number',
    ),
  ) as Record<string, number>;
}

export default function SeekerNotificationMenu() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SeekerApplication[]>([]);
  const [readAt, setReadAt] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/seeker/applications', { cache: 'no-store' });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          isRecord(payload) && typeof payload.error === 'string'
            ? payload.error
            : 'Could not load notifications.',
        );
      }
      const applications =
        isRecord(payload) && Array.isArray(payload.applications)
          ? payload.applications.filter(
              (application): application is SeekerApplication =>
                isRecord(application) &&
                typeof application.id === 'string' &&
                typeof application.jobTitle === 'string' &&
                typeof application.company === 'string' &&
                typeof application.status === 'string',
            )
          : null;
      if (!applications) throw new Error('The notification service returned an unexpected response.');

      setItems(
        applications
          .filter((application) => Boolean(application.updatedAt || application.createdAt))
          .sort((first, second) => getTimestamp(second) - getTimestamp(first))
          .slice(0, 20),
      );
      setReadAt(getReadState());
    } catch (loadError) {
      console.error('Could not load seeker notifications', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  const unreadCount = useMemo(
    () => items.filter((item) => getTimestamp(item) > (readAt[item.id] || 0)).length,
    [items, readAt],
  );

  function markAllRead() {
    try {
      const nextState = { ...readAt };
      for (const item of items) nextState[item.id] = getTimestamp(item);
      localStorage.setItem(readStateKey, JSON.stringify(nextState));
      setReadAt(nextState);
    } catch (storageError) {
      console.error('Could not save notification read state', storageError);
      setError('Notifications loaded, but read status could not be saved on this device.');
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          if (open) {
            setOpen(false);
          } else {
            setOpen(true);
            void loadNotifications();
          }
        }}
        className="relative transition hover:text-[#e8ebf3]"
      >
        <svg viewBox="0 0 24 24" className="size-4.75" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
        {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex min-h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#ec4e67] px-1 text-[8px] font-semibold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>
      {open && (
        <section
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#29292f] bg-[#141417] text-[#ededf3] shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-[#29292f] px-4 py-3">
            <div>
              <h2 className="text-xs font-semibold">Notifications</h2>
              <p className="mt-1 text-[9px] text-[#85858e]">Updates from your applications</p>
            </div>
            <button type="button" onClick={markAllRead} disabled={!unreadCount} className="text-[9px] text-[#aaa2ff] hover:text-white disabled:opacity-40">
              Mark all read
            </button>
          </div>
          {error && <p role="alert" className="m-3 rounded-md bg-red-500/5 p-2.5 text-[10px] leading-5 text-red-300">{error}</p>}
          {loading ? (
            <div className="space-y-2 p-4">{[0, 1, 2].map((row) => <div key={row} className="h-12 animate-pulse rounded bg-white/5" />)}</div>
          ) : items.length ? (
            <ul className="max-h-80 divide-y divide-[#242428] overflow-y-auto">
              {items.map((item) => {
                const timestamp = getTimestamp(item);
                const unread = timestamp > (readAt[item.id] || 0);
                return (
                  <li key={item.id}>
                    <Link href="/dashboard/seeker/applied" onClick={() => { markAllRead(); setOpen(false); }} className="flex gap-3 px-4 py-3 hover:bg-white/[0.035]">
                      <span className={`mt-1 size-2 shrink-0 rounded-full ${unread ? 'bg-[#8178ff]' : 'bg-[#424249]'}`} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10px] leading-5 text-[#e2e2e8]">
                          <span className="font-medium">{item.jobTitle}</span> at {item.company} is <span className="text-[#aaa2ff]">{item.status}</span>.
                        </span>
                        <span className="mt-1 block text-[9px] text-[#85858e]">{timeAgo(item.updatedAt || item.createdAt || '')}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-10 text-center text-[10px] text-[#85858e]">No application updates yet.</p>
          )}
          <Link href="/dashboard/seeker/applied" onClick={() => setOpen(false)} className="block border-t border-[#29292f] px-4 py-3 text-center text-[10px] text-[#aaa2ff] hover:text-white">
            View applications
          </Link>
        </section>
      )}
    </div>
  );
}
