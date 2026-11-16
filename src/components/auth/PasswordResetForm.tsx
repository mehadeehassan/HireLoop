'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';

type PasswordResetFormProps =
  | { mode: 'request' }
  | { mode: 'reset'; token: string | null; invalidToken: boolean };

const fieldClass =
  'h-12 w-full rounded-[10px] border border-white/9 bg-[#17171d] px-4 text-sm outline-none transition placeholder:text-[#696a77] focus:border-[#6258ff]';
const buttonClass =
  'h-12 w-full rounded-[10px] bg-[#6258ff] text-sm font-semibold text-white transition hover:bg-[#7168ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#777bff] disabled:cursor-not-allowed disabled:opacity-60';

export default function PasswordResetForm(props: PasswordResetFormProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);
  const resetToken = props.mode === 'reset' ? props.token : null;

  async function handleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: new URL('/reset-password', window.location.origin).toString(),
      });
      if (result.error) {
        const message = 'We could not process your request right now. Please try again later.';
        setError(message);
        toast.error(message);
        return;
      }
      setMessage('If an account exists for this email, a password reset link will be sent shortly.');
    } catch {
      const message = 'We could not process your request right now. Please try again later.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetToken) {
      setError('This reset link is invalid or has expired. Request a new one to continue.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token: resetToken,
      });
      if (result.error) {
        const message = 'This reset link is invalid or has expired. Request a new one to continue.';
        setError(message);
        toast.error(message);
        return;
      }
      setCompleted(true);
      toast.success('Your password has been reset.');
    } catch {
      const message = 'This reset link is invalid or has expired. Request a new one to continue.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const isRequest = props.mode === 'request';
  const invalidToken = props.mode === 'reset' && (props.invalidToken || !props.token);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#08080a] px-4 py-8 text-[#ededf3]">
      <section className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#101014] p-6 shadow-2xl sm:p-8">
        <Link href="/" className="text-sm font-semibold tracking-wide text-[#aaa5ff]">
          HireLoop
        </Link>
        <p className="mt-8 text-xs font-medium uppercase tracking-[0.16em] text-[#777bff]">
          Account security
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {isRequest ? 'Forgot your password?' : 'Set a new password'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#9899a9]">
          {isRequest
            ? 'Enter the email address associated with your account and we will send a reset link if it exists.'
            : 'Choose a new password for your HireLoop account.'}
        </p>

        {props.mode === 'reset' && invalidToken ? (
          <div role="alert" className="mt-6 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] p-3 text-xs leading-5 text-amber-200">
            This reset link is invalid or has expired. Request a new one to continue.
          </div>
        ) : null}

        {completed ? (
          <div role="status" className="mt-6 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] p-4 text-sm text-emerald-200">
            Your password has been reset. You can now sign in with your new password.
          </div>
        ) : isRequest ? (
          <form onSubmit={handleRequest} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-medium text-[#c8c8d0]">Email address</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError('');
                  setMessage('');
                }}
                placeholder="you@example.com"
                className={fieldClass}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'password-reset-error' : undefined}
              />
            </label>
            {error ? <p id="password-reset-error" role="alert" className="text-xs text-red-300">{error}</p> : null}
            {message ? <p role="status" className="text-xs leading-5 text-emerald-200">{message}</p> : null}
            <button type="submit" disabled={loading} className={buttonClass}>
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        ) : props.mode === 'reset' && props.token && !invalidToken ? (
          <form onSubmit={handleReset} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-medium text-[#c8c8d0]">New password</span>
              <input
                type="password"
                name="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError('');
                }}
                placeholder="At least 8 characters"
                className={fieldClass}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'password-reset-error' : undefined}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-medium text-[#c8c8d0]">Confirm new password</span>
              <input
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setError('');
                }}
                placeholder="Enter your new password again"
                className={fieldClass}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'password-reset-error' : undefined}
              />
            </label>
            {error ? <p id="password-reset-error" role="alert" className="text-xs text-red-300">{error}</p> : null}
            <button type="submit" disabled={loading} className={buttonClass}>
              {loading ? 'Updating...' : 'Reset password'}
            </button>
          </form>
        ) : null}

        <p className="mt-6 text-center text-sm text-[#9899a9]">
          Remembered your password?{' '}
          <Link href="/signin" className="font-semibold text-[#777bff]">
            Sign in
          </Link>
        </p>
        {!isRequest && !invalidToken && !completed ? (
          <p className="mt-3 text-center text-xs text-[#9899a9]">
            Need a new link?{' '}
            <Link href="/forgot-password" className="font-semibold text-[#777bff]">
              Request password reset
            </Link>
          </p>
        ) : null}
      </section>
    </main>
  );
}
