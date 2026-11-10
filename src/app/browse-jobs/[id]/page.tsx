import { notFound } from 'next/navigation';
import JobDetails from '@/components/browse-jobs/JobDetails';
import { fetchBackendJobs } from '@/lib/job-api';
import { toPublicJob } from '@/lib/public-jobs';
import { addRecruiterCompanyProfile, getRecruiterCompanyProfiles } from '@/lib/recruiter-company';

type BackendJobsPayload = {
  jobs?: unknown[];
};

function getJobs(data: unknown): unknown[] | null {
  if (Array.isArray(data)) return data;
  if (typeof data === 'object' && data !== null) {
    const payload = data as BackendJobsPayload;
    return Array.isArray(payload.jobs) ? payload.jobs : null;
  }
  return null;
}

export default async function JobDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { response, data } = await fetchBackendJobs('GET');

  if (!response.ok) {
    throw new Error('Job details are temporarily unavailable.');
  }

  const jobs = getJobs(data);
  if (!jobs) {
    throw new Error('The job service returned an unexpected response.');
  }

  const companyProfiles = await getRecruiterCompanyProfiles(jobs);
  const job = jobs
    .map((value) => {
      const publicJob = toPublicJob(value);
      return publicJob
        ? addRecruiterCompanyProfile(publicJob, value, companyProfiles)
        : null;
    })
    .find((publicJob) => publicJob?.id === id);

  if (!job) notFound();

  return <JobDetails job={job} />;
}
