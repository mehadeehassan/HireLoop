import AddJobForm from '@/components/dashboard/recruiter/AddJobForm';
import RecruiterPageHeader from '@/components/dashboard/recruiter/RecruiterPageHeader';

export const instant = false;

export default function AddJobPage() {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <RecruiterPageHeader
        eyebrow="Manage Jobs  ›  Create New Listing"
        title="Post a New Job"
        description="Fill in the position specifications to attract qualified candidates."
      />
      <AddJobForm />
    </div>
  );
}
