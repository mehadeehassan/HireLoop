import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import JobDetails from '@/components/browse-jobs/JobDetails';
import { fetchBackendJobs } from '@/lib/job-api';
import { toPublicJob } from '@/lib/public-jobs';
import { addRecruiterCompanyProfile, getRecruiterCompanyProfiles } from '@/lib/recruiter-company';

export default async function JobDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const { response, data } = await fetchBackendJobs('GET', { id });

  if (!response.ok) {
    if (response.status === 404) notFound();
    throw new Error('Job details are temporarily unavailable.');
  }

  const job = toPublicJob(data);
  if (!job) notFound();

  const companyProfiles = await getRecruiterCompanyProfiles([data]);
  const jobWithCompanyProfile = addRecruiterCompanyProfile(job, data, companyProfiles);

  return <JobDetails job={jobWithCompanyProfile} />;
}
