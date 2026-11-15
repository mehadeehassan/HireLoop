'use client';

import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CreditCard,
  FileText,
  History,
  ImageIcon,
  Info,
  LoaderCircle,
  Lock,
  Mail,
  RefreshCw,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  TriangleAlert,
  Upload,
  UserRound,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import type {
  AdminAuditLogsList,
  AdminPlatformBranding,
  AdminPlatformControls,
  AdminPlanLimit,
  AdminSettings,
} from '@/lib/admin-settings-contract';
import {
  isAdminAuditLogsList,
  isAdminSettings,
  isRecord,
} from '@/lib/admin-settings-contract';
import AdminProfilePanel from '@/components/dashboard/admin/AdminProfilePanel';
import AdminPricingManager from '@/components/dashboard/admin/AdminPricingManager';
import AdminNotificationSettings from '@/components/dashboard/admin/AdminNotificationSettings';

type SettingsTab =
  | 'profile'
  | 'general'
  | 'controls'
  | 'rules'
  | 'plans'
  | 'notifications'
  | 'audit';

type ControlKey = Exclude<keyof AdminPlatformControls, 'notifications'>;
type ConfirmState = {
  title: string;
  description: string;
  confirmLabel: string;
  tone: 'default' | 'danger';
  action: () => Promise<void> | void;
};

const tabs: Array<{
  id: SettingsTab;
  label: string;
  description: string;
  icon: typeof Settings2;
}> = [
  {
    id: 'profile',
    label: 'My Profile',
    description: 'Your admin identity, email, and password.',
    icon: UserRound,
  },
  {
    id: 'general',
    label: 'General & Branding',
    description: 'Platform identity and support details.',
    icon: Settings2,
  },
  {
    id: 'controls',
    label: 'Platform Controls',
    description: 'Registration and marketplace switches.',
    icon: SlidersHorizontal,
  },
  {
    id: 'rules',
    label: 'Job & Application Rules',
    description: 'Enforced upload and content limits.',
    icon: FileText,
  },
  {
    id: 'plans',
    label: 'Subscription & Plan Limits',
    description: 'Monthly quota configuration.',
    icon: CreditCard,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Delivery channels and preferences.',
    icon: Bell,
  },
  {
    id: 'audit',
    label: 'Activity Log',
    description: 'Immutable admin configuration history.',
    icon: History,
  },
];

const controlLabels: Record<
  ControlKey,
  { title: string; description: string; disabledEffect: string }
> = {
  seekerRegistration: {
    title: 'Seeker registration',
    description:
      'Allow new seeker accounts to be created through email or Google signup.',
    disabledEffect:
      'New account creation will be rejected at the Better Auth registration boundary. Existing accounts keep full access.',
  },
  jobPosting: {
    title: 'Job posting',
    description:
      'Allow recruiters to publish and edit job listings from the dashboard.',
    disabledEffect:
      'Recruiter job creation and updates will be rejected by the Express backend. Existing jobs stay visible.',
  },
  jobApplications: {
    title: 'Job applications',
    description:
      'Allow seekers to submit applications for published jobs.',
    disabledEffect:
      'New applications will be rejected by the Express backend. Existing applications and quotas are unchanged.',
  },
};

const inputClass =
  'h-10 w-full rounded-md border border-white/[0.09] bg-[#111114] px-3 text-xs text-[#e7e7ec] outline-none transition placeholder:text-[#73737c] focus:border-[#9b71ff]/70';
const labelClass = 'text-[11px] font-medium text-[#d3d3da]';
const helpClass = 'text-[10px] leading-4 text-[#777780]';
const cardClass = 'rounded-lg border border-white/[0.07] bg-[#111114]';
const pageSize = 10;

function getErrorMessage(value: unknown, fallback: string) {
  return isRecord(value) && typeof value.error === 'string' ? value.error : fallback;
}

async function getResponsePayload(response: Response) {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('The settings service returned an invalid response.');
  }
  if (!response.ok) throw new Error(getErrorMessage(payload, 'The settings request failed.'));
  return payload;
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

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function formatAuditValue(value: string | number | boolean | null) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Enabled' : 'Disabled';
  const text = String(value);
  return text || '—';
}

