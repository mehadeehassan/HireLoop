export type ManagedCompany = {
  id: string;
  name: string;
  logo: string | null;
  hasLogo: boolean;
  website: string | null;
  industry: string | null;
  location: string | null;
  description: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  jobCount?: number;
};

export type CompanyRelatedJob = {
  id: string;
  title: string;
  status: string | null;
  location: string | null;
  createdAt: string | null;
};

export type ManagedCompanyList = {
  companies: ManagedCompany[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type ManagedCompanyDetails = {
  company: ManagedCompany;
  jobs: CompanyRelatedJob[];
  jobsPageSize: 20;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isManagedCompany(value: unknown): value is ManagedCompany {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (value.logo === null || typeof value.logo === 'string') &&
    typeof value.hasLogo === 'boolean' &&
    (value.website === null || typeof value.website === 'string') &&
    (value.industry === null || typeof value.industry === 'string') &&
    (value.location === null || typeof value.location === 'string') &&
    (value.description === null || typeof value.description === 'string') &&
    (value.createdAt === null || typeof value.createdAt === 'string') &&
    (value.updatedAt === null || typeof value.updatedAt === 'string') &&
    (value.jobCount === undefined ||
      (typeof value.jobCount === 'number' &&
        Number.isSafeInteger(value.jobCount) &&
        value.jobCount >= 0))
  );
}

export function isManagedCompanyList(value: unknown): value is ManagedCompanyList {
  return (
    isRecord(value) &&
    Array.isArray(value.companies) &&
    value.companies.every(isManagedCompany) &&
    isRecord(value.pagination) &&
    typeof value.pagination.page === 'number' &&
    Number.isSafeInteger(value.pagination.page) &&
    typeof value.pagination.pageSize === 'number' &&
    Number.isSafeInteger(value.pagination.pageSize) &&
    typeof value.pagination.total === 'number' &&
    Number.isSafeInteger(value.pagination.total) &&
    typeof value.pagination.totalPages === 'number' &&
    Number.isSafeInteger(value.pagination.totalPages)
  );
}

function isRelatedJob(value: unknown): value is CompanyRelatedJob {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    (value.status === null || typeof value.status === 'string') &&
    (value.location === null || typeof value.location === 'string') &&
    (value.createdAt === null || typeof value.createdAt === 'string')
  );
}

export function isManagedCompanyDetails(value: unknown): value is ManagedCompanyDetails {
  return (
    isRecord(value) &&
    isManagedCompany(value.company) &&
    Array.isArray(value.jobs) &&
    value.jobs.every(isRelatedJob) &&
    value.jobsPageSize === 20
  );
}
