/* eslint-disable @next/next/no-location-assign-relative-destination */
'use client';

import { authClient } from '@/lib/auth-client';
import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { toast } from 'sonner';

type AuthFormProps = {
  mode: 'signin' | 'signup';
};

type UserRole = 'seeker' | 'recruiter' | 'admin';

function getCallbackUrl() {
  const callbackUrl = new URLSearchParams(window.location.search).get('callbackUrl');
  if (!callbackUrl || !callbackUrl.startsWith('/') || callbackUrl.startsWith('//')) return '/';
  return callbackUrl;
}

export default function AuthForm({ mode }: AuthFormProps) {
  const isSignUp = mode === 'signup';
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<UserRole>('seeker');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const toastId = toast.loading(isSignUp ? 'Creating your account...' : 'Signing you in...');

    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');
    const name = String(form.get('name') ?? '');

    try {
      const result = isSignUp
        ? await authClient.signUp.email({ email, password, name, role })
        : await authClient.signIn.email({ email, password });

      if (result.error) {
        toast.error(result.error.message || 'Something went wrong. Please try again.', {
          id: toastId,
        });
      } else {
        toast.success(isSignUp ? 'Account created successfully!' : 'Welcome back!', {
          id: toastId,
        });
        window.location.href = getCallbackUrl();
      }
    } catch {
      toast.error('Unable to connect. Please try again.', {
        id: toastId,
      });
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    const toastId = toast.loading('Connecting to Google...');

    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: getCallbackUrl(),
      });
      toast.dismiss(toastId);
    } catch {
      toast.error('Google sign-in failed. Please try again.', {
        id: toastId,
      });
    }
  }

  return (
    <main className="min-h-screen bg-[#08080a] px-4 py-4 text-[#ededf3] sm:px-6 sm:py-6 lg:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-32px)] max-w-7xl overflow-hidden rounded-[18px] border border-white/6 bg-[#101014] lg:min-h-[calc(100vh-48px)] lg:grid-cols-[1fr_0.92fr]">
        <section className="flex min-h-145 flex-col px-5 py-6 sm:px-10 lg:min-h-0 lg:px-14 xl:px-20">
          <Link href="/" aria-label="Hireloop home">
            <Image
              src="/images/logo.png"
              alt="Hireloop"
              width={154}
              height={44}
              className="h-11 w-38.5"
              priority
            />
          </Link>

          <div className="mx-auto flex w-full max-w-105 flex-1 flex-col justify-center py-10">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-[#777bff]">
              {isSignUp ? 'Create account' : 'Welcome back'}
            </p>
            <h1 className="font-sans text-[32px] font-semibold leading-[1.1] tracking-[-1.2px] sm:text-[40px]">
              {isSignUp ? 'Start your next opportunity' : 'Sign in to Hireloop'}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#9899a9]">
              {isSignUp
                ? 'Create an account and discover roles matched to your skills.'
                : 'Continue your job search and manage your applications.'}
            </p>

            <button
              type="button"
              onClick={signInWithGoogle}
              className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-[10px] border border-white/9 bg-[#17171d] text-sm font-medium transition hover:bg-[#1d1d24]"
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

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <fieldset>
                  <legend className="mb-2 block text-xs font-medium text-[#c8c8d0]">
                    Joining HireLoop as
                  </legend>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        [
                          'seeker',
                          'Seeker',
                          <svg
                            key="seeker"
                            width="17"
                            height="17"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <circle cx="12" cy="8" r="3.5" />
                            <path d="M5.5 21v-1.5a6.5 6.5 0 0 1 13 0V21" />
                          </svg>,
                        ],
                        [
                          'recruiter',
                          'Recruiter',
                          <svg
                            key="recruiter"
                            width="17"
                            height="17"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <rect x="3" y="7" width="18" height="13" rx="2" />
                            <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7M3 12h18M10 12v2h4v-2" />
                          </svg>,
                        ],
                        [
                          'admin',
                          'Admin',
                          <svg
                            key="admin"
                            width="17"
                            height="17"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3Z" />
                            <path d="m9 12 2 2 4-4" />
                          </svg>,
                        ],
                      ] as const
                    ).map(([value, label, icon]) => (
                      <label
                        key={value}
                        className={`flex h-12 cursor-pointer items-center justify-center gap-2 rounded-[10px] border text-xs font-medium transition ${
                          role === value
                            ? 'border-[#6258ff] bg-[#6258ff]/15 text-[#a8a4ff]'
                            : 'border-white/9 bg-[#17171d] text-[#9899a9] hover:border-white/20 hover:text-[#c8c8d0]'
                        }`}
                      >
                        <input
                          className="sr-only"
                          type="radio"
                          name="role"
                          value={value}
                          checked={role === value}
                          onChange={() => setRole(value)}
                        />
                        <span className="shrink-0">{icon}</span>
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              {isSignUp && (
                <label className="block">
                  <span className="mb-2 block text-xs font-medium text-[#c8c8d0]">Full name</span>
                  <input
                    name="name"
                    required
                    minLength={2}
                    autoComplete="name"
                    placeholder="Enter your name"
                    className="h-12 w-full rounded-[10px] border border-white/9 bg-[#17171d] px-4 text-sm outline-none transition placeholder:text-[#696a77] focus:border-[#6258ff]"
                  />
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
                  className="h-12 w-full rounded-[10px] border border-white/9 bg-[#17171d] px-4 text-sm outline-none transition placeholder:text-[#696a77] focus:border-[#6258ff]"
                />
              </label>

              <label className="block">
                {!isSignUp && (
                  <span className="mb-2 flex items-center justify-between text-xs font-medium text-[#c8c8d0]">
                    Password
                    <button
                      type="button"
                      onClick={() =>
                        toast.info('Password reset will be available soon.', { duration: 4000 })
                      }
                      className="font-normal text-[#777bff]"
                    >
                      Forgot password?
                    </button>
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
              </label>

              <button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-[10px] bg-[#6258ff] text-sm font-semibold text-white shadow-[inset_0_3px_10px_rgba(255,255,255,0.16)] transition hover:bg-[#7168ff] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[#9899a9]">
              {isSignUp ? 'Already have an account?' : 'New to Hireloop?'}{' '}
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