function validateBranding(branding: AdminPlatformBranding) {
  const errors: Record<string, string> = {};
  const name = branding.name.trim();
  if (name.length < 2 || name.length > 80) {
    errors.name = 'Platform name must be between 2 and 80 characters.';
  }
  if (branding.description.trim().length > 500) {
    errors.description = 'Description must be at most 500 characters.';
  }
  const email = branding.supportEmail.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    errors.supportEmail = 'Provide a valid support email address.';
  }
  const website = branding.websiteUrl.trim();
  if (website) {
    try {
      const parsed = new URL(website);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocol');
    } catch {
      errors.websiteUrl = 'Website URL must be a valid http or https URL.';
    }
  }
  return errors;
}

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
  footer,
}: {
  title: string;
  description: string;
  icon: typeof Settings2;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className={cardClass}>
      <header className="flex items-start gap-3 border-b border-white/[0.07] px-4 py-4 sm:px-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-violet-400/10 text-violet-300">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-[#e3e3e9]">{title}</h2>
          <p className="mt-1 text-[10px] leading-4 text-[#777780]">{description}</p>
        </div>
      </header>
      <div className="px-4 py-4 sm:px-5">{children}</div>
      {footer ? (
        <footer className="flex flex-wrap items-center gap-2 border-t border-white/[0.07] px-4 py-3 sm:px-5">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  help,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  help?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-[10px] text-rose-300" role="alert">
          {error}
        </p>
      ) : help ? (
        <p className={helpClass}>{help}</p>
      ) : null}
    </div>
  );
}

