import SeekerJobs from '@/components/dashboard/seeker/SeekerJobs';

export const instant = false;

export default async function SeekerJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string | string[] }>;
}) {
  const params = await searchParams;
  const initialSearch = typeof params.search === 'string' ? params.search : '';
  return <SeekerJobs initialSearch={initialSearch} />;
}
