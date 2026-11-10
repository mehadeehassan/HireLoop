import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found | HireLoop",
};

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#08080a] px-4 py-6 text-[#ededf3] sm:px-6 sm:py-10">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 -top-4520px] w-180 -translate-x-1/2 rounded-full bg-[#6258ff]/25 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-size-[48px_48px] mask-[radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
      </div>

      <div className="relative mx-auto w-full max-w-4xl">
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
      </div>

      <section className="relative mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center text-center">
        <p
          aria-hidden
          className="bg-linear-to-b from-white to-[#3a3a46] bg-clip-text text-[120px] font-semibold leading-none tracking-[-6px] text-transparent sm:text-[168px]"
        >
          404
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-[-0.5px] text-white sm:text-3xl">
          Page not found
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-[#9899a9]">
          The page you are looking for does not exist, was moved, or the link is incorrect.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-lg bg-[#6258ff] px-5 text-sm font-medium text-white transition hover:bg-[#7469ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#777bff]"
          >
            Back to home
          </Link>
          <Link
            href="/contact"
            className="inline-flex min-h-11 items-center rounded-lg border border-white/10 bg-white/3 px-5 text-sm text-white transition hover:bg-white/[0.07] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#777bff]"
          >
            Contact support
          </Link>
        </div>
      </section>
    </main>
  );
}