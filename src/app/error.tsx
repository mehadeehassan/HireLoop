"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replace with your error reporting (Sentry, etc.)
    console.error(error);
  }, [error]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#08080a] px-4 py-10 text-[#ededf3]">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 -top-45 h-105 w-180 -translate-x-1/2 rounded-full bg-[#ff5858]/15 blur-[120px]" />
      </div>

      <section
        role="alert"
        className="relative w-full max-w-md rounded-2xl border border-white/[0.07] bg-[#141418]/80 p-8 text-center backdrop-blur"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-[#ff5858]/10 text-[#ff8a8a]">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 3 2.5 20h19L12 3Z" />
            <path d="M12 10v4M12 17.5v.01" />
          </svg>
        </div>

        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.5px] text-white">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#9899a9]">
          An unexpected error occurred. You can try again, or return to the home page.
        </p>

        {error.digest && (
          <p className="mt-4 font-mono text-xs text-[#777780]">Error ID: {error.digest}</p>
        )}

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center rounded-lg bg-[#6258ff] px-5 text-sm font-medium text-white transition hover:bg-[#7469ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#777bff]"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-lg border border-white/10 bg-white/3 px-5 text-sm text-white transition hover:bg-white/[0.07] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#777bff]"
          >
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}