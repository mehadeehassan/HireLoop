'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type Verification = {
  paymentStatus: string;
  subscriptionActivated: boolean;
  role: 'seeker' | 'recruiter';
  subscription: { plan: string; expiryDate: string | null } | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export default function PaymentSuccessStatus() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [verification, setVerification] = useState<Verification | null>(null);
  const [error, setError] = useState('');
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    const checkoutSessionId = sessionId;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function verify(attempt: number) {
      try {
        const response = await fetch(
          `/api/billing/checkout-session/${encodeURIComponent(checkoutSessionId)}`,
          { cache: 'no-store' },
        );
        const result: unknown = await response.json();
        if (!response.ok || !isRecord(result)) {
          throw new Error(
            isRecord(result) && typeof result.error === 'string'
              ? result.error
              : 'Payment verification is unavailable.',
          );
        }
        if (cancelled) return;
        if (
          result.paymentStatus === 'succeeded' &&
          result.subscriptionActivated === true &&
          (result.role === 'seeker' || result.role === 'recruiter')
        ) {
          const subscription =
            isRecord(result.subscription) &&
            typeof result.subscription.plan === 'string' &&
            (typeof result.subscription.expiryDate === 'string' ||
              result.subscription.expiryDate === null)
              ? {
                  plan: result.subscription.plan,
                  expiryDate: result.subscription.expiryDate,
                }
              : null;
          setVerification({
            paymentStatus: 'succeeded',
            subscriptionActivated: true,
            role: result.role,
            subscription,
          });
          return;
        }
        if (result.paymentStatus === 'cancelled' || result.paymentStatus === 'failed') {
          setError('The payment was not completed. Your current plan has not changed.');
          return;
        }
        if (attempt >= 19) {
          setTimedOut(true);
          return;
        }
        timer = setTimeout(() => void verify(attempt + 1), 3000);
      } catch (verificationError) {
        if (cancelled) return;
        setError(
          verificationError instanceof Error
            ? verificationError.message
            : 'Payment verification is unavailable.',
        );
      }
    }

    void verify(0);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId]);

  const visibleError =
    error ||
    (!sessionId
      ? 'The Checkout session is missing. Return to your dashboard and check your billing status.'
      : '');
  const dashboardUrl =
    verification?.role === 'seeker' ? '/dashboard/seeker/billing' : '/dashboard/recruiter';

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#08080b] px-4 py-12 text-white">
      <section className="w-full max-w-lg rounded-2xl border border-[#29292f] bg-[#131316] p-7 text-center shadow-[0_24px_100px_rgba(0,0,0,.4)] sm:p-10">
        {verification ? (
          <>
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/15 text-3xl text-emerald-400" aria-hidden="true">
              ✓
            </div>
            <p className="mt-6 text-[10px] font-semibold uppercase tracking-[.2em] text-emerald-300">
              Payment confirmed
            </p>
            <h1 className="mt-3 text-2xl font-semibold">Your plan is active</h1>
            <p className="mt-3 text-sm leading-6 text-[#a2a2ab]">
              {verification.subscription?.plan || 'Your subscription'} is active. Usage limits and billing details have been updated.
            </p>
            {verification.subscription?.expiryDate && (
              <p className="mt-3 text-xs text-[#85858e]">
                Current period ends {new Date(verification.subscription.expiryDate).toLocaleDateString()}
              </p>
            )}
            <Link
              href={dashboardUrl}
              className="mt-8 inline-flex h-11 items-center justify-center rounded-md bg-[#6258ff] px-6 text-xs font-semibold hover:bg-[#7168ff]"
            >
              {verification.role === 'seeker' ? 'View billing details' : 'Go to recruiter dashboard'}
            </Link>
          </>
        ) : visibleError ? (
          <>
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-amber-500/10 text-2xl text-amber-300" aria-hidden="true">
              !
            </div>
            <h1 className="mt-6 text-2xl font-semibold">Payment not confirmed</h1>
            <p role="alert" className="mt-3 text-sm leading-6 text-[#a2a2ab]">{visibleError}</p>
            <Link href="/dashboard" className="mt-8 inline-flex h-11 items-center rounded-md border border-[#303036] px-6 text-xs hover:bg-white/5">
              Return to dashboard
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto size-11 animate-spin rounded-full border-2 border-white/10 border-t-[#8178ff]" aria-hidden="true" />
            <h1 className="mt-6 text-2xl font-semibold">
              {timedOut ? 'Confirmation is taking longer than usual' : 'Confirming your payment'}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#a2a2ab]">
              {timedOut
                ? 'Your payment provider is processing the confirmation. Your plan will update as soon as the verified confirmation arrives. You can safely check your billing page.'
                : 'We are waiting for secure confirmation from Stripe. This may take a few moments.'}
            </p>
            {timedOut && (
              <Link href="/dashboard" className="mt-8 inline-flex h-11 items-center rounded-md border border-[#303036] px-6 text-xs hover:bg-white/5">
                Return to dashboard
              </Link>
            )}
          </>
        )}
      </section>
    </main>
  );
}
