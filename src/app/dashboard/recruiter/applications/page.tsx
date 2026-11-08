import ApplicationsTable from '@/components/dashboard/recruiter/ApplicationsTable';
import RecruiterPageHeader from '@/components/dashboard/recruiter/RecruiterPageHeader';

export const instant = false;

export default function RecruiterApplicationsPage() {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <RecruiterPageHeader
        eyebrow="Applications  ›  Candidate Pipeline"
        title="Job Applications"
        description="Review candidates and update their status throughout the hiring process."
      />
      <ApplicationsTable />
    </div>
  );
}
