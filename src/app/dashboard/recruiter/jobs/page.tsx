import ManageJobsTable from '@/components/dashboard/recruiter/ManageJobsTable';
import RecruiterPageHeader from '@/components/dashboard/recruiter/RecruiterPageHeader';

export const instant = false;

export default function ManageJobsPage() {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <RecruiterPageHeader
        eyebrow="Manage Jobs  ›  Job Listings & Ratings"
        title="Manage Job Posts"
        description="Review live listings, monitor applicants, and update job details as your organization grows."
        actionLabel="New Job Post"
        actionHref="/dashboard/recruiter/add-job"
      />
      <ManageJobsTable />
    </div>
  );
}
