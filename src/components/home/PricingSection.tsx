"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/lib/auth-client";

type PricingPlan = {
  name: string;
  monthlyPrice: number;
  features: string[];
  icon: "crown" | "chart" | "bolt";
  popular?: boolean;
};

const plans: PricingPlan[] = [
  {
    name: "Starter",
    monthlyPrice: 0,
    features: [
      "Daily AI match brief (top 5)",
      "Verified salary bands",
      "Company insight dashboards",
      "1-click apply, unlimited",
    ],
    icon: "crown",
  },
  {
    name: "Growth",
    monthlyPrice: 17,
    features: [
      "Daily AI match brief (top 5)",
      "Verified salary bands",
      "Company insight dashboards",
      "1-click apply, unlimited",
    ],
    icon: "chart",
    popular: true,
  },
  {
    name: "Premium",
    monthlyPrice: 99,
    features: [
      "Everything in Pro",
      "Multi-profile career portfolios",
      "Shared talent rooms",
      "Recruiter view (read-only)",
    ],
    icon: "bolt",
  },
];

function PlanIcon({ name }: { name: PricingPlan["icon"] }) {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {name === "crown" && <><path d="m3 8 5 4 4-7 4 7 5-4-2 12H5L3 8Z" /><path d="M8 16h8" /></>}
      {name === "chart" && <><path d="M4 19V5m0 14h16" /><path d="m7 15 4-5 3 2 5-6" /></>}
      {name === "bolt" && <path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z" />}
    </svg>
  );
}

export default function PricingSection() {
  const { data: session, isPending } = useSession();
  const planHref = isPending
    ? "#pricing"
    : session?.user
      ? session.user.role === "seeker"
        ? "/dashboard/seeker/upgrade"
        : session.user.role === "recruiter"
          ? "/dashboard/recruiter/upgrade"
          : "/dashboard"
      : "/signup";
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="scroll-mt-8 bg-black px-4 py-16 sm:px-6 sm:py-20 lg:px-10 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-9 max-w-xl text-center">
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#b8b8c2]">
            <span className="size-1.5 bg-[#695cff]" aria-hidden="true" />
            Pricing
            <span className="size-1.5 bg-[#695cff]" aria-hidden="true" />
          </p>
          <h2 className="text-[30px] font-medium leading-[1.12] tracking-[-1.3px] text-white sm:text-[38px]">
            Pay for the leverage,
            <br /> not the listings
          </h2>
        </div>

        <div className="mb-6 flex justify-center">
          <div className="inline-flex items-center rounded-full bg-[#2b2b2e] p-1" role="group" aria-label="Billing period">
            <button
              type="button"
              aria-pressed={!yearly}
              onClick={() => setYearly(false)}
              className={`min-h-8 rounded-full px-3 text-xs transition ${!yearly ? "bg-white text-[#151517]" : "text-white hover:bg-white/8"}`}
            >
              Monthly
            </button>
            <button
              type="button"
              aria-pressed={yearly}
              onClick={() => setYearly(true)}
              className={`flex min-h-8 items-center gap-2 rounded-full px-3 text-xs transition ${yearly ? "bg-white text-[#151517]" : "text-white hover:bg-white/8"}`}
            >
              Yearly
              <span className="rounded-full bg-[#df13ce] px-1.5 py-0.5 text-[10px] font-semibold text-white">25%</span>
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => {
            const price = yearly ? plan.monthlyPrice * 0.75 : plan.monthlyPrice;
            const formattedPrice = Number.isInteger(price) ? String(price) : price.toFixed(2);

            return (
              <article
                key={plan.name}
                className={`flex min-h-70 flex-col rounded-[18px] border p-4 sm:p-5 ${
                  plan.popular
                    ? "border-white/15 bg-[#1a1a1c] shadow-[0_16px_50px_rgba(255,255,255,0.04)]"
                    : "border-white/10 bg-black"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-white/10 text-[#e2a8e7]">
                      <PlanIcon name={plan.icon} />
                    </span>
                    <h3 className="truncate text-base font-medium text-white">{plan.name}</h3>
                  </div>
                  <p className="shrink-0 text-[27px] font-medium leading-none tracking-[-1px] text-white">
                    ${formattedPrice}
                    <span className="ml-1 text-[10px] font-normal tracking-normal text-[#b1b1b7]">/month</span>
                  </p>
                </div>

                <div className="mt-7">
                  <p className="mb-3 text-xs font-medium text-white">Start building your insights hub:</p>
                  <ul className="space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-xs leading-4 text-[#a7a7ae]">
                        <span className="mt-px flex size-4 shrink-0 items-center justify-center rounded bg-[#28282b] text-white" aria-hidden="true">+</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  href={planHref}
                  aria-disabled={isPending}
                  onClick={isPending ? (event) => event.preventDefault() : undefined}
                  className={`mt-auto flex min-h-10 items-center justify-between rounded-lg px-3.5 text-xs font-medium transition ${
                    plan.popular
                      ? "mt-7 bg-white text-[#111113] hover:bg-[#e8e8ed]"
                      : "mt-7 bg-[#29292c] text-white hover:bg-[#353538]"
                  }${isPending ? " cursor-wait opacity-60" : ""}`}
                >
                  Choose This Plan
                  <span aria-hidden="true">→</span>
                </Link>
              </article>
            );
          })}
        </div>
        {yearly && (
          <p className="mt-4 text-center text-xs text-[#777780]">
            Prices shown as a monthly equivalent. Billed yearly at 25% off.
          </p>
        )}
      </div>
    </section>
  );
}
