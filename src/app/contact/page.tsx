import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact HireLoop",
  description: "Contact the HireLoop team by email or phone for help with jobs, your account, or hiring.",
};

const contactMethods = [
  {
    label: "Email",
    value: "mehedi19999@gmail.com",
    href: "mailto:mehedi19999@gmail.com",
    description: "For account, job search, or hiring questions.",
  },
  {
    label: "Phone",
    value: "016432896271",
    href: "tel:016432896271",
    description: "Call us to speak with the HireLoop team.",
  },
];

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#08080a] px-4 py-6 text-[#ededf3] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/" aria-label="HireLoop home" className="inline-flex">
          <Image
            src="/images/logo.png"
            alt="HireLoop"
            width={154}
            height={44}
            priority
            className="h-11 w-38.5"
          />
        </Link>

        <section className="mt-12 rounded-2xl border border-white/[0.07] bg-[#141418] p-6 sm:mt-16 sm:p-10">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#777bff]">
            We&apos;re here to help
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-1px] text-white sm:text-4xl">
            Contact HireLoop
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#9899a9]">
            Need help with your job search, account, or hiring? Reach out using either option below.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {contactMethods.map((method) => (
              <article
                key={method.label}
                className="rounded-xl border border-white/[0.07] bg-[#101014] p-5"
              >
                <h2 className="text-sm font-medium text-[#9899a9]">{method.label}</h2>
                <a
                  href={method.href}
                  className="mt-2 inline-flex min-h-11 items-center text-base font-medium text-white underline decoration-[#6258ff]/70 underline-offset-4 transition hover:text-[#bcb5ff]"
                >
                  {method.value}
                </a>
                <p className="mt-2 text-sm leading-5 text-[#777780]">{method.description}</p>
              </article>
            ))}
          </div>

          <Link
            href="/"
            className="mt-8 inline-flex min-h-11 items-center rounded-lg border border-white/10 px-4 text-sm text-white transition hover:bg-white/5"
          >
            Back to home
          </Link>
        </section>
      </div>
    </main>
  );
}
