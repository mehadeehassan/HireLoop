type HomeStatsSectionProps = {
  activeJobs: number;
  companies: number;
  remoteJobs: number;
  jobTypes: number;
  loading: boolean;
};

const statIcons = [
  <path key="jobs" d="M8 7V5.8C8 4.8 8.8 4 9.8 4h4.4C15.2 4 16 4.8 16 5.8V7M5 7h14a1 1 0 0 1 1 1v11H4V8a1 1 0 0 1 1-1Zm5 4v4m4-4v4M4 12h16" />,
  <path key="companies" d="M4 20V9l7-3v14M11 20V5l9 4v11M7 12v1m0 3v1m7-8h2m-2 4h2m-2 4h2M3 20h18" />,
  <path key="remote" d="M12 3a9 9 0 1 0 9 9M12 3v18M3 12h18m-15.5-5h13m-13 10h8" />,
  <path key="types" d="M4 19V5m0 14h16M8 16V9h3v7m2 0V5h3v11m2 0v-4h3v4" />,
];

export default function HomeStatsSection({
  activeJobs,
  companies,
  remoteJobs,
  jobTypes,
  loading,
}: HomeStatsSectionProps) {
  const stats = [
    { value: activeJobs, label: "Active Jobs" },
    { value: companies, label: "Companies Hiring" },
    { value: remoteJobs, label: "Remote Jobs" },
    { value: jobTypes, label: "Job Types" },
  ];

  return (
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
            <div className="mb-6 flex size-8.5 items-center justify-center rounded-full border border-[#6270ff]/20 bg-[#17183a]/90 text-[#8b93ff] md:mb-5 [&>svg]:size-4.25 [&>svg]:fill-none [&>svg]:stroke-current [&>svg]:stroke-width-[1.5]">
              <svg viewBox="0 0 24 24" aria-hidden="true">{statIcons[index]}</svg>
            </div>
            <p className="font-sans text-[30px] font-semibold leading-none tracking-[-1px] text-[#ededf3] md:text-[34px]">
              {loading ? "—" : stat.value.toLocaleString()}
            </p>
            <p className="mt-2 font-sans text-[9px] text-[#a6a7b2] md:text-[10px]">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
