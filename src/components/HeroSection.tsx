const popularSearches = [
  "Trending Position",
  "Product Designer",
  "UI Engineer",
  "Dev-ops Engineer",
];

const stats = [
  {
    value: "50K",
    label: "Active Jobs",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 7V5.8C8 4.8 8.8 4 9.8 4h4.4C15.2 4 16 4.8 16 5.8V7M5 7h14a1 1 0 0 1 1 1v11H4V8a1 1 0 0 1 1-1Zm5 4v4m4-4v4M4 12h16" />
      </svg>
    ),
  },
  {
    value: "12K",
    label: "Companies",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 20V9l7-3v14M11 20V5l9 4v11M7 12v1m0 3v1m7-8h2m-2 4h2m-2 4h2M3 20h18" />
      </svg>
    ),
  },
  {
    value: "2M",
    label: "Job Seekers",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="10" cy="8" r="3" />
        <circle cx="17" cy="17" r="3" />
        <path d="M5 20v-1a5 5 0 0 1 5-5h2M15 7l4 4m0-4v4h-4" />
      </svg>
    ),
  },
  {
    value: "97%",
    label: "Satisfaction Rate",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="7.5" />
        <circle cx="12" cy="12" r="3.5" />
        <circle cx="12" cy="12" r="0.8" fill="currentColor" />
        <path d="M12 4.5V2.8M12 21.2v-1.7M4.5 12H2.8m18.4 0h-1.7" />
      </svg>
    ),
  },
];

export default function HeroSection() {
  return (
    <main>
      <section className="relative mx-auto h-130 max-w-360 overflow-hidden sm:h-137.5 md:h-117.5 lg:h-117.5">
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-18.5 h-107.5 w-225 -translate-x-1/2 opacity-60"
          style={{
            backgroundImage: "url('/images/home-hero-dots.png')",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center top",
            backgroundSize: "900px 430px",
          }}
        />

        <div className="relative z-10 px-4 pt-10.5 text-center sm:px-6 md:pt-9.5 lg:pt-10">
          <div className="mx-auto flex h-12 w-fit items-center gap-3 rounded-full border border-white/5 bg-white/4 px-4 py-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-[#df7a3a] shadow-[inset_0_-3px_6px_rgba(0,0,0,0.18)]" aria-hidden="true">
              <svg className="size-4.5 text-[#171419]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" />
                <rect x="3" y="7" width="18" height="12" rx="2.5" />
                <path d="M9 7v12M15 7v12M3 12h18M10 12v2h4v-2" />
              </svg>
            </span>
            <p className="font-mono text-[12px] uppercase leading-none tracking-[0.45px] text-[#777987] sm:text-[14px]">
              <span className="mr-2 font-bold text-white">50,000+</span>
              new jobs this month
            </p>
          </div>

          <h1 className="mt-4 font-sans text-[26px] font-bold leading-[1.15] tracking-[-1px] text-[#f4f4f7] sm:text-[34px] lg:text-[32px]">
            Find Your Dream Job Today
          </h1>
          <p className="mx-auto mt-2 max-w-130 font-sans text-[12px] leading-4.5 text-[#9899a9] sm:text-[13px] lg:max-w-155">
            Hireloop connects top talent with world-class companies. Browse thousands of
            <br className="hidden sm:block" /> curated opportunities and land your next role faster.
          </p>

          <form className="mx-auto mt-5 flex h-13 max-w-120 items-center rounded-[10px] border border-white/9 bg-[#17171f]/95 p-1.25 shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
            <label className="flex h-full min-w-0 flex-1 items-center gap-2 px-3">
              <svg className="size-4 shrink-0 text-[#9a9ba7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" />
              </svg>
              <input aria-label="Job title, skill, or company" className="min-w-0 flex-1 bg-transparent font-sans text-[11px] text-white outline-none placeholder:text-[#777987]" placeholder="Job title, skill or company" />
            </label>

            <div className="hidden h-7 w-px bg-white/[0.07] sm:block" />

            <label className="hidden h-full flex-[0.9] items-center gap-2 px-3 sm:flex">
              <svg className="size-4 shrink-0 text-[#9a9ba7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="8" />
                <path d="M12 4v16M4 12h16M6 7.5c3.6 2 8.4 2 12 0M6 16.5c3.6-2 8.4-2 12 0" />
              </svg>
              <input aria-label="Location" className="min-w-0 flex-1 bg-transparent font-sans text-[11px] text-white outline-none placeholder:text-[#777987]" placeholder="Location or Remote" />
            </label>

            <button type="submit" aria-label="Search jobs" className="flex size-10.5 shrink-0 items-center justify-center rounded-lg bg-[#6258ff] text-white shadow-[inset_0_3px_10px_rgba(255,255,255,0.18)]">
              <svg className="size-4.25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="6" />
                <path d="m16 16 4 4" />
              </svg>
            </button>
          </form>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-2">
            {popularSearches.map((search, index) => (
              <span key={search} className="flex items-center">
                {index > 0 && <span className="mr-2 text-[10px] text-[#4d4d58]">/</span>}
                <span className="rounded-full bg-white/2.5 px-2.5 py-1 font-sans text-[9px] text-[#a8a8b4]">{search}</span>
              </span>
            ))}
          </div>
        </div>

        <div aria-hidden="true" className="world-globe absolute left-1/2 top-66.25 h-90 w-180 -translate-x-1/2 rounded-t-[360px] md:top-62.5 md:h-97.5 md:w-190 md:rounded-t-[390px] lg:top-62.5 lg:h-107.5 lg:w-295 lg:rounded-t-[590px]" />

        <p className="absolute left-1/2 top-97 z-20 w-[calc(100%-32px)] max-w-130 -translate-x-1/2 text-center font-sans text-[16px] font-medium leading-5.5 tracking-[-0.4px] text-[#aeb4db] md:w-auto md:max-w-none md:text-[21px] md:leading-6.5 md:tracking-[-0.6px] lg:top-97.5">
          <span className="block">Assisting over 15,000 job seekers</span>
          <span className="block">find their dream positions.</span>
        </p>
      </section>

      <section className="relative z-30 mx-auto max-w-360 border-y border-white/5 bg-[#08080a]">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`flex min-h-35 flex-col items-center justify-center px-4 py-5 text-center sm:px-8 md:min-h-33 md:px-10 md:py-5 ${
                index % 2 !== 0 ? "border-l border-white/[0.07]" : ""
              } ${index >= 2 ? "border-t border-white/[0.07] md:border-t-0" : ""} ${
                index > 0 ? "md:border-l md:border-white/[0.07]" : ""
              }`}
            >
              <div className="mb-8 flex size-8.5 items-center justify-center rounded-full border border-[#6270ff]/20 bg-[#17183a]/90 text-[#8b93ff] md:mb-7 [&>svg]:size-4.25 [&>svg]:fill-none [&>svg]:stroke-current [&>svg]:stroke-width-[1.5]">
                {stat.icon}
              </div>
              <p className="font-sans text-[30px] font-semibold leading-none tracking-[-1px] text-[#ededf3] md:text-[34px]">{stat.value}</p>
              <p className="mt-2 font-sans text-[9px] text-[#a6a7b2] md:text-[10px]">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
