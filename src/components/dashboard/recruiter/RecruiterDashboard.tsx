'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { RecruiterJob } from './recruiter-data';

type Profile = {
  recruiterName: string;
};

type JobsResponse = {
  jobs: RecruiterJob[];
};

type Application = {
  id: string;
  name: string;
  initials: string;
  role: string;
  email: string;
  experience: string;
  status: string;
  date: string;
};

export default function RecruiterDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [jobs, setJobs] = useState<RecruiterJob[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicationsError, setApplicationsError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      const [profileResponse, jobsResponse, applicationsResponse] = await Promise.all([
        fetch('/api/recruiter/profile', { cache: 'no-store' }),
        fetch('/api/recruiter/jobs?limit=50', { cache: 'no-store' }),
        fetch('/api/recruiter/applications', { cache: 'no-store' }),
      ]);

      const profileData = profileResponse.ok ? await profileResponse.json() : null;
      const jobsData: JobsResponse | null = jobsResponse.ok ? await jobsResponse.json() : null;
      const applicationsData = applicationsResponse.ok ? await applicationsResponse.json() : null;

      if (!active) return;
      setProfile(profileData);
      setJobs(jobsData?.jobs || []);
      setApplications(applicationsData?.applications || []);
      setApplicationsError(!applicationsResponse.ok);
      setLoading(false);
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const totalApplicants = applications.length;
    const activeJobs = jobs.filter((job) => {
      const status = String(job.status || '').toLowerCase();
      return status === 'active';
    }).length;
    const expiredJobs = jobs.filter((job) => {
      const status = String(job.status || '').toLowerCase();
      return status === 'expired' || status === 'closed';
    }).length;

    return [
      { label: 'Total Job Posts', value: jobs.length },
      { label: 'Total Applicants', value: totalApplicants },
      { label: 'Active Jobs', value: activeJobs },
      { label: 'Jobs Closed', value: expiredJobs },
    ];
  }, [applications.length, jobs]);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-[20px] font-semibold text-[#f1f3f8] sm:text-[24px]">
        Welcome back, {profile?.recruiterName || 'Recruiter'}
      </h1>

      <section className="mt-6 grid grid-cols-2 overflow-hidden rounded-lg border border-white/[0.07] md:grid-cols-4">
        {stats.map((stat, index) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={loading ? '—' : stat.value.toLocaleString()}
            index={index}
          />
        ))}
      </section>

      <section className="mt-6 overflow-hidden rounded-lg border border-white/[0.07] bg-[#111827]/45">
        <div className="flex h-13 items-center justify-between border-b border-white/[0.07] px-4 sm:px-5">
          <h2 className="text-[13px] font-semibold text-[#edf0f7]">Recent Applications</h2>
          <Link href="/dashboard/recruiter/applications" className="text-[10px] text-[#7779ff]">
            View all
          </Link>
        </div>
        {loading ? (
          <div className="flex min-h-44 items-center justify-center text-[11px] text-[#858da1]">
            Loading applications...
          </div>
        ) : applicationsError ? (
          <div role="alert" className="flex min-h-44 items-center justify-center px-5 text-center text-[11px] text-[#ff8797]">
            Could not load applications. Please try again.
          </div>
        ) : applications.length === 0 ? (
          <div className="flex min-h-44 flex-col items-center justify-center px-5 text-center">
            <p className="text-[12px] font-medium text-[#dfe3ec]">No recent applications</p>
            <p className="mt-2 max-w-sm text-[10px] leading-4 text-[#858da1]">
              Applications submitted for your jobs will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.07]">
            {applications.slice(0, 5).map((application) => (
              <div key={application.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#6258ff]/15 text-[10px] font-semibold text-[#b9bdff]">
                  {application.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-[#edf0f7]">
                    {application.name}
                  </p>
                  <p className="mt-1 truncate text-[9px] text-[#858da1]">
                    {application.role} · {application.experience}
                  </p>
                </div>
                <div className="flex min-w-20 flex-col items-center text-center">
                  <span className={`flex min-w-16 items-center justify-center rounded-full px-2.5 py-1 text-[9px] ${recentApplicationStatusStyle(application.status)}`}>
                    {application.status}
                  </span>
                  <span className="mt-1 block text-[8px] text-[#858da1]">{application.date}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Link
        href="/dashboard/recruiter/add-job"
        aria-label="Add job"
        className="fixed bottom-5 right-5 flex size-11 items-center justify-center rounded-full bg-[#6258ff] text-[24px] text-white shadow-lg lg:bottom-8 lg:right-8"
      >
        +
      </Link>
    </div>
  );
}

function recentApplicationStatusStyle(status: string) {
  const styles: Record<string, string> = {
    New: 'bg-[#6258ff]/15 text-[#9fa3ff]',
    Reviewed: 'bg-[#263a58] text-[#8ab8ff]',
    Shortlisted: 'bg-[#123a33] text-[#4fdda0]',
    Interview: 'bg-[#433518] text-[#ffd36a]',
    Rejected: 'bg-[#4a2832] text-[#ff8797]',
  };
  return styles[status] || 'bg-[#6258ff]/15 text-[#9fa3ff]';
}

function StatCard({ label, value, index }: { label: string; value: string; index: number }) {
  return (
    <div
      className={`min-h-28 px-4 py-5 sm:px-6 ${
        index % 2 === 1 ? 'border-l border-white/[0.07]' : ''
      } ${index >= 2 ? 'border-t border-white/[0.07] md:border-t-0' : ''} ${
        index > 0 ? 'md:border-l md:border-white/[0.07]' : ''
      }`}
    >
      <div className="flex size-8 items-center justify-center rounded-full border border-[#6258ff]/20 bg-[#17183a] text-[#8b93ff]">
        <StatIcon index={index} />
      </div>
      <p className="mt-7 text-[28px] font-semibold leading-none tracking-[-1px] text-[#ededf3]">
        {value}
      </p>
      <p className="mt-2 text-[9px] text-[#a6a7b2] sm:text-[10px]">{label}</p>
    </div>
  );
}

function StatIcon({ index }: { index: number }) {
  const paths = [
    'M7 3h10v18H7zM10 7h4M10 11h4M10 15h4',
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    'm13 2-2 8h6l-10 12 2-8H3z',
    'M20 6 9 17l-5-5',
  ];
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-4">
      <path d={paths[index]} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
