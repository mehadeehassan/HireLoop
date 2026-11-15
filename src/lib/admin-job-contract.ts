export type AdminJobRecruiter = {
  id: string;
  name: string | null;
  email?: string | null;
};

export type AdminJob = {
  id: string;
  title: string;
  company: string;
  recruiterId: string;
  recruiter: AdminJobRecruiter | null;
  category: string | null;
  department: string | null;
  location: string | null;
  type: string | null;
  compensation: string | null;
  remote: boolean | null;
  status: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  deadline: string | null;
  responsibility: string | null;
  qualifications: string | null;
  applicationCount: number;
};

export type AdminJobListItem = Pick<
  AdminJob,
  | 'id'
  | 'title'
  | 'company'
  | 'recruiterId'
  | 'recruiter'
  | 'category'
  | 'department'
  | 'location'
  | 'type'
  | 'compensation'
  | 'remote'
  | 'status'
  | 'createdAt'
  | 'deadline'
  | 'applicationCount'
>;

export type AdminJobsList = {
  jobs: AdminJobListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalJobs: number;
    activeJobs: number;
    closedJobs: number;
    totalApplications: number;
  };
  filterOptions: {
    categories: string[];
    locations: string[];
    types: string[];
  };
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

export function isAdminJob(value: unknown): value is AdminJob {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.company === 'string' &&
    typeof value.recruiterId === 'string' &&
    (value.recruiter === null ||
      (isRecord(value.recruiter) &&
        typeof value.recruiter.id === 'string' &&
        isNullableString(value.recruiter.name) &&
        (value.recruiter.email === undefined || isNullableString(value.recruiter.email)))) &&
    isNullableString(value.category) &&
    isNullableString(value.department) &&
    isNullableString(value.location) &&
    isNullableString(value.type) &&
    isNullableString(value.compensation) &&
    (value.remote === null || typeof value.remote === 'boolean') &&
    isNullableString(value.status) &&
    isNullableString(value.createdAt) &&
    isNullableString(value.updatedAt) &&
    isNullableString(value.deadline) &&
    isNullableString(value.responsibility) &&
    isNullableString(value.qualifications) &&
    typeof value.applicationCount === 'number' &&
    Number.isSafeInteger(value.applicationCount) &&
    value.applicationCount >= 0
  );
}

function isAdminJobListItem(value: unknown): value is AdminJobListItem {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.company === 'string' &&
    typeof value.recruiterId === 'string' &&
    (value.recruiter === null ||
      (isRecord(value.recruiter) &&
        typeof value.recruiter.id === 'string' &&
        isNullableString(value.recruiter.name))) &&
    isNullableString(value.category) &&
    isNullableString(value.department) &&
    isNullableString(value.location) &&
    isNullableString(value.type) &&
    isNullableString(value.compensation) &&
    (value.remote === null || typeof value.remote === 'boolean') &&
    isNullableString(value.status) &&
    isNullableString(value.createdAt) &&
    isNullableString(value.deadline) &&
    typeof value.applicationCount === 'number' &&
    Number.isSafeInteger(value.applicationCount) &&
    value.applicationCount >= 0
  );
}

export function isAdminJobsList(value: unknown): value is AdminJobsList {
  return (
    isRecord(value) &&
    Array.isArray(value.jobs) &&
    value.jobs.every(isAdminJobListItem) &&
    isRecord(value.pagination) &&
    typeof value.pagination.page === 'number' &&
    Number.isSafeInteger(value.pagination.page) &&
    typeof value.pagination.pageSize === 'number' &&
    Number.isSafeInteger(value.pagination.pageSize) &&
    typeof value.pagination.total === 'number' &&
    Number.isSafeInteger(value.pagination.total) &&
    typeof value.pagination.totalPages === 'number' &&
    Number.isSafeInteger(value.pagination.totalPages) &&
    isRecord(value.summary) &&
    typeof value.summary.totalJobs === 'number' &&
    Number.isSafeInteger(value.summary.totalJobs) &&
    typeof value.summary.activeJobs === 'number' &&
    Number.isSafeInteger(value.summary.activeJobs) &&
    typeof value.summary.closedJobs === 'number' &&
    Number.isSafeInteger(value.summary.closedJobs) &&
    typeof value.summary.totalApplications === 'number' &&
    Number.isSafeInteger(value.summary.totalApplications) &&
    isRecord(value.filterOptions) &&
    Array.isArray(value.filterOptions.categories) &&
    value.filterOptions.categories.every((item) => typeof item === 'string') &&
    Array.isArray(value.filterOptions.locations) &&
    value.filterOptions.locations.every((item) => typeof item === 'string') &&
    Array.isArray(value.filterOptions.types) &&
    value.filterOptions.types.every((item) => typeof item === 'string')
  );
}
