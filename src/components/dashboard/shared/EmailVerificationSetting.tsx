'use client';

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
    <section className="rounded-lg border border-white/[0.07] bg-[#131316] p-5 sm:p-6">
      <h2 className="text-sm font-semibold text-[#ededf2]">Email verification</h2>
      <p className="mt-2 text-xs text-[#92929b]">
        {emailVerified
          ? 'Your account email is verified.'
          : `Your account email (${email}) is not verified yet.`}
      </p>
      {!emailVerified ? (
        <>
          <button
            type="button"
            onClick={() => void sendVerificationEmail()}
            disabled={sending || cooldown > 0}
            className="mt-4 h-10 rounded-md border border-white/10 bg-white/[0.04] px-4 text-xs font-semibold text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {sending
              ? 'Sending...'
              : cooldown > 0
                ? `Resend available in ${cooldown}s`
                : 'Send verification email'}
          </button>
          {message ? (
            <p role="status" className="mt-3 text-xs leading-5 text-emerald-200">
              {message}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="mt-3 text-xs leading-5 text-red-300">
              {error}
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
