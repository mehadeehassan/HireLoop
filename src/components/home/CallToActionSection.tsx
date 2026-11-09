import Link from "next/link";

export default function CallToActionSection() {
  return (
    <section className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[url('/images/cta-bg.png')] bg-[length:auto_100%] bg-top bg-no-repeat opacity-90"
      />
      <div className="relative mx-auto max-w-3xl text-center">
        <h2 className="text-[34px] font-medium leading-[1.12] tracking-[-1.5px] text-white sm:text-[46px] sm:tracking-[-2px]">
          Your next role is
          <br /> already looking for you
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#a6a6b0] sm:text-base">
          Build a profile in three minutes. The matches start arriving tomorrow morning.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-5 text-sm font-medium text-[#111113] transition hover:bg-[#e8e8ed]"
          >
            Create a free account
          </Link>
          <Link
            href="#pricing"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/15 bg-[#101014]/80 px-5 text-sm font-medium text-white transition hover:bg-white/8"
          >
            View pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
