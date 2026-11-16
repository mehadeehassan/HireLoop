'use client';

import {
  AtSign,
  Camera,
  Check,
  CircleAlert,
  KeyRound,
  LoaderCircle,
  Lock,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react';
import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useMemo,
  useState,
} from 'react';
import { toast } from 'sonner';
import { isAccountActive } from '@/lib/admin-user-policy';
import { authClient, useSession } from '@/lib/auth-client';
import DashboardAvatar from '@/components/dashboard/shared/DashboardAvatar';
import EmailVerificationSetting from '@/components/dashboard/shared/EmailVerificationSetting';

type ProfileForm = {
  name: string;
  phone: string;
  designation: string;
  bio: string;
  image: string | null;
};

type SessionProfileUser = {
  id: string;
  name?: string | null;
  email: string;
  phone?: string | null;
  designation?: string | null;
  bio?: string | null;
  image?: string | null;
  role?: string | null;
  emailVerified?: boolean | null;
  createdAt?: Date | string | null;
};

function toProfileForm(user?: SessionProfileUser): ProfileForm {
  return {
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    designation: user?.designation ?? '',
    bio: user?.bio ?? '',
    image: user?.image ?? null,
  };
}

type Notice = {
  tone: 'success' | 'warning' | 'error';
  text: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phonePattern = /^\+?[0-9 ()-]{7,20}$/;
const maxAvatarBytes = 2 * 1024 * 1024;

const inputClass =
  'h-10 w-full rounded-md border border-white/[0.09] bg-[#111114] px-3 text-xs text-[#e7e7ec] outline-none transition placeholder:text-[#73737c] focus:border-[#9b71ff]/70';
const labelClass = 'text-[11px] font-medium text-[#d3d3da]';
const helpClass = 'text-[10px] leading-4 text-[#777780]';
const cardClass = 'rounded-lg border border-white/[0.07] bg-[#111114]';

function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message
  ) {
    return error.message;
  }
  return fallback;
}

function formatDateTime(value: unknown) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value as string);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
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
  icon: typeof UserRound;
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

