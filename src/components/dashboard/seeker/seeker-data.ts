import type { PublicJob } from '@/lib/public-jobs';

export type SeekerApplication = {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  status: string;
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  experience?: string;
  skills?: string[] | string;
  coverLetter?: string;
  type?: string;
  workMode?: string;
  createdAt?: string;
  updatedAt?: string;
  date?: string;
  summary?: string;
};

export type SeekerProfile = {
  name: string;
  email: string;
  phone: string;
  location: string;
  experience: string;
  skills: string;
  linkedinUrl: string;
  resumeUrl: string;
  portfolioUrl: string;
  image: string;
  plan: string;
  headline?: string;
  bio?: string;
  hasResume?: boolean;
  resumeFileName?: string;
};

export type SeekerDashboardData = {
  applications: SeekerApplication[];
  jobs: PublicJob[];
  loading: boolean;
  error: string;
  refresh: () => void;
};

export function getTimeAgo(value?: string) {
  if (!value) return 'Recently';
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return 'Recently';
  const hours = Math.max(0, Math.floor((Date.now() - timestamp) / 3_600_000));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function isSeekerApplication(value: unknown): value is SeekerApplication {
  if (!value || typeof value !== 'object') return false;
  const application = value as Record<string, unknown>;
  return (
    typeof application.id === 'string' &&
    typeof application.jobTitle === 'string' &&
    typeof application.company === 'string' &&
    typeof application.status === 'string'
  );
}

export function isPublicJob(value: unknown): value is PublicJob {
  if (!value || typeof value !== 'object') return false;
  const job = value as Record<string, unknown>;
  return typeof job.id === 'string' && typeof job.title === 'string';
}
