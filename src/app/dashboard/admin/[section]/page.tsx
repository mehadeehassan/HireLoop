import AdminSectionPlaceholder from '@/components/dashboard/admin/AdminSectionPlaceholder';
import { notFound } from 'next/navigation';

const sectionTitles: Record<string, string> = {
  users: 'Users',
  companies: 'Companies',
  jobs: 'Jobs',
  payments: 'Payments',
  settings: 'Settings',
};

export default async function AdminSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const title = sectionTitles[section];
  if (!title) notFound();

  return <AdminSectionPlaceholder title={title} />;
}
