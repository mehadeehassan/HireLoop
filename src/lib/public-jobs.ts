export type PublicJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  workMode: string;
  compensation: string;
  description: string;
  remote: boolean;
  applyUrl: string | null;
  department: string;
  category: string;
  createdAt: string | null;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  experience: string;
  companySize: string;
  industry: string;
  companyWebsite: string | null;
  companyLogo: string | null;
  companyDescription: string;
  verifiedEmployer: boolean;
};

export type PublicJobsResponse = {
  jobs: PublicJob[];
  newJobsThisMonth: number;
};

type BackendJob = Record<string, unknown>;

function asRecord(value: unknown): BackendJob | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as BackendJob)
    : null;
}

function getString(...values: unknown[]): string {
  return (
    values.find(
      (value): value is string => typeof value === 'string' && value.trim().length > 0,
    )?.trim() ?? ''
  );
}

function getTextList(value: unknown): string[] {
  const entries = Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : typeof value === 'string'
      ? value.split(/\r?\n/)
      : [];

  return entries
    .map((entry) => entry.replace(/^\s*(?:[•*-]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);
}

function getSafeUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function getJobCreatedAt(job: BackendJob): Date | null {
  const createdAt = job.createdAt;
  if (typeof createdAt === 'string' || typeof createdAt === 'number') {
    const date = new Date(createdAt);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const id = getString(job._id, job.id);
  if (/^[\da-f]{24}$/i.test(id)) {
    return new Date(Number.parseInt(id.slice(0, 8), 16) * 1000);
  }

  return null;
}

export function toPublicJob(value: unknown): PublicJob | null {
  const job = asRecord(value);
  if (!job) return null;

  const status = getString(job.status).toLowerCase();
  const isPublished = status === 'active' || job.isActive === true;
  const id = getString(job.id, job._id);
  const title = getString(job.title);
  if (!isPublished || !id || !title) return null;

  const location = getString(job.location);
  const workMode = /hybrid/i.test(location)
    ? 'Hybrid'
    : job.remote === true || job.isRemote === true || /remote/i.test(location)
      ? 'Remote'
      : 'On-site';
  const responsibility = job.responsibilities ?? job.responsibility;
  const qualifications = job.requirements ?? job.qualifications;
  const benefits = getTextList(job.benefits);

  return {
    id,
    title,
    company: getString(job.company) || 'Confidential company',
    location: location || (workMode === 'Remote' ? 'Remote' : 'Location not specified'),
    type: getString(job.type, job.employmentType) || 'Employment type not specified',
    workMode,
    compensation:
      getString(job.compensation, job.salaryRange, job.salary) || 'Compensation not listed',
    description:
      getString(job.description, job.summary, responsibility, qualifications) ||
      'Explore this opportunity and see how your experience can make an impact.',
    remote: workMode === 'Remote',
    applyUrl: getSafeUrl(job.applyUrl ?? job.applicationUrl),
    department: getString(job.department),
    category: getString(job.category),
    createdAt: getJobCreatedAt(job)?.toISOString() ?? null,
    responsibilities: getTextList(responsibility),
    requirements: getTextList(qualifications),
    benefits,
    experience: getString(job.experience, job.experienceLevel),
    companySize: getString(job.companySize, job.company_size),
    industry: getString(job.industry, job.category, job.department),
    companyWebsite: getSafeUrl(job.companyWebsite ?? job.website),
    companyLogo: getSafeUrl(job.companyLogo),
    companyDescription: getString(job.companyDescription),
    verifiedEmployer: job.verifiedEmployer === true,
  };
}
