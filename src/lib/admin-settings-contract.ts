export type AdminPlatformBranding = {
  name: string;
  description: string;
  supportEmail: string;
  websiteUrl: string;
  logo: string | null;
};

export type AdminPlatformControls = {
  seekerRegistration: boolean;
  recruiterRegistration: boolean;
  jobPosting: boolean;
  jobApplications: boolean;
  notifications: Record<string, boolean>;
};

export type AdminPlanLimit = {
  role: 'seeker' | 'recruiter';
  plan: 'Starter' | 'Growth' | 'Premium';
  limit: number | null;
  editable: boolean;
};

export type AdminNotificationFlags = {
  registration: boolean;
  paymentFailure: boolean;
  platformActivity: boolean;
  criticalErrors: boolean;
};

export type AdminSettings = {
  settings: {
    branding: AdminPlatformBranding;
    controls: AdminPlatformControls;
    updatedAt: string | null;
    updatedBy: string | null;
  };
  planLimits: {
    seeker: AdminPlanLimit[];
    recruiter: AdminPlanLimit[];
  };
  resumeRules: {
    maxBytes: number;
    formats: string[];
  };
  jobRules: {
    responsibility: number;
    qualifications: number;
  };
  notifications: {
    global: AdminNotificationFlags;
    personal: AdminNotificationFlags;
    capabilities: AdminNotificationFlags;
    deliveryConfigured: boolean;
  };
};

export type AdminAuditLog = {
  id: string;
  actorId: string;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  section: string;
  field: string;
  previousValue: string | number | boolean | null;
  newValue: string | number | boolean | null;
  createdAt: string | null;
};

export type AdminAuditLogsList = {
  logs: AdminAuditLog[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filterOptions: {
    sections: string[];
  };
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isBranding(value: unknown): value is AdminPlatformBranding {
  return (
    isRecord(value) &&
    isString(value.name) &&
    isString(value.description) &&
    isString(value.supportEmail) &&
    isString(value.websiteUrl) &&
    isNullableString(value.logo)
  );
}

function isControls(value: unknown): value is AdminPlatformControls {
  return (
    isRecord(value) &&
    isBoolean(value.seekerRegistration) &&
    isBoolean(value.recruiterRegistration) &&
    isBoolean(value.jobPosting) &&
    isBoolean(value.jobApplications) &&
    isRecord(value.notifications) &&
    Object.values(value.notifications).every(isBoolean)
  );
}

function isPlanLimit(value: unknown): value is AdminPlanLimit {
  return (
    isRecord(value) &&
    (value.role === 'seeker' || value.role === 'recruiter') &&
    (value.plan === 'Starter' || value.plan === 'Growth' || value.plan === 'Premium') &&
    (value.limit === null || isNonNegativeInteger(value.limit)) &&
    isBoolean(value.editable)
  );
}

function isPlanLimitList(value: unknown): value is AdminPlanLimit[] {
  return Array.isArray(value) && value.every(isPlanLimit);
}

function isNotificationFlags(value: unknown): value is AdminNotificationFlags {
  return (
    isRecord(value) &&
    isBoolean(value.registration) &&
    isBoolean(value.paymentFailure) &&
    isBoolean(value.platformActivity) &&
    isBoolean(value.criticalErrors)
  );
}

export function isAdminSettings(value: unknown): value is AdminSettings {
  return (
    isRecord(value) &&
    isRecord(value.settings) &&
    isBranding(value.settings.branding) &&
    isControls(value.settings.controls) &&
    isNullableString(value.settings.updatedAt) &&
    isNullableString(value.settings.updatedBy) &&
    isRecord(value.planLimits) &&
    isPlanLimitList(value.planLimits.seeker) &&
    isPlanLimitList(value.planLimits.recruiter) &&
    isRecord(value.resumeRules) &&
    isNonNegativeInteger(value.resumeRules.maxBytes) &&
    Array.isArray(value.resumeRules.formats) &&
    value.resumeRules.formats.every(isString) &&
    isRecord(value.jobRules) &&
    isNonNegativeInteger(value.jobRules.responsibility) &&
    isNonNegativeInteger(value.jobRules.qualifications) &&
    isRecord(value.notifications) &&
    isNotificationFlags(value.notifications.global) &&
    isNotificationFlags(value.notifications.personal) &&
    isNotificationFlags(value.notifications.capabilities) &&
    isBoolean(value.notifications.deliveryConfigured)
  );
}

function isAuditValue(value: unknown): value is string | number | boolean | null {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

function isAuditLog(value: unknown): value is AdminAuditLog {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.actorId) &&
    isNullableString(value.actorName) &&
    isNullableString(value.actorEmail) &&
    isString(value.action) &&
    isString(value.section) &&
    isString(value.field) &&
    isAuditValue(value.previousValue) &&
    isAuditValue(value.newValue) &&
    isNullableString(value.createdAt)
  );
}

export function isAdminAuditLogsList(value: unknown): value is AdminAuditLogsList {
  return (
    isRecord(value) &&
    Array.isArray(value.logs) &&
    value.logs.every(isAuditLog) &&
    isRecord(value.pagination) &&
    isNonNegativeInteger(value.pagination.page) &&
    isNonNegativeInteger(value.pagination.pageSize) &&
    isNonNegativeInteger(value.pagination.total) &&
    isNonNegativeInteger(value.pagination.totalPages) &&
    isRecord(value.filterOptions) &&
    Array.isArray(value.filterOptions.sections) &&
    value.filterOptions.sections.every(isString)
  );
}
