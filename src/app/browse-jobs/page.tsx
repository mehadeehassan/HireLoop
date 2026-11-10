import BrowseJobs from '@/components/browse-jobs/BrowseJobs';

export default async function BrowseJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const initialSearch = typeof params.search === 'string' ? params.search : '';

  return <BrowseJobs initialSearch={initialSearch} />;
}
