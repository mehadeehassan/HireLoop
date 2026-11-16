'use client';

import { BadgeCheck, Check, CircleAlert, LoaderCircle, Mail, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';

type EmailVerificationSettingProps = {
  email?: string;
  emailVerified?: boolean;
};

export default function EmailVerificationSetting({
  email,
  emailVerified,
}: EmailVerificationSettingProps) {
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (cooldown === 0) return;
    const timer = window.setTimeout(
      () => setCooldown((remaining) => Math.max(remaining - 1, 0)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function sendVerificationEmail() {
    if (!email || sending || cooldown > 0) return;
    setSending(true);
    setMessage('');
    setError('');
    try {
      const result = await authClient.sendVerificationEmail({
        email,
        callbackURL: '/signin?verification=success',
      });
      if (result.error) {
        setError('We could not send a verification link right now. Please try again later.');
        return;
      }
      setMessage(`If this account needs verification, a link will be sent to ${email}.`);
    } catch {
      setError('We could not send a verification link right now. Please try again later.');
    } finally {
      setCooldown(60);
      setSending(false);
    }
  }

  if (!email || emailVerified === undefined) return null;

  return (
    <section
      className={`relative overflow-hidden rounded-xl border p-5 sm:p-6 ${
        emailVerified
          ? 'border-emerald-400/15 bg-[linear-gradient(145deg,rgba(16,35,29,0.72),rgba(19,19,22,0.96)_60%)]'
          : 'border-[#6258ff]/25 bg-[linear-gradient(145deg,rgba(38,33,76,0.48),rgba(19,19,22,0.96)_62%)]'
      }`}
    >
      <div
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-px ${
          emailVerified
            ? 'bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent'
            : 'bg-gradient-to-r from-transparent via-[#8e86ff]/60 to-transparent'
        }`}
      />
      <div className="flex items-start gap-3">
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ${
            emailVerified
              ? 'bg-emerald-400/10 text-emerald-200 ring-emerald-300/15'
              : 'bg-[#7770ff]/12 text-[#b8b2ff] ring-[#9992ff]/20'
          }`}
        >
          {emailVerified ? (
            <ShieldCheck aria-hidden="true" className="size-5" />
          ) : (
            <Mail aria-hidden="true" className="size-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[#ededf2]">Email verification</h2>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-medium ${
                emailVerified
                  ? 'border-emerald-300/15 bg-emerald-300/[0.07] text-emerald-200'
                  : 'border-amber-300/15 bg-amber-300/[0.07] text-amber-200'
              }`}
            >
              {emailVerified ? (
                <Check aria-hidden="true" className="size-3" />
              ) : (
                <CircleAlert aria-hidden="true" className="size-3" />
              )}
              {emailVerified ? 'Verified' : 'Action needed'}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-[#a3a3b0]">
            {emailVerified
              ? 'Your account is protected with a verified email address.'
              : 'Verify your email address to secure your account.'}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-white/[0.07] bg-black/20 px-3.5 py-3">
        <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-[#777780]">
          Account email
        </p>
        <p className="mt-1 break-all text-xs font-medium text-[#e4e4eb]">{email}</p>
      </div>

      {!emailVerified ? (
        <>
          <button
            type="button"
            onClick={() => void sendVerificationEmail()}
            disabled={sending || cooldown > 0}
            aria-busy={sending}
            className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#6258ff] px-4 py-2.5 text-xs font-semibold text-white shadow-[0_6px_20px_rgba(98,88,255,0.2)] transition hover:bg-[#7168ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#aaa5ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#121118] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {sending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
            <span>
              {sending
                ? 'Sending verification link...'
                : cooldown > 0
                  ? `Resend available in ${cooldown}s`
                  : 'Send verification link'}
            </span>
          </button>
          <p className="mt-2 text-center text-[10px] leading-4 text-[#777780]">
            The secure link expires in 15 minutes.
          </p>
          {message ? (
            <p
              role="status"
              className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-300/15 bg-emerald-300/[0.06] p-3 text-xs leading-5 text-emerald-200"
            >
              <BadgeCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {message}
            </p>
          ) : null}
          {error ? (
            <p
              role="alert"
              className="mt-3 flex items-start gap-2 rounded-lg border border-red-300/15 bg-red-300/[0.06] p-3 text-xs leading-5 text-red-200"
            >
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
