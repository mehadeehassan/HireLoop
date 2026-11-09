const features = [
  {
    title: "Smart Search",
    description: "Find your ideal job with advanced filters.",
    icon: "search",
  },
  {
    title: "Salary Insights",
    description: "Get real salary data to negotiate confidently.",
    icon: "chart",
  },
  {
    title: "Top Companies",
    description: "Apply to vetted companies that are hiring.",
    icon: "companies",
  },
  {
    title: "Saved Jobs",
    description: "Manage apps and favorites on your dashboard.",
    icon: "bookmark",
  },
  {
    title: "One-Click Apply",
    description: "Simplify your job applications for an easier process.",
    icon: "spark",
  },
  {
    title: "Resume Builder",
    description: "Create professional resumes with modern templates.",
    icon: "resume",
  },
  {
    title: "Skill-Based Matching",
    description: "Discover jobs that match your skills and experience.",
    icon: "matching",
  },
  {
    title: "Career Growth Resources",
    description: "Boost your career with quick interview tips.",
    icon: "growth",
  },
] as const;

function FeatureIcon({ name }: { name: (typeof features)[number]["icon"] }) {
  return (
    <svg
      className="size-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "search" && <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4 4" /></>}
      {name === "chart" && <><path d="M4 19V5m0 14h16" /><path d="m7 15 4-5 3 2 5-6" /><path d="M16 6h3v3" /></>}
      {name === "companies" && <><path d="M4 20V8l7-3v15M11 20V4l9 4v12M2 20h20" /><path d="M7 11h1m-1 3h1m7-3h1m-1 3h1" /></>}
      {name === "bookmark" && <path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4V4.5Z" />}
      {name === "spark" && <><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" /><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" /></>}
      {name === "resume" && <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6m-6 4h6m-6 4h3" /><path d="M9 3V2m6 1V2" /></>}
      {name === "matching" && <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m8.5 12 2.3 2.3 4.8-5" /></>}
      {name === "growth" && <><path d="M4 18 10 12l4 3 6-8" /><path d="M14 7h6v6" /></>}
    </svg>
  );
}

export default function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-8 border-y border-white/[0.035] bg-[#151517] px-4 py-16 sm:px-6 sm:py-20 lg:px-10 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-11 max-w-xl text-center sm:mb-14">
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#b8b8c2]">
            <span className="size-1.5 bg-[#695cff]" aria-hidden="true" />
            Features
            <span className="size-1.5 bg-[#695cff]" aria-hidden="true" />
          </p>
          <h2 className="text-[30px] font-medium leading-[1.12] tracking-[-1.3px] text-white sm:text-[38px]">
            Everything you need
            <br /> to succeed
          </h2>
        </div>

        <div className="grid gap-x-7 gap-y-7 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-8">
          {features.map((feature) => (
            <article key={feature.title} className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-[#111113] text-[#f0b5f3] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <FeatureIcon name={feature.icon} />
              </div>
              <div className="pt-0.5">
                <h3 className="text-[13px] font-medium text-white">{feature.title}</h3>
                <p className="mt-1.5 max-w-52 text-xs leading-[1.65] text-[#a2a2aa]">{feature.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
