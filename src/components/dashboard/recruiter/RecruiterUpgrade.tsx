'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { useState } from 'react';
import RecruiterPageHeader from './RecruiterPageHeader';

const plans = [
  {
    name: 'Starter',
    monthlyPrice: 0,
    description: 'Core tools to get started with hiring.',
    features: [
      'Up to 5 job posts each month',
      'Review applicants',
      'Manage your hiring workflow',
    ],
  },
  {
    name: 'Growth',
    monthlyPrice: 17,
    description: 'Advanced tools to help your team hire more efficiently.',
    features: [
      'Higher monthly job posting limit',
      'Advanced applicant management tools',
      'Detailed hiring analytics',
      'Priority support for your hiring team',
    ],
    popular: true,
  },
  {
    name: 'Premium',
    monthlyPrice: 99,
    description: 'A complete hiring toolkit for teams scaling their recruiting.',
    features: [
      'Everything in Growth',
      'Highest monthly job posting limit',
      'Multi-role hiring workflows',
      'Advanced team collaboration',
      'Priority support for your hiring team',
    ],
  },
];

type BillingPeriod = 'monthly' | 'yearly';

function formatPrice(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export default function RecruiterUpgrade() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <RecruiterPageHeader
        eyebrow="Plans"
        title="Choose a recruiter plan"
        description="Compare the available plans and choose the one that fits your hiring needs."
      />

      <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
        <div className="inline-flex items-center rounded-full border border-[#252d43] bg-[#111827] p-1" role="group" aria-label="Billing period">
          {(['monthly', 'yearly'] as const).map((period) => (
            <button
              key={period}
              type="button"
              aria-pressed={billingPeriod === period}
              onClick={() => setBillingPeriod(period)}
              className={`min-h-9 rounded-full px-4 text-[11px] capitalize transition ${
                billingPeriod === period ? 'bg-white text-[#151517]' : 'text-[#c5ccda] hover:bg-white/5'
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

      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <section
            key={plan.name}
            className={`flex flex-col rounded-xl border bg-[#111827]/70 p-6 sm:p-8 ${
              plan.popular
                ? 'border-[#6258ff]/40 shadow-[0_20px_70px_rgba(27,25,82,.2)]'
                : 'border-[#252d43]'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="rounded-full bg-[#6258ff]/15 px-3 py-1 text-[10px] font-medium text-[#b8b2ff]">
                  Recruiter plan
                </span>
                <h2 className="mt-4 text-2xl font-semibold text-white">{plan.name}</h2>
              </div>
              {plan.popular && (
                <span className="rounded-full border border-[#6258ff]/30 px-3 py-1.5 text-[10px] text-[#b8b2ff]">
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
                <span className="ml-1 text-[10px] font-normal text-[#9ba4b7]">/month</span>
              )}
            </p>
            {billingPeriod === 'yearly' && plan.monthlyPrice > 0 && (
              <p className="mt-1 text-[10px] text-[#9ba4b7]">
                ${formatPrice(plan.monthlyPrice * 0.75 * 12)} billed yearly
              </p>
            )}
            <p className="mt-2 min-h-10 text-xs leading-5 text-[#9ba4b7]">{plan.description}</p>

            <ul className="mt-6 flex-1 space-y-3 border-t border-[#252d43] pt-6">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-xs text-[#d7dbea]">
                  <span
                    className="flex size-5 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] text-emerald-400"
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
              className={`mt-7 h-10 rounded-md px-5 text-[11px] font-semibold transition ${
                plan.popular
                  ? 'bg-[#6258ff] text-white hover:bg-[#7168ff]'
                  : 'border border-[#303a55] text-[#c5ccda] hover:bg-white/5'
              }`}
            >
              {plan.monthlyPrice === 0 ? 'Choose Starter' : `Purchase ${plan.name}`}
            </button>
          </section>
        ))}
      </div>

      <p className="mx-auto mt-5 max-w-5xl rounded-lg border border-amber-400/15 bg-amber-400/[0.04] p-3 text-[10px] leading-5 text-amber-200/80">
        Plan checkout is not connected. Paid plans are activated only after trusted backend
        provisioning; monthly limits are configurable. No plan will be changed and no payment will
        be taken here.
      </p>

      <Link
        href="/dashboard/recruiter"
        className="mt-5 inline-flex h-10 items-center rounded-md border border-[#303a55] px-4 text-[11px] text-[#c5ccda] transition hover:bg-white/5"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
