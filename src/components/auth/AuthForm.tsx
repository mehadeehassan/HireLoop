/* eslint-disable @next/next/no-location-assign-relative-destination */
'use client';

import { authClient } from '@/lib/auth-client';
import type { PublicPlatformSettings } from '@/lib/platform-settings';
import Image from 'next/image';
import Link from 'next/link';
import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FieldError, useFormValidation } from '@/components/form/useFormValidation';

type AuthFormProps = {
  mode: 'signin' | 'signup';
  platform?: PublicPlatformSettings;
  verificationResult?: 'success' | 'expired' | 'invalid';
};

type SignupIntent = 'seeker' | 'recruiter';

function getCallbackUrl(fallback = '/') {
  const callbackUrl = new URLSearchParams(window.location.search).get('callbackUrl');
  if (!callbackUrl || !callbackUrl.startsWith('/') || callbackUrl.startsWith('//')) {
    return fallback;
  }
  try {
    return new URL(callbackUrl, window.location.origin).origin === window.location.origin
      ? callbackUrl
      : fallback;
  } catch {
    return fallback;
  }
}

export default function AuthForm({ mode, platform, verificationResult }: AuthFormProps) {
  const isSignUp = mode === 'signup';
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [credentialError, setCredentialError] = useState('');
  const [emailVerificationError, setEmailVerificationError] = useState(false);
  const [emailValue, setEmailValue] = useState('');
  const [checkEmailAddress, setCheckEmailAddress] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendError, setResendError] = useState('');
  const [signupIntent, setSignupIntent] = useState<SignupIntent>('seeker');
  const { errors, validateForm, updateFieldError } = useFormValidation();
  const seekerEnabled = platform?.registration.seekerEnabled ?? true;
  const recruiterEnabled = platform?.registration.recruiterEnabled ?? true;
  const selectedIntentEnabled =
    signupIntent === 'seeker' ? seekerEnabled : recruiterEnabled;
  const registrationDisabled = !seekerEnabled && !recruiterEnabled;

  useEffect(() => {
    if (resendCooldown === 0) return;
    const timer = window.setTimeout(
      () => setResendCooldown((remaining) => Math.max(remaining - 1, 0)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  function handleFormChange(event: ChangeEvent<HTMLFormElement>) {
    updateFieldError(event);
    const field = event.target;
    if (
      field instanceof HTMLInputElement &&
      (field.name === 'email' || field.name === 'password')
    ) {
      setCredentialError('');
      setEmailVerificationError(false);
    }
    if (field instanceof HTMLInputElement && field.name === 'email') {
      setEmailValue(field.value);
    }
  }

  async function resendVerificationEmail(email: string) {
    if (!email || resendLoading || resendCooldown > 0) return;
    setResendLoading(true);
    setResendMessage('');
    setResendError('');
    try {
      const result = await authClient.sendVerificationEmail({
        email,
        callbackURL: '/signin?verification=success',
      });
      if (result.error) {
        setResendError('We could not send a link right now. Please try again later.');
        return;
      }
      setResendMessage(
        'If this address has an unverified account, a verification link will be sent shortly.',
      );
    } catch {
      setResendError('We could not send a link right now. Please try again later.');
    } finally {
      setResendCooldown(60);
      setResendLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateForm(event.currentTarget)) return;
    setCredentialError('');
    setEmailVerificationError(false);
    setLoading(true);
    const toastId = toast.loading(isSignUp ? 'Creating your account...' : 'Signing you in...');

    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');
    const name = String(form.get('name') ?? '');
    const submittedIntent = String(form.get('signupIntent') ?? 'seeker');

    try {
      const result = isSignUp
        ? await authClient.signUp.email({
            email,
            password,
            name,
            signupIntent: submittedIntent,
            callbackURL: '/signin?verification=success',
          })
        : await authClient.signIn.email({
            email,
            password,
            callbackURL: getCallbackUrl(verificationResult === 'success' ? '/dashboard' : '/'),
          });

      if (result.error) {
        const invalidCredentials =
          !isSignUp &&
          (result.error.status === 401 || result.error.code === 'INVALID_EMAIL_OR_PASSWORD');
        const emailNotVerified = !isSignUp && result.error.code === 'EMAIL_NOT_VERIFIED';
        const message = invalidCredentials
          ? 'Email or password is incorrect.'
          : emailNotVerified
            ? 'Please verify your email before signing in.'
            : result.error.message || 'Something went wrong. Please try again.';
        if (invalidCredentials) setCredentialError(message);
        if (emailNotVerified) {
          setEmailVerificationError(true);
          setResendEmail(email);
          setResendCooldown(60);
          setResendMessage('');
          setResendError('');
        }
        toast.dismiss(toastId);
        toast.error(message);
      } else if (isSignUp) {
        setCheckEmailAddress(email);
        setResendEmail(email);
        setResendCooldown(60);
        toast.success('Check your email for a verification link, if one is needed.', {
          id: toastId,
        });
      } else {
        toast.success('Welcome back!', { id: toastId });
        window.location.href = getCallbackUrl(verificationResult === 'success' ? '/dashboard' : '/');
      }
    } catch {
      toast.dismiss(toastId);
      toast.error('Unable to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    const toastId = toast.loading('Connecting to Google...');

    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: isSignUp
          ? '/dashboard'
          : getCallbackUrl(verificationResult === 'success' ? '/dashboard' : '/'),
        ...(isSignUp ? { additionalData: { signupIntent } } : {}),
      });
      toast.dismiss(toastId);
    } catch {
      toast.error('Google sign-in failed. Please try again.', {
        id: toastId,
      });
    }
  }

  const passwordError = credentialError || errors.password;

  return (
    <main className="min-h-screen bg-[#08080a] px-4 py-4 text-[#ededf3] sm:px-6 sm:py-6 lg:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-32px)] max-w-7xl overflow-hidden rounded-[18px] border border-white/6 bg-[#101014] lg:min-h-[calc(100vh-48px)] lg:grid-cols-[1fr_0.92fr]">
        <section className="flex min-h-145 flex-col px-5 py-6 sm:px-10 lg:min-h-0 lg:px-14 xl:px-20">
          <Link href="/" aria-label={`${platform?.branding.name ?? 'HireLoop'} home`}>
            <Image
              src={platform?.branding.logo || '/images/logo.png'}
              alt={platform?.branding.name ?? 'HireLoop'}
              width={154}
              height={44}
              className="h-11 w-38.5"
              priority
              unoptimized={Boolean(platform?.branding.logo)}
            />
          </Link>

          <div
            className={`mx-auto flex w-full ${
              isSignUp ? 'max-w-140' : 'max-w-105'
            } flex-1 flex-col justify-center py-10`}
          >
            {checkEmailAddress ? (
              <section
                role="status"
                aria-live="polite"
                className="rounded-xl border border-[#777bff]/25 bg-[#777bff]/[0.07] p-5 sm:p-6"
              >
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#aaa5ff]">
                  Email verification
                </p>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight">Check your email</h1>
                <p className="mt-3 text-sm leading-6 text-[#c2c2d0]">
                  If verification is needed, we will send a link to{' '}
                  <span className="font-semibold text-white">{checkEmailAddress}</span>. Open it to
                  verify your email, then sign in. If you need another link, request a fresh one
                  below.
                </p>
                <button
                  type="button"
                  onClick={() => void resendVerificationEmail(checkEmailAddress)}
                  disabled={resendLoading || resendCooldown > 0}
                  className="mt-5 h-11 w-full rounded-[10px] border border-white/10 bg-white/[0.04] text-sm font-semibold text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {resendLoading
                    ? 'Sending...'
                    : resendCooldown > 0
                      ? `Resend available in ${resendCooldown}s`
                      : 'Resend verification email'}
                </button>
                {resendMessage ? (
                  <p role="status" className="mt-3 text-xs leading-5 text-emerald-200">
                    {resendMessage}
                  </p>
                ) : null}
                {resendError ? (
                  <p role="alert" className="mt-3 text-xs leading-5 text-red-300">
                    {resendError}
                  </p>
                ) : null}
                <p className="mt-5 text-center text-sm text-[#9899a9]">
                  Already verified?{' '}
                  <Link href="/signin" className="font-semibold text-[#aaa5ff]">
                    Return to sign in
                  </Link>
                </p>
              </section>
            ) : (
              <>
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-[#777bff]">
              {isSignUp ? 'Create account' : 'Welcome back'}
            </p>
            <h1 className="font-sans text-[32px] font-semibold leading-[1.1] tracking-[-1.2px] sm:text-[40px]">
              {isSignUp
                ? 'Start your next opportunity'
                : `Sign in to ${platform?.branding.name ?? 'HireLoop'}`}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#9899a9]">
              {isSignUp
                ? 'Create an account and discover roles matched to your skills.'
                : 'Continue your job search and manage your applications.'}
            </p>

            {verificationResult ? (
              <div
                role={verificationResult === 'success' ? 'status' : 'alert'}
                className={`mt-5 rounded-[10px] border px-4 py-3 text-xs leading-5 ${
                  verificationResult === 'success'
                    ? 'border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-200'
                    : 'border-amber-400/25 bg-amber-400/[0.07] text-amber-200'
                }`}
              >
                {verificationResult === 'success'
                  ? 'Your email is verified. Sign in to continue.'
                  : verificationResult === 'expired'
                    ? 'This verification link has expired. Enter your email below to request a new link.'
                    : 'This verification link is invalid or has already been used. Enter your email below to request a new link.'}
              </div>
            ) : null}

            {isSignUp && registrationDisabled ? (
              <div
                role="status"
                className="mt-6 rounded-[10px] border border-amber-400/25 bg-amber-400/[0.08] px-4 py-3 text-xs leading-5 text-amber-200"
              >
                New account registration is currently disabled by the platform
                administrator. Existing accounts can still sign in.
              </div>
            ) : null}

            {isSignUp && (
              <fieldset
                role="radiogroup"
                aria-labelledby="signup-intent-label"
                className="mt-5 grid w-full grid-cols-2 gap-2.5"
              >
                <legend
                  id="signup-intent-label"
                  className="col-span-2 mb-1 text-sm font-semibold tracking-[-0.2px] text-[#e7e7ef]"
                >
                  I am signing up as
                </legend>
                {([
                  {
                    value: 'seeker',
                    title: 'Job Seeker',
                    description: 'Discover roles and manage your applications.',
                    enabled: seekerEnabled,
                  },
                  {
                    value: 'recruiter',
                    title: 'Recruiter',
                    description: 'Post jobs and manage applicants.',
                    enabled: recruiterEnabled,
                  },
                ] as const).map((option) => (
                  <label
                    key={option.value}
                    className={`group relative flex min-h-20 w-full cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border p-2.5 text-center transition-all duration-200 focus-within:outline-none focus-within:ring-2 focus-within:ring-[#8b85ff]/70 focus-within:ring-offset-2 focus-within:ring-offset-[#101014] ${
                      signupIntent === option.value
                        ? 'border-[#8b85ff]/55 bg-[linear-gradient(115deg,rgba(98,88,255,0.17),rgba(29,28,43,0.9)_48%,rgba(23,23,29,0.95))] shadow-[0_8px_28px_rgba(74,65,194,0.12)]'
                        : 'border-white/[0.09] bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.045]'
                    } ${option.enabled ? '' : 'cursor-not-allowed opacity-45'}`}
                  >
                    <input
                      type="radio"
                      name="signupIntent"
                      form="auth-form"
                      value={option.value}
                      checked={signupIntent === option.value}
                      disabled={!option.enabled}
                      onChange={() => setSignupIntent(option.value)}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={`flex size-7 shrink-0 items-center justify-center rounded-md ring-1 transition-colors ${
                        signupIntent === option.value
                          ? 'bg-[#7770ff]/15 text-[#aaa5ff] ring-[#9b96ff]/20'
                          : 'bg-white/[0.045] text-[#a6a7b5] ring-white/[0.07] group-hover:bg-white/[0.07]'
                      }`}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        {option.value === 'seeker' ? (
                          <>
                            <circle cx="10.5" cy="8" r="3.25" />
                            <path d="M4.5 19v-1a6 6 0 0 1 9.5-4.85" />
                            <circle cx="17.5" cy="17.5" r="3" />
                            <path d="m19.7 19.7 1.8 1.8" />
                          </>
                        ) : (
                          <>
                            <path d="M3 21h18M5 21V6l7-3 7 3v15M9 9h.01M15 9h.01M9 13h.01M15 13h.01M10 21v-4h4v4" />
                          </>
                        )}
                      </svg>
                    </span>
                    <span className="w-full min-w-0">
                      <span className="block text-xs font-semibold tracking-[-0.1px] text-[#f0eff7]">
                        {option.title}
                      </span>
                      <span className="mt-0.5 block text-[10px] leading-3.5 text-[#a4a4b3]">
                        {option.description}
                      </span>
                      {!option.enabled && (
                        <span className="mt-0.5 block text-[9px] leading-3 text-amber-200">
                          New {option.title.toLowerCase()} accounts are currently disabled.
                        </span>
                      )}
                    </span>
                  </label>
                ))}
                <p className="col-span-2 pt-0.5 text-[10px] leading-4 text-[#8f909f]">
                  Choose the account type that fits how you’ll use HireLoop.
                </p>
              </fieldset>
            )}

            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={isSignUp && !selectedIntentEnabled}
              className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-[10px] border border-white/9 bg-[#17171d] text-sm font-medium transition hover:bg-[#1d1d24] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#777bff] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M17.64 9.2c0-.63-.06-1.23-.16-1.8H9v3.4h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.56 2.69-3.87 2.69-6.58Z"
                />
                <path
                  fill="#34A853"
                  d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18Z"
                />
                <path
                  fill="#FBBC05"
                  d="M3.95 10.7A5.41 5.41 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.03l2.99-2.33Z"
                />
                <path
                  fill="#EA4335"
                  d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.65 8.65 0 0 0 9 0 9 9 0 0 0 .96 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58Z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/[0.07]" />
              <span className="text-xs text-[#777987]">or continue with email</span>
              <div className="h-px flex-1 bg-white/[0.07]" />
            </div>

            <form
              id="auth-form"
              noValidate
              onSubmit={handleSubmit}
              onChangeCapture={handleFormChange}
              className="space-y-4"
            >
              {isSignUp && (
                <label className="block">
                  <span className="mb-2 block text-xs font-medium text-[#c8c8d0]">Full name</span>
                  <input
                    name="name"
                    required
                    minLength={2}
                    autoComplete="name"
                    placeholder="Enter your name"
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? 'auth-name-error' : undefined}
                    className="h-12 w-full rounded-[10px] border border-white/9 bg-[#17171d] px-4 text-sm outline-none transition placeholder:text-[#696a77] focus:border-[#6258ff]"
                  />
                  <FieldError id="auth-name-error" error={errors.name} />
                </label>
              )}

              <label className="block">
                <span className="mb-2 block text-xs font-medium text-[#c8c8d0]">Email address</span>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={emailValue}
                  onChange={(event) => setEmailValue(event.target.value)}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'auth-email-error' : undefined}
                  className="h-12 w-full rounded-[10px] border border-white/9 bg-[#17171d] px-4 text-sm outline-none transition placeholder:text-[#696a77] focus:border-[#6258ff]"
                />
                <FieldError id="auth-email-error" error={errors.email} />
              </label>

              <label className="block">
                {!isSignUp && (
                  <span className="mb-2 flex items-center justify-between text-xs font-medium text-[#c8c8d0]">
                    Password
                    <Link href="/forgot-password" className="font-normal text-[#777bff]">
                      Forgot password?
                    </Link>
                  </span>
                )}
                {isSignUp && (
                  <span className="mb-2 block text-xs font-medium text-[#c8c8d0]">Password</span>
                )}
                <span className="relative block">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    placeholder="At least 8 characters"
                    aria-invalid={Boolean(passwordError)}
                    aria-describedby={passwordError ? 'auth-password-error' : undefined}
                    className="h-12 w-full rounded-[10px] border border-white/9 bg-[#17171d] px-4 pr-12 text-sm outline-none transition placeholder:text-[#696a77] focus:border-[#6258ff]"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#777987]"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    >
                      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                      <circle cx="12" cy="12" r="2.5" />
                    </svg>
                  </button>
                </span>
                <FieldError id="auth-password-error" error={passwordError} />
              </label>

              <button
                type="submit"
                disabled={loading || (isSignUp && !selectedIntentEnabled)}
                className="h-12 w-full rounded-[10px] bg-[#6258ff] text-sm font-semibold text-white shadow-[inset_0_3px_10px_rgba(255,255,255,0.16)] transition hover:bg-[#7168ff] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
              </button>
            </form>

            {emailVerificationError ? (
              <p role="alert" className="mt-4 text-xs leading-5 text-amber-200">
                Please verify your email before signing in. A verification link was sent if the
                account is eligible.
              </p>
            ) : null}

            {!isSignUp &&
            (resendEmail || verificationResult === 'expired' || verificationResult === 'invalid') ? (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => void resendVerificationEmail(emailValue || resendEmail)}
                  disabled={!emailValue && !resendEmail || resendLoading || resendCooldown > 0}
                  className="text-left text-xs font-semibold text-[#aaa5ff] underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {resendLoading
                    ? 'Sending verification link...'
                    : resendCooldown > 0
                      ? `Resend available in ${resendCooldown}s`
                      : 'Resend verification email'}
                </button>
                {resendMessage ? (
                  <p role="status" className="mt-2 text-xs leading-5 text-emerald-200">
                    {resendMessage}
                  </p>
                ) : null}
                {resendError ? (
                  <p role="alert" className="mt-2 text-xs leading-5 text-red-300">
                    {resendError}
                  </p>
                ) : null}
              </div>
            ) : null}

            <p className="mt-6 text-center text-sm text-[#9899a9]">
              {isSignUp
                ? 'Already have an account?'
                : `New to ${platform?.branding.name ?? 'HireLoop'}?`}{' '}
              <Link
                href={isSignUp ? '/signin' : '/signup'}
                onClick={(event) => {
                  const callbackUrl = new URLSearchParams(window.location.search).get('callbackUrl');
                  if (callbackUrl) {
                    event.preventDefault();
                    window.location.href = `${isSignUp ? '/signin' : '/signup'}?callbackUrl=${encodeURIComponent(callbackUrl)}`;
                  }
                }}
                className="font-semibold text-[#777bff]"
              >
                {isSignUp ? 'Sign in' : 'Create account'}
              </Link>
            </p>
              </>
            )}
          </div>
        </section>

        <aside className="relative hidden min-h-160 overflow-hidden bg-[#17182f] lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_68%,rgba(98,88,255,0.42),transparent_38%),linear-gradient(145deg,#111225,#242759)]" />
          <div className="absolute left-1/2 top-[58%] h-130 w-130 -translate-x-1/2 rounded-t-[260px] border border-[#6974ff]/20 bg-[radial-gradient(circle_at_50%_70%,rgba(104,98,255,0.75),rgba(35,38,111,0.9)_55%,rgba(13,15,52,1)_76%)] shadow-[0_-20px_100px_rgba(98,88,255,0.18)]" />
          <div className="relative z-10 flex h-full flex-col justify-end px-12 pb-16">
            <p className="max-w-105 text-[28px] font-medium leading-9 tracking-[-0.8px] text-[#c5c9f2]">
              {isSignUp
                ? 'Find a role where your talent can grow.'
                : 'Your dream role is closer than you think.'}
            </p>
            <p className="mt-3 max-w-105 text-sm leading-6 text-[#8f92b4]">
              Join thousands of professionals discovering curated opportunities every day.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
