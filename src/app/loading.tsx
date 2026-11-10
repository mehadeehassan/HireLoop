export default function Loading() {
  return (
    <main
      role="status"
      aria-busy="true"
      className="min-h-screen bg-[#08080a] px-4 py-6 sm:px-6 sm:py-10"
    >
      <span className="sr-only">Loading…</span>

      <div className="mx-auto max-w-4xl motion-safe:animate-pulse">
        {/* logo */}
        <div className="h-11 w-38.5 rounded-md bg-white/6" />

        {/* heading block */}
        <div className="mt-12 sm:mt-20">
          <div className="h-6 w-40 rounded-full bg-white/6" />
          <div className="mt-5 h-10 w-3/4 max-w-md rounded-lg bg-white/8 sm:h-14" />
          <div className="mt-4 h-4 w-full max-w-xl rounded bg-white/5" />
          <div className="mt-2 h-4 w-2/3 max-w-sm rounded bg-white/5" />
        </div>

        {/* cards */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/[0.07] bg-[#141418] p-6"
            >
              <div className="h-11 w-11 rounded-xl bg-white/6" />
              <div className="mt-5 h-3 w-16 rounded bg-white/5" />
              <div className="mt-3 h-5 w-48 rounded bg-white/8" />
              <div className="mt-3 h-3 w-full rounded bg-white/5" />
              <div className="mt-5 h-11 w-20 rounded-lg bg-white/5" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}