function NoticeBox({ notice }: { notice: Notice }) {
  const tones = {
    success: 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200',
    warning: 'border-amber-400/20 bg-amber-400/[0.06] text-amber-200',
    error: 'border-rose-400/20 bg-rose-400/[0.06] text-rose-200',
  } as const;
  return (
    <div
      role={notice.tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-md border px-3 py-2.5 text-[11px] leading-5 ${tones[notice.tone]}`}
    >
      {notice.tone === 'success' ? (
        <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      ) : (
        <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      )}
      <span>{notice.text}</span>
    </div>
  );
}

export default function AdminProfilePanel() {
  const { data: session, isPending, error: sessionError, refetch } = useSession();
  const user = session?.user as SessionProfileUser | undefined;

  const [form, setForm] = useState<ProfileForm>(() => toProfileForm(user));
  const [initializedFor, setInitializedFor] = useState<string | null>(user?.id ?? null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState<Notice | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);
  const [emailNotice, setEmailNotice] = useState<Notice | null>(null);

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<Notice | null>(null);

  if (user?.id && initializedFor !== user.id) {
    setInitializedFor(user.id);
    setForm(toProfileForm(user));
  }

  const dirty = useMemo(() => {
    if (!user) return false;
    return (
      form.name.trim() !== (user.name ?? '') ||
      form.phone.trim() !== (user.phone ?? '') ||
      form.designation.trim() !== (user.designation ?? '') ||
      form.bio.trim() !== (user.bio ?? '') ||
      (form.image || null) !== (user.image || null)
    );
  }, [form, user]);

  function updateField(key: keyof ProfileForm, value: string | null) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function resetForm() {
    if (!user) return;
    setForm({
      name: user.name ?? '',
      phone: user.phone ?? '',
      designation: user.designation ?? '',
      bio: user.bio ?? '',
      image: user.image ?? null,
    });
    setFieldErrors({});
    setProfileNotice(null);
  }

  function validateProfile() {
    const errors: Record<string, string> = {};
    const name = form.name.trim();
    if (name.length < 2 || name.length > 80) {
      errors.name = 'Full name must be between 2 and 80 characters.';
    }
    const phone = form.phone.trim();
    if (phone && !phonePattern.test(phone)) {
      errors.phone = 'Use 7–20 digits; spaces, dashes, parentheses and + are allowed.';
    }
    if (form.designation.trim().length > 80) {
      errors.designation = 'Designation must be at most 80 characters.';
    }
    if (form.bio.trim().length > 500) {
      errors.bio = 'Bio must be at most 500 characters.';
    }
    return errors;
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || savingProfile) return;
    const errors = validateProfile();
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setProfileNotice({ tone: 'error', text: 'Fix the highlighted fields before saving.' });
      return;
    }

    setSavingProfile(true);
    setProfileNotice(null);
    try {
      const { error } = await authClient.updateUser({
        name: form.name.trim(),
        phone: form.phone.trim(),
        designation: form.designation.trim(),
        bio: form.bio.trim(),
        image: form.image || null,
      });
      if (error) {
        const message = getErrorMessage(error, 'Could not save your profile.');
        setProfileNotice({ tone: 'error', text: message });
        toast.error(message);
        return;
      }
      setForm((current) => ({
        ...current,
        name: current.name.trim(),
        phone: current.phone.trim(),
        designation: current.designation.trim(),
        bio: current.bio.trim(),
      }));
      await refetch();
      setProfileNotice({ tone: 'success', text: 'Profile updated.' });
      toast.success('Profile updated.');
    } catch (requestError) {
      const message = getErrorMessage(requestError, 'Could not save your profile.');
      setProfileNotice({ tone: 'error', text: message });
      toast.error(message);
    } finally {
      setSavingProfile(false);
    }
  }

  function selectAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Profile image must be a PNG, JPEG, or WebP file.');
      event.target.value = '';
      return;
    }
    if (file.size > maxAvatarBytes) {
      toast.error('Profile image must be 2 MB or smaller.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateField('image', reader.result);
        setProfileNotice(null);
      }
    };
    reader.onerror = () => toast.error('Could not read the selected image.');
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  async function changeEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || changingEmail) return;
    const email = newEmail.trim().toLowerCase();
    if (!emailPattern.test(email)) {
      setEmailNotice({ tone: 'error', text: 'Enter a valid email address.' });
      return;
    }
    if (email === user.email.toLowerCase()) {
      setEmailNotice({ tone: 'error', text: 'Enter a different email address.' });
      return;
    }

    setChangingEmail(true);
    setEmailNotice(null);
    try {
      const { error } = await authClient.changeEmail({
        newEmail: email,
        callbackURL: '/dashboard/admin/settings',
      });
      if (error) {
        const message = getErrorMessage(error, 'Could not start the email change.');
        setEmailNotice({ tone: 'error', text: message });
        toast.error(message);
        return;
      }
      const result = await authClient.getSession();
      const updatedEmail = result.data?.user?.email?.toLowerCase() ?? null;
      await refetch();
      if (updatedEmail === email) {
        setNewEmail('');
        setEmailNotice({ tone: 'success', text: 'Email address updated.' });
        toast.success('Email address updated.');
      } else {
        setEmailNotice({
          tone: 'warning',
          text: 'Email was not changed. The address may already be in use, or this account requires email verification, which is not configured on this platform yet.',
        });
      }
    } catch (requestError) {
      const message = getErrorMessage(requestError, 'Could not change the email address.');
      setEmailNotice({ tone: 'error', text: message });
      toast.error(message);
    } finally {
      setChangingEmail(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (changingPassword) return;
    if (!passwords.current) {
      setPasswordNotice({ tone: 'error', text: 'Enter your current password.' });
      return;
    }
    if (passwords.next.length < 8) {
      setPasswordNotice({ tone: 'error', text: 'New password must be at least 8 characters.' });
      return;
    }
    if (passwords.next === passwords.current) {
      setPasswordNotice({ tone: 'error', text: 'New password must differ from the current one.' });
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setPasswordNotice({ tone: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    setChangingPassword(true);
    setPasswordNotice(null);
    try {
      const { error } = await authClient.changePassword({
        currentPassword: passwords.current,
        newPassword: passwords.next,
        revokeOtherSessions: true,
      });
      if (error) {
        const raw = getErrorMessage(error, 'Could not change the password.');
        const message = /invalid password/i.test(raw)
          ? 'Current password is incorrect, or this account does not use a password.'
          : raw;
        setPasswordNotice({ tone: 'error', text: message });
        toast.error(message);
        return;
      }
      setPasswords({ current: '', next: '', confirm: '' });
      setPasswordNotice({
        tone: 'success',
        text: 'Password updated. Other sessions were signed out.',
      });
      toast.success('Password updated.');
    } catch (requestError) {
      const message = getErrorMessage(requestError, 'Could not change the password.');
      setPasswordNotice({ tone: 'error', text: message });
      toast.error(message);
    } finally {
      setChangingPassword(false);
    }
  }

  if (isPending && !user) {
    return (
      <div className={`${cardClass} p-5`} aria-label="Loading profile">
        <div className="space-y-3">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="h-11 animate-pulse rounded bg-white/2.5" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`${cardClass} flex min-h-64 flex-col items-center justify-center px-5 text-center`}>
        <CircleAlert aria-hidden="true" className="size-6 text-rose-300" />
        <h2 className="mt-3 text-sm font-medium text-[#d4d4db]">Profile is unavailable</h2>
        <p className="mt-1 max-w-sm text-xs leading-5 text-[#777780]">
          {sessionError
            ? getErrorMessage(sessionError, 'Your session could not be loaded.')
            : 'Your session could not be loaded. Sign in again to manage your profile.'}
        </p>
      </div>
    );
  }

  const active = isAccountActive(
    user as unknown as { banned?: boolean | null; banExpires?: Date | string | null },
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
      <form onSubmit={saveProfile}>
        <SectionCard
          title="Profile information"
          description="This information identifies you across the admin console. Only you can edit it."
          icon={UserRound}
          footer={
            <>
              <button
                type="submit"
                disabled={!dirty || savingProfile}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-[#6d4df5] px-3.5 text-xs font-medium text-white transition hover:bg-[#7d60f7] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingProfile ? (
                  <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                ) : (
                  <Save aria-hidden="true" className="size-3.5" />
                )}
                Save changes
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={!dirty || savingProfile}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-white/9 px-3 text-xs text-[#c3c3ca] transition hover:bg-white/5 disabled:opacity-45"
              >
                <RotateCcw aria-hidden="true" className="size-3.5" />
                Reset
              </button>
              {dirty && (
                <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/8 px-2.5 py-1 text-[10px] text-amber-300">
                  <span className="size-1.5 rounded-full bg-amber-300" />
                  Unsaved changes
                </span>
              )}
            </>
          }
        >
          <div className="mb-5 flex flex-col gap-4 rounded-md border border-dashed border-white/10 bg-[#0d0d10] px-4 py-4 sm:flex-row sm:items-center">
            <DashboardAvatar src={form.image} name={form.name} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-[#d3d3da]">Profile image</p>
              <p className="mt-0.5 text-[10px] leading-4 text-[#777780]">
                PNG, JPEG, or WebP up to 2 MB. Stored on your Better Auth user record.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-white/9 px-2.5 text-[10px] text-[#c3c3ca] transition hover:bg-white/5">
                  <Camera aria-hidden="true" className="size-3.5" />
                  Upload image
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={selectAvatar}
                    className="sr-only"
                  />
                </label>
                {form.image && (
                  <button
                    type="button"
                    onClick={() => updateField('image', null)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-rose-400/20 px-2.5 text-[10px] text-rose-300 transition hover:bg-rose-400/6"
                  >
                    <Trash2 aria-hidden="true" className="size-3.5" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Full name"
              htmlFor="profile-name"
              error={fieldErrors.name}
              help="2–80 characters. Shown in the sidebar profile card."
            >
              <input
                id="profile-name"
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                maxLength={80}
                autoComplete="name"
                className={inputClass}
              />
            </Field>
            <Field
              label="Phone number"
              htmlFor="profile-phone"
              error={fieldErrors.phone}
              help="Optional. 7–20 digits; spaces, dashes, parentheses and + allowed."
            >
              <input
                id="profile-phone"
                value={form.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                maxLength={20}
                inputMode="tel"
                autoComplete="tel"
                placeholder="+1 555 0100"
                className={inputClass}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field
                label="Designation"
                htmlFor="profile-designation"
                error={fieldErrors.designation}
                help="Optional. Up to 80 characters, for example Platform Administrator."
              >
                <input
                  id="profile-designation"
                  value={form.designation}
                  onChange={(event) => updateField('designation', event.target.value)}
                  maxLength={80}
                  placeholder="Platform Administrator"
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field
                label="Bio"
                htmlFor="profile-bio"
                error={fieldErrors.bio}
                help={`Optional. ${form.bio.length}/500 characters.`}
              >
                <textarea
                  id="profile-bio"
                  value={form.bio}
                  onChange={(event) => updateField('bio', event.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="A short note about your responsibilities."
                  className="w-full resize-y rounded-md border border-white/9 bg-[#111114] px-3 py-2.5 text-xs leading-5 text-[#e7e7ec] outline-none transition placeholder:text-[#73737c] focus:border-[#9b71ff]/70"
                />
              </Field>
            </div>
          </div>

          {profileNotice && (
            <div className="mt-4">
              <NoticeBox notice={profileNotice} />
            </div>
          )}
        </SectionCard>
      </form>

      <div className="space-y-4">
        <SectionCard
          title="Account"
          description="Read-only identity and access details. Role and status are not editable here."
          icon={ShieldCheck}
        >
          <dl className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-md border border-white/[0.07] bg-[#0d0d10] px-3 py-2.5">
              <dt className="text-[11px] text-[#d3d3da]">Role</dt>
              <dd>
                <Badge tone="success">
                  {user.role === 'admin' ? 'Administrator' : String(user.role || 'Unknown')}
                </Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-white/[0.07] bg-[#0d0d10] px-3 py-2.5">
              <dt className="text-[11px] text-[#d3d3da]">Account status</dt>
              <dd>
                <Badge tone={active ? 'success' : 'danger'}>
                  {active ? 'Active' : 'Suspended'}
                </Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-white/[0.07] bg-[#0d0d10] px-3 py-2.5">
              <dt className="text-[11px] text-[#d3d3da]">Member since</dt>
              <dd className="text-[11px] text-[#c3c3ca]">{formatDateTime(user.createdAt)}</dd>
            </div>
          </dl>
          <div className="mt-4">
            <EmailVerificationSetting
              email={user.email}
              emailVerified={user.emailVerified === true}
            />
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-4 text-[#73737c]">
            <Lock aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
            Role, permissions, and account status can only be changed by platform
            administrators from the Users page, never from this profile form.
          </p>
        </SectionCard>

        <form onSubmit={changeEmail}>
          <SectionCard
            title="Email address"
            description="Changing your sign-in email uses the Better Auth email-change endpoint."
            icon={AtSign}
            footer={
              <button
                type="submit"
                disabled={changingEmail || !newEmail.trim()}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-white/9 px-3 text-xs text-[#c3c3ca] transition hover:bg-white/5 disabled:opacity-45"
              >
                {changingEmail ? (
                  <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                ) : (
                  <AtSign aria-hidden="true" className="size-3.5" />
                )}
                Update email
              </button>
            }
          >
            <div className="space-y-3">
              <div className="rounded-md border border-white/[0.07] bg-[#0d0d10] px-3 py-2.5">
                <p className="text-[9px] uppercase tracking-[0.08em] text-[#777780]">
                  Current email
                </p>
                <p className="mt-0.5 truncate text-[11px] text-[#e3e3e9]">{user.email}</p>
              </div>
              <Field
                label="New email address"
                htmlFor="profile-new-email"
                help="Better Auth requires verification for verified accounts. Unverified accounts update immediately."
              >
                <input
                  id="profile-new-email"
                  type="email"
                  value={newEmail}
                  onChange={(event) => {
                    setNewEmail(event.target.value);
                    setEmailNotice(null);
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className={inputClass}
                />
              </Field>
              <p className="text-[10px] leading-4 text-[#73737c]">
                Verification email delivery is not configured on this platform, so verified
                accounts cannot complete an email change yet. The change is never written
                directly to the database.
              </p>
              {emailNotice && <NoticeBox notice={emailNotice} />}
            </div>
          </SectionCard>
        </form>

        <form onSubmit={changePassword}>
          <SectionCard
            title="Change password"
            description="Uses the Better Auth change-password API with your current password."
            icon={KeyRound}
            footer={
              <button
                type="submit"
                disabled={
                  changingPassword ||
                  !passwords.current ||
                  !passwords.next ||
                  !passwords.confirm
                }
                className="inline-flex h-9 items-center gap-2 rounded-md border border-white/9 px-3 text-xs text-[#c3c3ca] transition hover:bg-white/5 disabled:opacity-45"
              >
                {changingPassword ? (
                  <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                ) : (
                  <KeyRound aria-hidden="true" className="size-3.5" />
                )}
                Update password
              </button>
            }
          >
            <div className="space-y-3">
              <Field label="Current password" htmlFor="profile-current-password">
                <input
                  id="profile-current-password"
                  type={showPasswords ? 'text' : 'password'}
                  value={passwords.current}
                  onChange={(event) => {
                    setPasswords((current) => ({ ...current, current: event.target.value }));
                    setPasswordNotice(null);
                  }}
                  autoComplete="current-password"
                  className={inputClass}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="New password" htmlFor="profile-new-password" help="At least 8 characters.">
                  <input
                    id="profile-new-password"
                    type={showPasswords ? 'text' : 'password'}
                    value={passwords.next}
                    onChange={(event) => {
                      setPasswords((current) => ({ ...current, next: event.target.value }));
                      setPasswordNotice(null);
                    }}
                    autoComplete="new-password"
                    className={inputClass}
                  />
                </Field>
                <Field label="Confirm password" htmlFor="profile-confirm-password">
                  <input
                    id="profile-confirm-password"
                    type={showPasswords ? 'text' : 'password'}
                    value={passwords.confirm}
                    onChange={(event) => {
                      setPasswords((current) => ({ ...current, confirm: event.target.value }));
                      setPasswordNotice(null);
                    }}
                    autoComplete="new-password"
                    className={inputClass}
                  />
                </Field>
              </div>
              <label className="inline-flex items-center gap-2 text-[10px] text-[#8f8f98]">
                <input
                  type="checkbox"
                  checked={showPasswords}
                  onChange={(event) => setShowPasswords(event.target.checked)}
                  className="size-3.5 rounded border-white/20 bg-[#111114]"
                />
                Show passwords
              </label>
              <p className="text-[10px] leading-4 text-[#73737c]">
                Changing your password signs out every other session. Accounts that only use
                Google sign-in do not have a password to change.
              </p>
              {passwordNotice && <NoticeBox notice={passwordNotice} />}
            </div>
          </SectionCard>
        </form>
      </div>
    </div>
  );
}
