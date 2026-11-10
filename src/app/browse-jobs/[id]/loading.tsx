export default function JobDetailsLoading() {
  return (
    <main className="min-h-screen bg-[#09090b] px-4 pb-12 pt-5 sm:px-6 sm:pt-7">
      <div className="mx-auto max-w-275 animate-pulse">
        <div className="h-16 rounded-xl border border-white/6 bg-[#141416]" />
        <div className="mt-5 h-20 rounded-xl border border-white/6 bg-[#141416]" />
        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(250px,0.94fr)]">
          <div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  key={index}
                  className="h-21 rounded-xl border border-white/6 bg-[#141416]"
                />
              ))}
            </div>
            <div className="mt-4 h-125 rounded-xl border border-white/6 bg-[#141416]" />
          </div>
          <div className="h-77 rounded-xl border border-white/6 bg-[#141416]" />
        </div>
      </div>
    </main>
  );
}
