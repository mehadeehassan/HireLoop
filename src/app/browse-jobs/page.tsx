import { fetchBackendJobs } from '@/lib/job-api';

const BrowseJobsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  const search = await searchParams;
  const urlSearch = new URLSearchParams(search as Record<string, string>);
  const query = urlSearch.toString();
  console.log('search params:', query);

  const jobs = await fetchBackendJobs('GET', { query });
  console.log('jobs:', jobs);
  
  return (
    <div>
      <h1>Browse Jobs</h1>
    </div>
  );
};

export default BrowseJobsPage;