function Toggle({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition ${
        checked
          ? 'border-emerald-400/30 bg-emerald-400/25'
          : 'border-white/[0.12] bg-white/[0.06]'
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <span
        className={`inline-block size-4 rounded-full bg-white shadow transition ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  const tones = {
    neutral: 'border-white/[0.09] bg-white/[0.04] text-[#aaaab3]',
    success: 'border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300',
    warning: 'border-amber-400/20 bg-amber-400/[0.08] text-amber-300',
    danger: 'border-rose-400/20 bg-rose-400/[0.08] text-rose-300',
  } as const;
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
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

function ConfirmDialog({
  state,
  busy,
  onCancel,
  onConfirm,
}: {
  state: ConfirmState;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-3 backdrop-blur-[2px] sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-settings-confirm-title"
        className="w-full max-w-md rounded-xl border border-white/[0.1] bg-[#111114] p-5 shadow-2xl shadow-black/50"
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-md ${
              state.tone === 'danger'
                ? 'bg-rose-400/10 text-rose-300'
                : 'bg-violet-400/10 text-violet-300'
            }`}
          >
            <TriangleAlert aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0">
            <h2
              id="admin-settings-confirm-title"
              className="text-sm font-semibold text-[#ededf2]"
            >
              {state.title}
            </h2>
            <p className="mt-1.5 text-xs leading-5 text-[#8f8f98]">{state.description}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex h-9 items-center rounded-md border border-white/[0.09] px-3 text-xs text-[#c3c3ca] transition hover:bg-white/[0.05] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-medium text-white transition disabled:opacity-60 ${
              state.tone === 'danger'
                ? 'bg-rose-500 hover:bg-rose-400'
                : 'bg-[#6d4df5] hover:bg-[#7d60f7]'
            }`}
          >
            {busy ? (
              <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
            ) : null}
            {state.confirmLabel}
          </button>
        </div>
      </section>
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

function AuditPagination({
  page,
  totalPages,
  total,
  loading,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-white/[0.07] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="text-[10px] text-[#777780]">
        {total === 0
          ? 'No audit records'
          : `Showing ${(page - 1) * pageSize + 1}–${Math.min(
              page * pageSize,
              total,
            )} of ${total.toLocaleString()} records`}
        {loading && <span className="ml-2 text-[#a889ff]">Updating…</span>}
      </p>
      <div className="flex items-center gap-2">
        <span className="mr-2 text-[10px] text-[#777780]">
          Page {page} of {totalPages}
        </span>
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

export default function AdminSettingsManager() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [data, setData] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);

  const [branding, setBranding] = useState<AdminPlatformBranding | null>(null);
  const [brandingErrors, setBrandingErrors] = useState<Record<string, string>>({});
  const [savingBranding, setSavingBranding] = useState(false);
  const [savingControl, setSavingControl] = useState<ControlKey | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [limitDrafts, setLimitDrafts] = useState<Record<string, string>>({});
  const [savingLimit, setSavingLimit] = useState<string | null>(null);

  const [auditData, setAuditData] = useState<AdminAuditLogsList | null>(null);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditPage, setAuditPage] = useState(1);
  const [auditSection, setAuditSection] = useState('all');

  function applySettings(next: AdminSettings) {
    setData(next);
    setBranding(next.settings.branding);
    setBrandingErrors({});
    const drafts: Record<string, string> = {};
    for (const role of ['seeker', 'recruiter'] as const) {
      for (const limit of next.planLimits[role]) {
        drafts[`${role}:${limit.plan}`] =
          limit.limit === null ? '' : String(limit.limit);
      }
    }
    setLimitDrafts(drafts);
  }

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      fetch('/api/admin/settings', { signal: controller.signal, cache: 'no-store' })
        .then(getResponsePayload)
        .then((payload: unknown) => {
          if (!isAdminSettings(payload)) {
            throw new Error('The settings response was invalid.');
          }
          applySettings(payload);
        })
        .catch((requestError: unknown) => {
          if (
            requestError instanceof DOMException &&
            requestError.name === 'AbortError'
          ) {
            return;
          }
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Could not load platform settings.',
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
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
      setAuditLoading(true);
      setAuditError(null);
      const query = new URLSearchParams({
        page: String(auditPage),
        pageSize: String(pageSize),
        section: auditSection,
      });
      fetch(`/api/admin/settings/audit-logs?${query}`, {
        signal: controller.signal,
        cache: 'no-store',
      })
        .then(getResponsePayload)
        .then((payload: unknown) => {
          if (!isAdminAuditLogsList(payload)) {
            throw new Error('The audit log response was invalid.');
          }
          setAuditData(payload);
        })
        .catch((requestError: unknown) => {
          if (
            requestError instanceof DOMException &&
            requestError.name === 'AbortError'
          ) {
            return;
          }
          setAuditError(
            requestError instanceof Error
              ? requestError.message
              : 'Could not load audit records.',
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setAuditLoading(false);
        });
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [auditPage, auditSection, refreshVersion]);

  const brandingDirty = useMemo(() => {
    if (!data || !branding) return false;
    return (
      (Object.keys(branding) as Array<keyof AdminPlatformBranding>).some(
        (key) => branding[key] !== data.settings.branding[key],
      )
    );
  }, [branding, data]);

  function updateBranding(key: keyof AdminPlatformBranding, value: string | null) {
    setBranding((current) => (current ? { ...current, [key]: value } : current));
    setBrandingErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function resetBranding() {
    if (!data) return;
    setBranding(data.settings.branding);
    setBrandingErrors({});
  }

  function requestRefresh() {
    if (brandingDirty) {
      setConfirm({
        title: 'Discard unsaved branding changes?',
        description:
          'Refreshing reloads the persisted settings and discards your current form edits.',
        confirmLabel: 'Discard & refresh',
        tone: 'danger',
        action: () => setRefreshVersion((value) => value + 1),
      });
      return;
    }
    setRefreshVersion((value) => value + 1);
  }

  async function saveBranding() {
    if (!data || !branding) return;
    const errors = validateBranding(branding);
    setBrandingErrors(errors);
    if (Object.keys(errors).length) {
      toast.error('Fix the highlighted fields before saving.');
      return;
    }
    const patch: Record<string, string | null> = {};
    for (const key of Object.keys(branding) as Array<keyof AdminPlatformBranding>) {
      if (branding[key] !== data.settings.branding[key]) {
        patch[key] = branding[key];
      }
    }
    if (Object.keys(patch).length === 0) return;

    setSavingBranding(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branding: patch }),
      });
      const payload = await getResponsePayload(response);
      if (!isAdminSettings(payload)) {
        throw new Error('The settings update response was invalid.');
      }
      applySettings(payload);
      toast.success('Branding settings saved.');
      setRefreshVersion((value) => value + 1);
    } catch (requestError) {
      toast.error(
        requestError instanceof Error
          ? requestError.message
          : 'Could not save branding settings.',
      );
    } finally {
      setSavingBranding(false);
    }
  }

  function selectLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Logo must be a PNG, JPEG, or WebP image.');
      event.target.value = '';
      return;
    }
    if (file.size > 1024 * 1024) {
      toast.error('Logo image must be 1 MB or smaller.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateBranding('logo', reader.result);
      }
    };
    reader.onerror = () => toast.error('Could not read the selected logo image.');
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  function requestControlToggle(key: ControlKey) {
    if (!data || savingControl) return;
    const nextValue = !data.settings.controls[key];
    const label = controlLabels[key];
    setConfirm({
      title: `${nextValue ? 'Enable' : 'Disable'} ${label.title.toLowerCase()}?`,
      description: nextValue
        ? `${label.description} This change takes effect immediately.`
        : `${label.disabledEffect} This change takes effect immediately.`,
      confirmLabel: nextValue ? 'Enable setting' : 'Disable setting',
      tone: nextValue ? 'default' : 'danger',
      action: async () => {
        setSavingControl(key);
        try {
          const response = await fetch('/api/admin/settings', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ controls: { [key]: nextValue } }),
          });
          const payload = await getResponsePayload(response);
          if (!isAdminSettings(payload)) {
            throw new Error('The settings update response was invalid.');
          }
          applySettings(payload);
          toast.success(`${label.title} ${nextValue ? 'enabled' : 'disabled'}.`);
          setRefreshVersion((value) => value + 1);
        } catch (requestError) {
          toast.error(
            requestError instanceof Error
              ? requestError.message
              : 'Could not update the platform control.',
          );
        } finally {
          setSavingControl(null);
        }
      },
    });
  }

  function requestPlanLimitSave(limit: AdminPlanLimit) {
    if (limit.limit === null || !limit.editable) return;
    const key = `${limit.role}:${limit.plan}`;
    const raw = limitDrafts[key] ?? '';
    const value = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isInteger(value) || value <= 5 || value > 100000) {
      toast.error('Monthly limit must be a whole number between 6 and 100000.');
      return;
    }
    if (value === limit.limit) return;
    setConfirm({
      title: `Update ${limit.role} ${limit.plan} limit?`,
      description: `The monthly limit changes from ${limit.limit.toLocaleString()} to ${value.toLocaleString()}. Existing usage is preserved and new quota is enforced immediately.`,
      confirmLabel: 'Update limit',
      tone: 'default',
      action: async () => {
        setSavingLimit(key);
        try {
          const response = await fetch('/api/admin/settings/plan-limits', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              role: limit.role,
              plan: limit.plan,
              monthlyLimit: value,
            }),
          });
          await getResponsePayload(response);
          toast.success(`${limit.role} ${limit.plan} limit updated.`);
          setRefreshVersion((version) => version + 1);
        } catch (requestError) {
          toast.error(
            requestError instanceof Error
              ? requestError.message
              : 'Could not update the plan limit.',
          );
        } finally {
          setSavingLimit(null);
        }
      },
    });
  }

  async function runConfirmedAction() {
    if (!confirm) return;
    setConfirmBusy(true);
    try {
      await confirm.action();
      setConfirm(null);
    } finally {
      setConfirmBusy(false);
    }
  }

  const controls = data?.settings.controls ?? null;
  const planLimits = data?.planLimits ?? null;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[#a889ff]">
            Admin Console <span className="mx-1.5 text-[#55555d]">/</span> Configuration
          </p>
          <h1 className="text-[25px] font-semibold tracking-tight text-[#ededf2] sm:text-[28px]">
            Platform settings
          </h1>
          <p className="mt-1.5 max-w-2xl text-xs leading-5 text-[#85858d]">
            Manage branding, registration boundaries, marketplace controls, and plan
            quotas. Every change is persisted in MongoDB and recorded in the audit log.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {brandingDirty && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/[0.08] px-2.5 py-1 text-[10px] text-amber-300">
              <span className="size-1.5 rounded-full bg-amber-300" />
              Unsaved changes
            </span>
          )}
          <button
            type="button"
            onClick={requestRefresh}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-white/[0.09] bg-[#111114] px-3 text-xs text-[#c3c3ca] transition hover:bg-white/[0.05]"
          >
            <RefreshCw
              aria-hidden="true"
              className={`size-3.5 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>
      </section>

      {error && <ErrorBanner message={error} onRetry={requestRefresh} />}

      <nav
        aria-label="Settings sections"
        className="flex gap-1.5 overflow-x-auto rounded-lg border border-white/[0.07] bg-[#111114] p-1.5"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-[11px] font-medium transition ${
                active
                  ? 'bg-white/[0.07] text-[#f0f0f3]'
                  : 'text-[#8b8b94] hover:bg-white/[0.035] hover:text-[#d4d4db]'
              }`}
            >
              <Icon
                aria-hidden="true"
                className={`size-3.5 ${active ? 'text-[#b49aff]' : ''}`}
              />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {activeTab === 'profile' ? (
        <AdminProfilePanel />
      ) : loading && !data ? (
        <div className={`${cardClass} p-5`}>
          <TableSkeleton />
        </div>
      ) : !data ? (
        <div className={`${cardClass} flex min-h-64 flex-col items-center justify-center px-5 text-center`}>
          <CircleAlert aria-hidden="true" className="size-6 text-rose-300" />
          <h2 className="mt-3 text-sm font-medium text-[#d4d4db]">
            Settings are unavailable
          </h2>
          <p className="mt-1 max-w-sm text-xs leading-5 text-[#777780]">
            The platform settings could not be loaded from the backend. Retry once the
            service is reachable.
          </p>
        </div>
      ) : activeTab === 'general' && branding ? (
        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <SectionCard
            title="General & branding"
            description="Public identity used across the product. Only these safe fields are exposed publicly."
            icon={Settings2}
            footer={
              <>
                <button
                  type="button"
                  onClick={saveBranding}
                  disabled={!brandingDirty || savingBranding}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-[#6d4df5] px-3.5 text-xs font-medium text-white transition hover:bg-[#7d60f7] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingBranding ? (
                    <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                  ) : (
                    <Save aria-hidden="true" className="size-3.5" />
                  )}
                  Save changes
                </button>
                <button
                  type="button"
                  onClick={resetBranding}
                  disabled={!brandingDirty || savingBranding}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-white/[0.09] px-3 text-xs text-[#c3c3ca] transition hover:bg-white/[0.05] disabled:opacity-45"
                >
                  <RotateCcw aria-hidden="true" className="size-3.5" />
                  Reset
                </button>
                <span className="ml-auto text-[10px] text-[#73737c]">
                  {data.settings.updatedAt
                    ? `Last updated ${formatDateTime(data.settings.updatedAt)}`
                    : 'Not yet updated'}
                </span>
              </>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Platform name"
                htmlFor="platform-name"
                error={brandingErrors.name}
                help="2–80 characters. Shown on sign-in and dashboard branding."
              >
                <input
                  id="platform-name"
                  value={branding.name}
                  onChange={(event) => updateBranding('name', event.target.value)}
                  maxLength={80}
                  className={inputClass}
                />
              </Field>
              <Field
                label="Support email"
                htmlFor="platform-support-email"
                error={brandingErrors.supportEmail}
                help="Public support contact. Leave empty to hide it."
              >
                <div className="relative">
                  <Mail
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#777780]"
                  />
                  <input
                    id="platform-support-email"
                    type="email"
                    value={branding.supportEmail}
                    onChange={(event) => updateBranding('supportEmail', event.target.value)}
                    placeholder="support@example.com"
                    className={`${inputClass} pl-9`}
                  />
                </div>
              </Field>
              <div className="sm:col-span-2">
                <Field
                  label="Platform description"
                  htmlFor="platform-description"
                  error={brandingErrors.description}
                  help={`${branding.description.length}/500 characters.`}
                >
                  <textarea
                    id="platform-description"
                    value={branding.description}
                    onChange={(event) => updateBranding('description', event.target.value)}
                    maxLength={500}
                    rows={3}
                    className="w-full resize-y rounded-md border border-white/[0.09] bg-[#111114] px-3 py-2.5 text-xs leading-5 text-[#e7e7ec] outline-none transition placeholder:text-[#73737c] focus:border-[#9b71ff]/70"
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field
                  label="Website URL"
                  htmlFor="platform-website"
                  error={brandingErrors.websiteUrl}
                  help="Must be a valid http or https URL. Leave empty to hide it."
                >
                  <input
                    id="platform-website"
                    value={branding.websiteUrl}
                    onChange={(event) => updateBranding('websiteUrl', event.target.value)}
                    placeholder="https://example.com"
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Platform logo"
            description="PNG, JPEG, or WebP up to 1 MB. Stored as a data URL in MongoDB using the existing upload path."
            icon={ImageIcon}
          >
            <div className="flex flex-col items-center gap-4 rounded-md border border-dashed border-white/[0.1] bg-[#0d0d10] px-4 py-6">
              {branding.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={branding.logo}
                  alt="Platform logo preview"
                  className="max-h-24 max-w-[220px] object-contain"
                />
              ) : (
                <span className="flex size-16 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.025] text-[#767680]">
                  <ImageIcon aria-hidden="true" className="size-6" />
                </span>
              )}
              <div className="flex flex-wrap justify-center gap-2">
                <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-white/[0.09] px-3 text-xs text-[#c3c3ca] transition hover:bg-white/[0.05]">
                  <Upload aria-hidden="true" className="size-3.5" />
                  Upload logo
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={selectLogo}
                    className="sr-only"
                  />
                </label>
                {branding.logo && (
                  <button
                    type="button"
                    onClick={() => updateBranding('logo', null)}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-rose-400/20 px-3 text-xs text-rose-300 transition hover:bg-rose-400/[0.06]"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-center text-[10px] leading-4 text-[#73737c]">
                The backend verifies the MIME type, magic bytes, and 1 MB size cap before
                saving. SVG and other formats are rejected.
              </p>
            </div>
          </SectionCard>
        </div>
      ) : activeTab === 'controls' && controls ? (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-md border border-sky-400/20 bg-sky-400/[0.05] px-3 py-2.5 text-[11px] leading-5 text-sky-200">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p>
              These switches are enforced by the backend, not just hidden in the UI.
              Registration is blocked inside Better Auth; job posting and applications are
              blocked by the Express API. Existing accounts, jobs, applications, and quotas
              are never deleted.
            </p>
          </div>
          <SectionCard
            title="Platform controls"
            description="Impactful marketplace switches. Each change asks for confirmation and is written to the audit log."
            icon={SlidersHorizontal}
          >
            <div className="divide-y divide-white/[0.06]">
              {(Object.keys(controlLabels) as ControlKey[]).map((key) => {
                const item = controlLabels[key];
                const enabled = controls[key];
                const saving = savingControl === key;
                return (
                  <div
                    key={key}
                    className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xs font-medium text-[#dcdce3]">{item.title}</h3>
                        <Badge tone={enabled ? 'success' : 'warning'}>
                          {enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        {saving && (
                          <LoaderCircle
                            aria-hidden="true"
                            className="size-3.5 animate-spin text-[#b49aff]"
                          />
                        )}
                      </div>
                      <p className="mt-1 max-w-xl text-[10px] leading-5 text-[#777780]">
                        {item.description}
                      </p>
                      {!enabled && (
                        <p className="mt-1 max-w-xl text-[10px] leading-5 text-amber-300/80">
                          {item.disabledEffect}
                        </p>
                      )}
                    </div>
                    <Toggle
                      checked={enabled}
                      disabled={Boolean(savingControl)}
                      label={`${enabled ? 'Disable' : 'Enable'} ${item.title}`}
                      onChange={() => requestControlToggle(key)}
                    />
                  </div>
                );
              })}
              <div className="flex flex-col gap-3 py-4 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xs font-medium text-[#dcdce3]">
                      Recruiter registration
                    </h3>
                    <Badge>
                      <span className="inline-flex items-center gap-1">
                        <Lock aria-hidden="true" className="size-2.5" /> Read-only
                      </span>
                    </Badge>
                  </div>
                  <p className="mt-1 max-w-xl text-[10px] leading-5 text-[#777780]">
                    Public signup always creates a seeker account, so there is no recruiter
                    self-registration path to switch off. Recruiter access is granted by an
                    active admin from the Users page.
                  </p>
                </div>
                <Link
                  href="/dashboard/admin/users"
                  className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-white/[0.09] px-3 text-xs text-[#c3c3ca] transition hover:bg-white/[0.05]"
                >
                  Manage users
                </Link>
              </div>
            </div>
          </SectionCard>
        </div>
      ) : activeTab === 'rules' ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <SectionCard
            title="Job content limits"
            description="Enforced by the Express job validation layer on create and update."
            icon={FileText}
          >
            <dl className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-md border border-white/[0.07] bg-[#0d0d10] px-3 py-2.5">
                <div>
                  <dt className="text-[11px] text-[#d3d3da]">Maximum job description length</dt>
                  <dd className="mt-0.5 text-[10px] text-[#777780]">
                    Stored as the responsibilities field.
                  </dd>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#ededf2]">
                    {data.jobRules.responsibility.toLocaleString()}
                  </span>
                  <Badge>
                    <span className="inline-flex items-center gap-1">
                      <Lock aria-hidden="true" className="size-2.5" /> Fixed
                    </span>
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md border border-white/[0.07] bg-[#0d0d10] px-3 py-2.5">
                <div>
                  <dt className="text-[11px] text-[#d3d3da]">Maximum requirements length</dt>
                  <dd className="mt-0.5 text-[10px] text-[#777780]">
                    Stored as the qualifications field.
                  </dd>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#ededf2]">
                    {data.jobRules.qualifications.toLocaleString()}
                  </span>
                  <Badge>
                    <span className="inline-flex items-center gap-1">
                      <Lock aria-hidden="true" className="size-2.5" /> Fixed
                    </span>
                  </Badge>
                </div>
              </div>
            </dl>
            <p className="mt-3 text-[10px] leading-4 text-[#73737c]">
              These limits are read-only here because changing them requires matching
              client-side maxLength rules. The backend remains the authoritative validator.
            </p>
          </SectionCard>

          <SectionCard
            title="Resume upload rules"
            description="The existing PDF flow and body-parser limits are preserved."
            icon={ShieldCheck}
          >
            <dl className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-md border border-white/[0.07] bg-[#0d0d10] px-3 py-2.5">
                <dt className="text-[11px] text-[#d3d3da]">Maximum resume upload size</dt>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#ededf2]">
                    {formatBytes(data.resumeRules.maxBytes)}
                  </span>
                  <Badge>
                    <span className="inline-flex items-center gap-1">
                      <Lock aria-hidden="true" className="size-2.5" /> Fixed
                    </span>
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md border border-white/[0.07] bg-[#0d0d10] px-3 py-2.5">
                <dt className="text-[11px] text-[#d3d3da]">Allowed resume file formats</dt>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase text-[#ededf2]">
                    {data.resumeRules.formats.join(', ')}
                  </span>
                  <Badge>
                    <span className="inline-flex items-center gap-1">
                      <Lock aria-hidden="true" className="size-2.5" /> Fixed
                    </span>
                  </Badge>
                </div>
              </div>
            </dl>
            <p className="mt-3 text-[10px] leading-4 text-[#73737c]">
              Resume validation checks the PDF signature and decoded byte size on the
              backend. These values are not editable from this form.
            </p>
          </SectionCard>
        </div>
      ) : activeTab === 'plans' && planLimits ? (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-md border border-sky-400/20 bg-sky-400/[0.05] px-3 py-2.5 text-[11px] leading-5 text-sky-200">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p>
              Limits are read from the backend <code className="font-mono">plans</code>{' '}
              collection. Starter stays fixed at 5. Growth and Premium can be updated here
              and take effect for the next quota check. Price and discount changes create
              new Stripe objects and apply only to future checkouts.
            </p>
          </div>
          {(['seeker', 'recruiter'] as const).map((role) => (
            <SectionCard
              key={role}
              title={`${role === 'seeker' ? 'Seeker' : 'Recruiter'} plan limits`}
              description={
                role === 'seeker'
                  ? 'Monthly application quota per plan.'
                  : 'Monthly job posting quota per plan.'
              }
              icon={CreditCard}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-white/[0.07] text-[9px] uppercase tracking-[0.08em] text-[#777780]">
                      <th className="px-2 py-2.5 font-medium">Plan</th>
                      <th className="px-2 py-2.5 font-medium">
                        {role === 'seeker' ? 'Monthly applications' : 'Monthly job posts'}
                      </th>
                      <th className="px-2 py-2.5 font-medium">Source</th>
                      <th className="px-2 py-2.5 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planLimits[role].map((limit) => {
                      const key = `${limit.role}:${limit.plan}`;
                      const draft = limitDrafts[key] ?? '';
                      const changed =
                        limit.limit !== null && Number(draft) !== limit.limit;
                      const saving = savingLimit === key;
                      return (
                        <tr
                          key={key}
                          className="border-b border-white/[0.05] last:border-0"
                        >
                          <td className="px-2 py-3">
                            <Badge
                              tone={
                                limit.plan === 'Premium'
                                  ? 'success'
                                  : limit.plan === 'Growth'
                                    ? 'warning'
                                    : 'neutral'
                              }
                            >
                              {limit.plan}
                            </Badge>
                          </td>
                          <td className="px-2 py-3">
                            {limit.editable ? (
                              <input
                                type="number"
                                min={6}
                                max={100000}
                                step={1}
                                value={draft}
                                onChange={(event) =>
                                  setLimitDrafts((current) => ({
                                    ...current,
                                    [key]: event.target.value,
                                  }))
                                }
                                aria-label={`${limit.role} ${limit.plan} monthly limit`}
                                className={`${inputClass} max-w-40`}
                              />
                            ) : (
                              <span className="text-xs font-medium text-[#ededf2]">
                                {limit.limit === null
                                  ? '—'
                                  : limit.limit.toLocaleString()}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-3">
                            {limit.editable ? (
                              <span className="text-[10px] text-[#777780]">
                                Editable · plans collection
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] text-[#777780]">
                                <Lock aria-hidden="true" className="size-2.5" />
                                Fixed
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-3 text-right">
                            {limit.editable ? (
                              <button
                                type="button"
                                onClick={() => requestPlanLimitSave(limit)}
                                disabled={!changed || saving}
                                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/[0.09] px-2.5 text-[10px] text-[#c3c3ca] transition hover:bg-white/[0.05] disabled:opacity-40"
                              >
                                {saving ? (
                                  <LoaderCircle
                                    aria-hidden="true"
                                    className="size-3 animate-spin"
                                  />
                                ) : (
                                  <Check aria-hidden="true" className="size-3" />
                                )}
                                Save
                              </button>
                            ) : (
                              <span className="text-[10px] text-[#66666e]">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          ))}
          <AdminPricingManager />
        </div>
      ) : activeTab === 'notifications' && data ? (
        <AdminNotificationSettings
          key={refreshVersion}
          globalSettings={data.settings.controls.notifications}
          onSaved={() => setRefreshVersion((value) => value + 1)}
        />
      ) : activeTab === 'audit' ? (
        <section className={`${cardClass} overflow-hidden`}>
          <div className="flex flex-col gap-3 border-b border-white/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-[#e3e3e9]">
                <History aria-hidden="true" className="size-4 text-[#b49aff]" />
                Admin activity history
              </h2>
              <p className="mt-1 text-[10px] leading-4 text-[#777780]">
                Immutable records for platform configuration changes. Records cannot be
                edited or deleted from this dashboard.
              </p>
            </div>
            <select
              aria-label="Filter audit logs by section"
              value={auditSection}
              onChange={(event) => {
                setAuditSection(event.target.value);
                setAuditPage(1);
              }}
              className={`${inputClass} h-9 w-full sm:w-44`}
            >
              {(auditData?.filterOptions.sections ?? [
                'all',
                'branding',
                'controls',
                'notifications',
                'plan_limits',
                'pricing',
              ]).map((section) => (
                <option key={section} value={section}>
                  {section === 'all' ? 'All sections' : section.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          {auditError && (
            <div className="p-4">
              <ErrorBanner
                message={auditError}
                onRetry={() => setRefreshVersion((value) => value + 1)}
              />
            </div>
          )}

          {!auditData && auditLoading ? (
            <TableSkeleton />
          ) : auditData && auditData.logs.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
              <span className="flex size-12 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.025]">
                <History aria-hidden="true" className="size-5 text-[#767680]" />
              </span>
              <h3 className="mt-4 text-sm font-medium text-[#d4d4db]">No audit records</h3>
              <p className="mt-1 max-w-sm text-xs leading-5 text-[#777780]">
                Settings changes will appear here with the admin identity and previous and
                new values.
              </p>
            </div>
          ) : auditData ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-white/[0.07] text-[9px] uppercase tracking-[0.08em] text-[#777780]">
                      <th className="px-4 py-3 font-medium sm:px-5">When</th>
                      <th className="px-3 py-3 font-medium">Admin</th>
                      <th className="px-3 py-3 font-medium">Action</th>
                      <th className="px-3 py-3 font-medium">Setting</th>
                      <th className="px-3 py-3 font-medium">Previous</th>
                      <th className="px-3 py-3 font-medium">New</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditData.logs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-white/[0.05] transition-colors last:border-0 hover:bg-white/[0.018]"
                      >
                        <td className="whitespace-nowrap px-4 py-3.5 text-[10px] text-[#96969e] sm:px-5">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td className="max-w-[190px] px-3 py-3.5">
                          <span className="block truncate text-[10px] font-medium text-[#d4d4db]">
                            {log.actorName || 'Unknown admin'}
                          </span>
                          <span className="mt-1 block truncate text-[9px] text-[#777780]">
                            {log.actorEmail || log.actorId || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-3.5">
                          <Badge tone={log.section === 'controls' ? 'warning' : 'neutral'}>
                            {log.action.replace('platform_settings.', '').replace('.', ' ')}
                          </Badge>
                        </td>
                        <td className="max-w-[240px] px-3 py-3.5">
                          <span
                            className="block truncate font-mono text-[9px] text-[#a8a8b0]"
                            title={log.field}
                          >
                            {log.field}
                          </span>
                        </td>
                        <td className="max-w-[190px] px-3 py-3.5">
                          <span className="block truncate text-[10px] text-[#96969e]" title={formatAuditValue(log.previousValue)}>
                            {formatAuditValue(log.previousValue)}
                          </span>
                        </td>
                        <td className="max-w-[190px] px-3 py-3.5">
                          <span className="block truncate text-[10px] text-[#d4d4db]" title={formatAuditValue(log.newValue)}>
                            {formatAuditValue(log.newValue)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <AuditPagination
                page={auditPage}
                totalPages={auditData.pagination.totalPages}
                total={auditData.pagination.total}
                loading={auditLoading}
                onPageChange={setAuditPage}
              />
            </>
          ) : null}
        </section>
      ) : null}

      {confirm && (
        <ConfirmDialog
          state={confirm}
          busy={confirmBusy}
          onCancel={() => {
            if (!confirmBusy) setConfirm(null);
          }}
          onConfirm={() => void runConfirmedAction()}
        />
      )}
    </div>
  );
}
