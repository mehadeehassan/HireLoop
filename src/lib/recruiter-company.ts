import { getDatabase } from '@/lib/mongodb';
import type { PublicJob } from '@/lib/public-jobs';

type RecruiterCompanyProfile = {
  recruiterId: string;
  companyName?: string;
  companySize?: string;
  industry?: string;
  companyWebsite?: string;
  companyLogo?: string;
  companyDescription?: string;
};

function getString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function getSafeUrl(value: unknown): string | null {
  const rawUrl = getString(value);
  if (!rawUrl) return null;

  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function getRecruiterCompanyProfiles(
  jobs: unknown[],
): Promise<Map<string, RecruiterCompanyProfile>> {
  const recruiterIds = [
    ...new Set(
      jobs.flatMap((value) => {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) return [];
        const recruiterId = getString((value as Record<string, unknown>).recruiterId);
        return recruiterId ? [recruiterId] : [];
      }),
    ),
  ];

  if (recruiterIds.length === 0) return new Map();

  const db = await getDatabase();
  const profiles = await db
    .collection<RecruiterCompanyProfile>('recruiter_profiles')
    .find({ recruiterId: { $in: recruiterIds } })
    .toArray();

  return new Map(profiles.map((profile) => [profile.recruiterId, profile]));
}

export function addRecruiterCompanyProfile(
  job: PublicJob,
  value: unknown,
  profiles: Map<string, RecruiterCompanyProfile>,
): PublicJob {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return job;
  const recruiterId = getString((value as Record<string, unknown>).recruiterId);
  const profile = profiles.get(recruiterId);
  if (!profile) return job;

  const profileCompanyName = getString(profile.companyName);
  const jobCompanyName =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? getString((value as Record<string, unknown>).company)
      : '';
  if (
    profileCompanyName &&
    jobCompanyName &&
    profileCompanyName.toLocaleLowerCase() !== jobCompanyName.toLocaleLowerCase()
  ) {
    return job;
  }

  return {
    ...job,
    company: profileCompanyName || jobCompanyName || job.company,
    companySize: getString(profile.companySize) || job.companySize,
    industry: getString(profile.industry) || job.industry,
    companyWebsite: getSafeUrl(profile.companyWebsite) || job.companyWebsite,
    companyLogo: getSafeUrl(profile.companyLogo) || job.companyLogo,
    companyDescription: getString(profile.companyDescription) || job.companyDescription,
  };
}
