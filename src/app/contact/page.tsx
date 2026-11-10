import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import CopyButton from "@/components/contact/CopyButton";

export const metadata: Metadata = {
  title: "Contact HireLoop",
  description:
    "Contact the HireLoop team by email or phone for help with jobs, your account, or hiring.",
};

const iconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const MailIcon = (
  <svg {...iconProps}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="m4 7 8 6 8-6" />
  </svg>
);

const PhoneIcon = (
  <svg {...iconProps}>
    <path d="M5 4h3.5l1.7 4.2-2.1 1.3a11 11 0 0 0 5.4 5.4l1.3-2.1L19 14.5V18a2 2 0 0 1-2 2A14 14 0 0 1 3 6a2 2 0 0 1 2-2Z" />
  </svg>
);

type ContactMethod = {
  label: string;
  value: string;
  href: string;
  copy: string;
  description: string;
  icon: ReactNode;
};

const contactMethods: ContactMethod[] = [
  {
    label: "Email",
    value: "mehedi19999@gmail.com",
    href: "mailto:mehedi19999@gmail.com",
    copy: "mehedi19999@gmail.com",
    description: "For account, job search, or hiring questions.",
    icon: MailIcon,
  },
  {
    label: "Phone",
    value: "01643896271",
    href: "tel:+8801643896271",
    copy: "01643896271",
    description: "Call us to speak with the HireLoop team.",
    icon: PhoneIcon,
  },
];

export default function ContactPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#08080a] px-4 py-6 text-[#ededf3] sm:px-6 sm:py-10">
      {/* Background: glow + masked grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 -top-45 h-105 w-180 -translate-x-1/2 rounded-full bg-[#6258ff]/25 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-size-[48px_48px] mask-[radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
      </div>

      <div className="relative mx-auto max-w-4xl">
        <Link
          href="/"
          aria-label="HireLoop home"
          className="inline-flex rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#777bff]"
        >
          <Image
            src="/images/logo.png"
            alt="HireLoop"
            width={154}
            height={44}
            priority
            className="h-11 w-38.5"
          />
        </Link>

        <section className="mt-12 sm:mt-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/4 px-3 py-1 font-mono text-xs uppercase tracking-[0.14em] text-[#a9a5ff] backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#777bff] opacity-75 motion-safe:animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#777bff]" />
            </span>
            We&apos;re here to help
          </span>

          <h1 className="mt-5 bg-linear-to-b from-white to-[#9899a9] bg-clip-text text-4xl font-semibold tracking-[-1.5px] text-transparent sm:text-6xl">
            Contact HireLoop
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[#9899a9]">
            Need help with your job search, account, or hiring? Reach out using either option
            below.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {contactMethods.map((method) => (
              <article
                key={method.label}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#141418]/80 p-6 backdrop-blur transition duration-300 hover:border-[#6258ff]/40 motion-safe:hover:-translate-y-0.5"
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#6258ff]/0 blur-3xl transition duration-500 group-hover:bg-[#6258ff]/25"
                />

                <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[#6258ff]/15 text-[#bcb5ff]">
                  {method.icon}
                </div>

                <h2 className="relative mt-5 text-sm font-medium text-[#9899a9]">
                  {method.label}
                </h2>
                <a
                  href={method.href}
                  className="relative mt-1 block break-all text-lg font-medium text-white underline decoration-[#6258ff]/60 underline-offset-4 transition hover:text-[#bcb5ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#777bff]"
                >
                  {method.value}
                </a>
                <p className="relative mt-2 text-sm leading-5 text-[#777780]">
                  {method.description}
                </p>

                <div className="relative mt-5">
                  <CopyButton value={method.copy} label={method.label.toLowerCase()} />
                </div>
              </article>
            ))}
          </div>

          <Link
            href="/"
            className="group mt-10 inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/3 px-4 text-sm text-white transition hover:bg-white/[0.07] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#777bff]"
          >
            <span className="transition motion-safe:group-hover:-translate-x-0.5" aria-hidden>
              ←
            </span>
            Back to home
          </Link>
        </section>
      </div>
    </main>
  );
}