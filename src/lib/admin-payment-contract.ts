export type AdminPaymentUser = {
  name: string | null;
  email: string | null;
};

export type AdminPayment = {
  id: string;
  userId: string;
  user: AdminPaymentUser;
  role: string | null;
  plan: string | null;
  type?: 'tokens' | 'subscription';
  quantity?: number | null;
  amount: number | null;
  amountMinor: number | null;
  currency: string;
  status: string;
  paymentDate: string | null;
  paymentMethod: string | null;
  invoiceReference: string | null;
  stripeSessionId: string | null;
  stripeInvoiceId: string | null;
};

export type AdminPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AdminPaymentsList = {
  payments: AdminPayment[];
  pagination: AdminPagination;
  filterOptions: {
    roles: string[];
    statuses: string[];
    plans: string[];
  };
};

export type AdminRevenueEntry = {
  currency: string;
  amount: number;
  payments: number;
};

export type AdminSubscriptionRoleSummary = {
  total: number;
  active: number;
  paidActive: number;
  plans: {
    Starter: number;
    Growth: number;
    Premium: number;
  };
  statuses: Record<string, number>;
};

export type AdminPaymentOverview = {
  payments: {
    total: number;
    successful: number;
    pending: number;
    failed: number;
    cancelled: number;
  };
  revenue: AdminRevenueEntry[];
  subscriptions: {
    total: number;
    active: number;
    paidActive: number;
    byRole: {
      seeker: AdminSubscriptionRoleSummary;
      recruiter: AdminSubscriptionRoleSummary;
    };
  };
};

export type AdminSubscription = {
  userId: string;
  user: AdminPaymentUser;
  role: string;
  plan: string;
  status: string;
  startDate: string | null;
  expiryDate: string | null;
  used: number;
  limit: number;
  remaining: number;
  nextResetDate: string;
  billingInterval: string;
};

export type AdminSubscriptionsList = {
  subscriptions: AdminSubscription[];
  pagination: AdminPagination;
  filterOptions: {
    roles: string[];
    plans: string[];
    statuses: string[];
  };
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isAdminPaymentUser(value: unknown): value is AdminPaymentUser {
  return isRecord(value) && isNullableString(value.name) && isNullableString(value.email);
}

function isAdminPagination(value: unknown): value is AdminPagination {
  return (
    isRecord(value) &&
    isNonNegativeInteger(value.page) &&
    isNonNegativeInteger(value.pageSize) &&
    isNonNegativeInteger(value.total) &&
    isNonNegativeInteger(value.totalPages)
  );
}

export function isAdminPayment(value: unknown): value is AdminPayment {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.userId === 'string' &&
    isAdminPaymentUser(value.user) &&
    isNullableString(value.role) &&
    isNullableString(value.plan) &&
    (value.type === undefined || value.type === 'tokens' || value.type === 'subscription') &&
    (value.quantity === undefined || value.quantity === null || isNonNegativeInteger(value.quantity)) &&
    (value.amount === null || isFiniteNonNegativeNumber(value.amount)) &&
    (value.amountMinor === null || isNonNegativeInteger(value.amountMinor)) &&
    typeof value.currency === 'string' &&
    typeof value.status === 'string' &&
    isNullableString(value.paymentDate) &&
    isNullableString(value.paymentMethod) &&
    isNullableString(value.invoiceReference) &&
    isNullableString(value.stripeSessionId) &&
    isNullableString(value.stripeInvoiceId)
  );
}

export function isAdminPaymentsList(value: unknown): value is AdminPaymentsList {
  return (
    isRecord(value) &&
    Array.isArray(value.payments) &&
    value.payments.every(isAdminPayment) &&
    isAdminPagination(value.pagination) &&
    isRecord(value.filterOptions) &&
    isStringArray(value.filterOptions.roles) &&
    isStringArray(value.filterOptions.statuses) &&
    isStringArray(value.filterOptions.plans)
  );
}

function isRevenueEntry(value: unknown): value is AdminRevenueEntry {
  return (
    isRecord(value) &&
    typeof value.currency === 'string' &&
    isFiniteNonNegativeNumber(value.amount) &&
    isNonNegativeInteger(value.payments)
  );
}

function isSubscriptionRoleSummary(value: unknown): value is AdminSubscriptionRoleSummary {
  return (
    isRecord(value) &&
    isNonNegativeInteger(value.total) &&
    isNonNegativeInteger(value.active) &&
    isNonNegativeInteger(value.paidActive) &&
    isRecord(value.plans) &&
    isNonNegativeInteger(value.plans.Starter) &&
    isNonNegativeInteger(value.plans.Growth) &&
    isNonNegativeInteger(value.plans.Premium) &&
    isRecord(value.statuses) &&
    Object.values(value.statuses).every(isNonNegativeInteger)
  );
}

export function isAdminPaymentOverview(value: unknown): value is AdminPaymentOverview {
  return (
    isRecord(value) &&
    isRecord(value.payments) &&
    isNonNegativeInteger(value.payments.total) &&
    isNonNegativeInteger(value.payments.successful) &&
    isNonNegativeInteger(value.payments.pending) &&
    isNonNegativeInteger(value.payments.failed) &&
    isNonNegativeInteger(value.payments.cancelled) &&
    Array.isArray(value.revenue) &&
    value.revenue.every(isRevenueEntry) &&
    isRecord(value.subscriptions) &&
    isNonNegativeInteger(value.subscriptions.total) &&
    isNonNegativeInteger(value.subscriptions.active) &&
    isNonNegativeInteger(value.subscriptions.paidActive) &&
    isRecord(value.subscriptions.byRole) &&
    isSubscriptionRoleSummary(value.subscriptions.byRole.seeker) &&
    isSubscriptionRoleSummary(value.subscriptions.byRole.recruiter)
  );
}

export function isAdminSubscription(value: unknown): value is AdminSubscription {
  return (
    isRecord(value) &&
    typeof value.userId === 'string' &&
    isAdminPaymentUser(value.user) &&
    typeof value.role === 'string' &&
    typeof value.plan === 'string' &&
    typeof value.status === 'string' &&
    isNullableString(value.startDate) &&
    isNullableString(value.expiryDate) &&
    isNonNegativeInteger(value.used) &&
    isNonNegativeInteger(value.limit) &&
    isNonNegativeInteger(value.remaining) &&
    typeof value.nextResetDate === 'string' &&
    typeof value.billingInterval === 'string'
  );
}

export function isAdminSubscriptionsList(value: unknown): value is AdminSubscriptionsList {
  return (
    isRecord(value) &&
    Array.isArray(value.subscriptions) &&
    value.subscriptions.every(isAdminSubscription) &&
    isAdminPagination(value.pagination) &&
    isRecord(value.filterOptions) &&
    isStringArray(value.filterOptions.roles) &&
    isStringArray(value.filterOptions.plans) &&
    isStringArray(value.filterOptions.statuses)
  );
}
