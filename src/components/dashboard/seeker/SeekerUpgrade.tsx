'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { useState } from 'react';
import SeekerPageHeader from './SeekerPageHeader';

const plans = [
  {
    name: 'Starter',
    monthlyPrice: 0,
    description: 'Get started with the essentials for your job search.',
    features: [
      'Up to 5 job applications each month',
      'Daily AI match brief (top 5)',
      'Verified salary bands',
      'Company insight dashboards',
    ],
  },
  {
    name: 'Growth',
    monthlyPrice: 17,
    description: 'Build your insights hub and find the right opportunities.',
    features: [
      'Higher monthly application limit',
      'Daily AI match brief (top 5)',
      'Verified salary bands',
      'Company insight dashboards',
    ],
    popular: true,
  },
  {
    name: 'Premium',
    monthlyPrice: 99,
    description: 'Get more ways to showcase your career and connect with teams.',
    features: [
      'Everything in Growth',
      'Highest monthly application limit',
      'Multi-profile career portfolios',
      'Shared talent rooms',
      'Recruiter view (read-only)',
    ],
  },
];

type BillingPeriod = 'monthly' | 'yearly';

function formatPrice(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export default function SeekerUpgrade() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-7">
      <SeekerPageHeader
        title="Choose a seeker plan"
        description="Compare all available plans and choose what works for your job search."
      />

      <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
        <div className="inline-flex items-center rounded-full border border-[#303036] bg-[#131316] p-1" role="group" aria-label="Billing period">
          {(['monthly', 'yearly'] as const).map((period) => (
            <button
              key={period}
              type="button"
              aria-pressed={billingPeriod === period}
              onClick={() => setBillingPeriod(period)}
              className={`min-h-9 rounded-full px-4 text-[11px] capitalize transition ${
                billingPeriod === period ? 'bg-white text-[#151517]' : 'text-[#dedee3] hover:bg-white/5'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
        <span className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-[10px] text-emerald-300">
          Yearly saves 25%
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <section
            key={plan.name}
            className={`flex flex-col rounded-xl border bg-[#131316] p-5 sm:p-6 ${
              plan.popular
                ? 'border-[#8178ff]/40 shadow-[0_20px_70px_rgba(27,25,82,.2)]'
                : 'border-[#26262b]'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="rounded-full bg-[#8178ff]/15 px-3 py-1 text-[10px] font-medium text-[#c2bdff]">
                  Seeker plan
                </span>
                <h2 className="mt-4 text-xl font-semibold text-white">{plan.name}</h2>
              </div>
              {plan.popular && (
                <span className="rounded-full border border-[#8178ff]/30 px-3 py-1.5 text-[10px] text-[#c2bdff]">
                  Popular
                </span>
              )}
            </div>
            <p className="mt-4 text-2xl font-semibold text-white">
              {plan.monthlyPrice === 0
                ? 'Free'
                : `$${formatPrice(
                    billingPeriod === 'yearly' ? plan.monthlyPrice * 0.75 : plan.monthlyPrice,
                  )}`}
              {plan.monthlyPrice > 0 && (
                <span className="ml-1 text-[10px] font-normal text-[#92929b]">/month</span>
              )}
            </p>
            {billingPeriod === 'yearly' && plan.monthlyPrice > 0 && (
              <p className="mt-1 text-[10px] text-[#92929b]">
                ${formatPrice(plan.monthlyPrice * 0.75 * 12)} billed yearly
              </p>
            )}
            <p className="mt-2 min-h-10 text-xs leading-5 text-[#a2a2ab]">{plan.description}</p>

            <ul className="mt-5 flex-1 space-y-3 border-t border-[#26262b] pt-5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-xs text-[#dedee3]">
                  <span
                    className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] text-emerald-400"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() =>
                toast.info(
                  plan.monthlyPrice === 0
                    ? 'Starter plan selected. Plan changes are not connected yet.'
                    : `${plan.name} ${billingPeriod} plan selected at $${
                        billingPeriod === 'yearly'
                          ? formatPrice(plan.monthlyPrice * 0.75 * 12)
                          : formatPrice(plan.monthlyPrice)
                      }${billingPeriod === 'yearly' ? '/year' : '/month'}. Checkout is not connected; no payment has been made.`,
                )
              }
              className={`mt-6 h-10 rounded-md px-5 text-[11px] font-semibold transition ${
                plan.popular
                  ? 'bg-[#6258ff] text-white hover:bg-[#7168ff]'
                  : 'border border-[#303036] text-[#dedee3] hover:bg-white/5'
              }`}
            >
              {plan.monthlyPrice === 0 ? 'Choose Starter' : `Purchase ${plan.name}`}
            </button>
          </section>
        ))}
      </div>

      <p className="mt-5 rounded-lg border border-amber-400/15 bg-amber-400/[0.04] p-3 text-[10px] leading-5 text-amber-200/80">
        Plan checkout is not connected. Paid plans are activated only after trusted backend
        provisioning; monthly limits are configurable. No plan will be changed and no payment will
        be taken here.
      </p>

      <Link
        href="/dashboard/seeker"
        className="mt-5 inline-flex h-10 items-center rounded-md border border-[#303036] px-4 text-[11px] text-[#dedee3] transition hover:bg-white/5"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
