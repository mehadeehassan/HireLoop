import RecruiterSettings from '@/components/dashboard/recruiter/RecruiterSettings';
import RecruiterPageHeader from '@/components/dashboard/recruiter/RecruiterPageHeader';

export const instant = false;

export default function RecruiterSettingsPage() {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <RecruiterPageHeader
        eyebrow="Settings  ›  Account Preferences"
        title="Recruiter Settings"
        description="Manage company information, profile details, and notification preferences."
      />
      <RecruiterSettings />
    </div>
  );
}
