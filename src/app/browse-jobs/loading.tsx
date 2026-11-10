export default function BrowseJobsLoading() {
  return (
    <main className="min-h-screen bg-[#09090b] px-4 pb-12 pt-5 sm:px-6 sm:pt-7">
      <div className="mx-auto max-w-310 animate-pulse">
        <div className="h-16 rounded-xl border border-white/6 bg-[#141416]" />
        <div className="mt-3 h-16 rounded-xl border border-white/6 bg-[#141416]" />
        <div className="mt-5 grid items-start gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="h-52 rounded-xl border border-white/6 bg-[#141416]" />
          <div className="space-y-2.5">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="h-39 rounded-xl border border-white/6 bg-[#141416]"
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
