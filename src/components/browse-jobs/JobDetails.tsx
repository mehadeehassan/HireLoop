import Image from 'next/image';
import type { ReactNode } from 'react';
import HomeNavbar from '@/components/home/HomeNavbar';
import type { PublicJob } from '@/lib/public-jobs';
import JobApplyButton from './JobApplyButton';
import JobSaveButton from './JobSaveButton';

const companyImages = [
  { match: 'techflow', src: '/images/techflow.jpg' },
  { match: 'fingrid', src: '/images/fingrid.jpg' },
  { match: 'creative', src: '/images/creativestudio.jpg' },
  { match: 'healthai', src: '/images/healthai.jpg' },
];

function SummaryItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: 'salary' | 'location' | 'type' | 'experience';
}) {
  const icons = {
    salary: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M8 6V4h8v2M3 11h18" /></>,
    location: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2" /></>,
    type: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    experience: <><path d="M4 19V5M4 19h17" /><path d="m7 15 4-4 3 2 6-7" /></>,
  };

  return (
    <div className="min-w-0 rounded-xl border border-white/6 bg-[#141416] px-3 py-3.5">
      <svg
        className="mb-2 size-4 text-[#b8b8c2]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        aria-hidden="true"
      >
        {icons[icon]}
      </svg>
      <p className="text-[9px] uppercase tracking-wide text-[#85858e]">{label}</p>
      <p className="mt-1 truncate text-xs font-medium text-[#ededf3]" title={value}>
        {value}
      </p>
    </div>
  );
}

function ContentSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-white/6 py-5 last:border-0 last:pb-0">
      <h2 className="text-sm font-semibold text-[#ededf3]">{title}</h2>
      <div className="mt-3 text-xs leading-6 text-[#a2a2ab]">{children}</div>
    </section>
  );
}

function getCompanyImage(company: string) {
  const normalizedCompany = company.toLowerCase();
  return companyImages.find(({ match }) => normalizedCompany.includes(match))?.src;
}

function CompanyVisual({ job }: { job: PublicJob }) {
  const image = job.companyLogo || getCompanyImage(job.company);
  const initials = job.company
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');

  return (
    <div className="relative mt-4 flex h-40 items-center justify-center overflow-hidden rounded-lg border border-white/6 bg-[#0c1416]">
      {image ? (
        <Image
          src={image}
          alt={`${job.company} workplace`}
          fill
          unoptimized
          className="object-cover"
        />
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(75,106,108,0.42),transparent_65%)]" />
          <div className="absolute inset-x-7 bottom-7 top-5 border border-[#628082]/25 bg-[#101a1c]/60 shadow-[0_0_38px_rgba(54,91,93,0.18)]" />
          <span className="relative text-3xl font-semibold tracking-widest text-[#a3c4c0]/70">
            {initials}
          </span>
        </>
      )}
    </div>
  );
}

export default function JobDetails({ job }: { job: PublicJob }) {
  return (
    <main className="min-h-screen bg-[#09090b] px-4 pb-12 pt-5 text-[#ededf3] sm:px-6 sm:pt-7">
      <div className="mx-auto max-w-275">
        <HomeNavbar />

        <header className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/6 bg-[#141416] p-4 sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-[#1d1d21] text-sm font-semibold text-[#c2bdff]">
              {job.company
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((word) => word[0].toUpperCase())
                .join('')}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-[-0.3px] text-[#ededf3] sm:text-lg">
                {job.title}
              </h1>
              <p className="mt-1 truncate text-xs text-[#a2a2ab]">
                {job.company}
                <span className="px-2 text-[#55555c]">•</span>
                {job.verifiedEmployer ? (
                  <span className="text-emerald-400">✓ Verified Employer</span>
                ) : (
                  job.location
                )}
              </p>
            </div>
          </div>
          <div id="apply" className="ml-auto flex items-center gap-2">
            <JobSaveButton
              jobId={job.id}
              className="size-10 border border-white/[0.07] bg-[#1c1c20]"
            />
            <JobApplyButton jobId={job.id} />
          </div>
        </header>

        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(250px,0.94fr)]">
          <div className="min-w-0">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <SummaryItem label="Salary Range" value={job.compensation} icon="salary" />
              <SummaryItem label="Location" value={job.location} icon="location" />
              <SummaryItem label="Job Type" value={job.type} icon="type" />
              <SummaryItem
                label="Experience"
                value={job.experience || 'Not specified'}
                icon="experience"
              />
            </div>

            <article className="mt-4 rounded-xl border border-white/6 bg-[#141416] px-4 sm:px-5">
              <ContentSection title="Job Description">
                <p className="whitespace-pre-line">{job.description}</p>
              </ContentSection>

              {job.responsibilities.length > 0 && (
                <ContentSection title="Responsibilities">
                  <ul className="list-disc space-y-2 pl-4 marker:text-[#d4d4dc]">
                    {job.responsibilities.map((responsibility, index) => (
                      <li key={`${index}-${responsibility}`}>{responsibility}</li>
                    ))}
                  </ul>
                </ContentSection>
              )}

              {job.requirements.length > 0 && (
                <ContentSection title="Requirements">
                  <ul className="list-disc space-y-2 pl-4 marker:text-[#d4d4dc]">
                    {job.requirements.map((requirement, index) => (
                      <li key={`${index}-${requirement}`}>{requirement}</li>
                    ))}
                  </ul>
                </ContentSection>
              )}

              {job.benefits.length > 0 && (
                <ContentSection title="Benefits">
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {job.benefits.map((benefit, index) => (
                      <li key={`${index}-${benefit}`} className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#242427] text-[#c4c4cc]"
                        >
                          ✓
                        </span>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </ContentSection>
              )}

            </article>
          </div>

          <aside className="rounded-xl border border-white/6 bg-[#141416] p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-[#ededf3]">Company Overview</h2>
            <CompanyVisual job={job} />

            {job.companyDescription && (
              <p className="mt-4 text-xs leading-5 text-[#a2a2ab]">
                {job.companyDescription}
              </p>
            )}

            <dl className="mt-4 divide-y divide-white/6">
              <div className="flex items-center justify-between gap-3 py-3 text-[11px]">
                <dt className="text-[#85858e]">Size</dt>
                <dd className="text-right text-[#d3d3da]">{job.companySize || 'Not specified'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-3 text-[11px]">
                <dt className="text-[#85858e]">Industry</dt>
                <dd className="text-right text-[#d3d3da]">{job.industry || 'Not specified'}</dd>
              </div>
            </dl>

            {job.companyWebsite ? (
              <a
                href={job.companyWebsite}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex h-9 items-center justify-center rounded-lg border border-white/[0.07] bg-[#1d1d21] text-[11px] font-medium text-[#e2e2e8] transition hover:bg-[#252529]"
              >
                Visit Website
              </a>
            ) : (
              <p className="mt-2 text-center text-[10px] text-[#777780]">
                Company website not provided
              </p>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
