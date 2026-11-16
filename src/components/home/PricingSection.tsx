"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";

type PricingRole = "seeker" | "recruiter";
type PlanName = "Starter" | "Growth" | "Premium";
type PricingPlan = {
  planName: PlanName;
  price: number;
  yearlyPrice: number;
  currency: string;
  features: string[];
};

function isPlanName(value: unknown): value is PlanName {
  return value === "Starter" || value === "Growth" || value === "Premium";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPricingPlan(value: unknown): value is PricingPlan {
  return isRecord(value) &&
    isPlanName(value.planName) &&
    typeof value.price === "number" &&
    Number.isFinite(value.price) &&
    value.price >= 0 &&
    typeof value.yearlyPrice === "number" &&
    Number.isFinite(value.yearlyPrice) &&
    value.yearlyPrice >= 0 &&
    typeof value.currency === "string" &&
    /^[a-z]{3}$/i.test(value.currency) &&
    Array.isArray(value.features) &&
    value.features.every((feature) => typeof feature === "string");
}

function isPricingData(value: unknown, role: PricingRole): value is { role: PricingRole; plans: PricingPlan[] } {
  return isRecord(value) &&
    value.role === role &&
    Array.isArray(value.plans) &&
    value.plans.every(isPricingPlan);
}

function formatPrice(value: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency.toUpperCase()} ${value.toFixed(2)}`;
  }
}

function PlanIcon({ name }: { name: PlanName }) {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {name === "Starter" && <><path d="m3 8 5 4 4-7 4 7 5-4-2 12H5L3 8Z" /><path d="M8 16h8" /></>}
      {name === "Growth" && <><path d="M4 19V5m0 14h16" /><path d="m7 15 4-5 3 2 5-6" /></>}
      {name === "Premium" && <path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z" />}
    </svg>
  );
}

type PricingSectionProps = {
  planCtaHref?: string;
};

export default function PricingSection({ planCtaHref: planCtaHrefOverride }: PricingSectionProps = {}) {
  const { data: session, isPending } = useSession();
  const [selectedRole, setSelectedRole] = useState<PricingRole>("seeker");
  const [retryCount, setRetryCount] = useState(0);
  const [pricingResult, setPricingResult] = useState<{
    role: PricingRole;
    requestCount: number;
    plans: PricingPlan[];
    error?: string;
  } | null>(null);
  const sessionRole = session?.user.role;
  const pricingRole: PricingRole =
    sessionRole === "seeker" || sessionRole === "recruiter" ? sessionRole : selectedRole;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/public/pricing?role=${pricingRole}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result: unknown = await response.json();
        if (controller.signal.aborted) return;
        if (!response.ok || !isPricingData(result, pricingRole)) {
          throw new Error(
            isRecord(result) && typeof result.error === "string"
              ? result.error
              : "Pricing is temporarily unavailable.",
          );
        }
        setPricingResult({ role: pricingRole, requestCount: retryCount, plans: result.plans });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setPricingResult({
            role: pricingRole,
            requestCount: retryCount,
            plans: [],
            error: error instanceof Error ? error.message : "Pricing is temporarily unavailable.",
          });
        }
      })
    return () => controller.abort();
  }, [pricingRole, retryCount]);

  const canChooseRole = !isPending && (
    !session?.user || (session.user.role !== "seeker" && session.user.role !== "recruiter")
  );
  const isRecruiter = session?.user.role === "recruiter";
  const isSeeker = session?.user.role === "seeker";
  const planHref = planCtaHrefOverride ?? (
    isPending
      ? "#pricing"
      : session?.user
        ? isSeeker
          ? "/dashboard/seeker/upgrade"
          : isRecruiter
            ? "/dashboard/recruiter/upgrade"
            : "/dashboard"
        : "/signup"
  );
  const isPlanLinkDisabled = !planCtaHrefOverride && isPending;
  const [yearly, setYearly] = useState(false);
  const currentPricing = pricingResult?.role === pricingRole && pricingResult.requestCount === retryCount
    ? pricingResult
    : null;
  const loadingPlans = currentPricing === null;
  const plansError = currentPricing?.error || "";
  const orderedPlans = [...(currentPricing?.plans ?? [])].sort(
    (first, second) =>
      ["Starter", "Growth", "Premium"].indexOf(first.planName) -
      ["Starter", "Growth", "Premium"].indexOf(second.planName),
  );

  function retryPlans() {
    setRetryCount((count) => count + 1);
  }

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

        {canChooseRole && (
          <div className="mb-5 flex justify-center">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-[#18181b] p-1" role="group" aria-label="Plan audience">
              {(["seeker", "recruiter"] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  aria-pressed={selectedRole === role}
                  onClick={() => setSelectedRole(role)}
                  className={`min-h-8 rounded-full px-3 text-xs capitalize transition ${
                    pricingRole === role ? "bg-white text-[#151517]" : "text-white hover:bg-white/8"
                  }`}
                >
                  {role === "seeker" ? "Job Seeker" : "Recruiter"}
                </button>
              ))}
            </div>
          </div>
        )}

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
            </button>
          </div>
        </div>

        {plansError ? (
          <div className="mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300" role="alert">
            <span>{plansError}</span>
            <button
              type="button"
              onClick={retryPlans}
              className="rounded-md border border-red-300/20 px-3 py-2 text-xs hover:bg-white/5"
            >
              Try again
            </button>
          </div>
        ) : loadingPlans ? (
          <div className="grid gap-4 md:grid-cols-3" aria-label="Loading plan prices" aria-busy="true">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-64 animate-pulse rounded-[18px] border border-white/10 bg-white/[0.03]" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
          {orderedPlans.map((plan) => {
            const price = yearly ? plan.yearlyPrice / 12 : plan.price;

            return (
              <article
                key={plan.planName}
                className={`flex min-h-70 flex-col rounded-[18px] border p-4 sm:p-5 ${
                  plan.planName === "Growth"
                    ? "border-white/15 bg-[#1a1a1c] shadow-[0_16px_50px_rgba(255,255,255,0.04)]"
                    : "border-white/10 bg-black"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-white/10 text-[#e2a8e7]">
                      <PlanIcon name={plan.planName} />
                    </span>
                    <h3 className="truncate text-base font-medium text-white">{plan.planName}</h3>
                  </div>
                  <p className="shrink-0 text-[27px] font-medium leading-none tracking-[-1px] text-white">
                    {formatPrice(price, plan.currency)}
                    <span className="ml-1 text-[10px] font-normal tracking-normal text-[#b1b1b7]">/month</span>
                  </p>
                </div>
                {yearly && (
                  <p className="mt-2 text-[10px] text-[#b1b1b7]">
                    {formatPrice(plan.yearlyPrice, plan.currency)} billed yearly
                  </p>
                )}

                <div className="mt-7">
                  <p className="mb-3 text-xs font-medium text-white">Included with this plan:</p>
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
                  aria-disabled={isPlanLinkDisabled}
                  onClick={isPlanLinkDisabled ? (event) => event.preventDefault() : undefined}
                  className={`mt-auto flex min-h-10 items-center justify-between rounded-lg px-3.5 text-xs font-medium transition ${
                    plan.planName === "Growth"
                      ? "mt-7 bg-white text-[#111113] hover:bg-[#e8e8ed]"
                      : "mt-7 bg-[#29292c] text-white hover:bg-[#353538]"
                  }${isPlanLinkDisabled ? " cursor-wait opacity-60" : ""}`}
                >
                  Choose This Plan
                  <span aria-hidden="true">→</span>
                </Link>
              </article>
            );
          })}
          </div>
        )}
      </div>
    </section>
  );
}
