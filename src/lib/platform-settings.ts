import { getDatabase } from '@/lib/mongodb';

export type PlatformBranding = {
  name: string;
  description: string;
  supportEmail: string;
  websiteUrl: string;
  logo: string | null;
};

export type PlatformControls = {
  seekerRegistration: boolean;
  recruiterRegistration: boolean;
  jobPosting: boolean;
  jobApplications: boolean;
};

export type PublicPlatformSettings = {
  branding: PlatformBranding;
  registration: { seekerEnabled: boolean; recruiterEnabled: boolean };
};

const defaults: PublicPlatformSettings = {
  branding: {
    name: 'HireLoop',
    description:
      'HireLoop connects ambitious job seekers with companies that are actively hiring.',
    supportEmail: '',
    websiteUrl: '',
    logo: null,
  },
  registration: { seekerEnabled: true, recruiterEnabled: true },
};

function text(value: unknown, fallback: string) {
  return typeof value === 'string' ? value : fallback;
}

function bool(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

// Better Auth signup hook প্রতিবার DB থেকে পড়ে, যাতে toggle সঙ্গে সঙ্গেই কার্যকর হয়।
export async function getPlatformControls(): Promise<PlatformControls> {
  const database = await getDatabase();
  const document = await database
    .collection('platform_settings')
    .findOne({ _id: 'platform' as unknown as never });
  const controls =
    typeof document?.controls === 'object' && document.controls !== null
      ? (document.controls as Record<string, unknown>)
      : {};
  return {
    seekerRegistration: bool(controls.seekerRegistration, true),
    recruiterRegistration: bool(controls.recruiterRegistration, true),
    jobPosting: bool(controls.jobPosting, true),
    jobApplications: bool(controls.jobApplications, true),
  };
}

// Sign-in/sign-up পেজে শুধু নিরাপদ, public branding দেখানোর জন্য।
export async function getPublicPlatformSettings(): Promise<PublicPlatformSettings> {
  const database = await getDatabase();
  const document = await database
    .collection('platform_settings')
    .findOne({ _id: 'platform' as unknown as never });
  const branding =
    typeof document?.branding === 'object' && document.branding !== null
      ? (document.branding as Record<string, unknown>)
      : {};
  const controls =
    typeof document?.controls === 'object' && document.controls !== null
      ? (document.controls as Record<string, unknown>)
      : {};
  return {
    branding: {
      name: text(branding.name, defaults.branding.name),
      description: text(branding.description, defaults.branding.description),
      supportEmail: text(branding.supportEmail, defaults.branding.supportEmail),
      websiteUrl: text(branding.websiteUrl, defaults.branding.websiteUrl),
      logo: typeof branding.logo === 'string' ? branding.logo : null,
    },
    registration: {
      seekerEnabled: bool(controls.seekerRegistration, true),
      recruiterEnabled: bool(controls.recruiterRegistration, true),
    },
  };
}
