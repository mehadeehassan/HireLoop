export const adminNotificationTypes = {
  user_registered: ['New account registration', 'A new seeker or recruiter account was created.'],
  payment_failed: ['Important payment failures', 'A subscription payment failed.'],
  payment_succeeded: ['Payment succeeded', 'A subscription payment was received.'],
  subscription_changed: ['Subscription changed', 'A subscription changed or ended.'],
  job_posted: ['Job posted', 'A recruiter posted a job.'],
  job_deleted_by_admin: ['Admin deleted a job', 'An admin soft-deleted a job.'],
  application_submitted: ['Application submitted', 'A seeker submitted a job application.'],
  company_submitted: ['Company submitted', 'A company profile was submitted.'],
  admin_role_or_suspension_changed: ['Admin account change', 'An admin changed a user role or suspension.'],
  quota_limit_reached: ['Quota limit reached', 'A user reached a monthly usage limit.'],
  critical_system_error: ['Critical system/API errors', 'A critical service error occurred.'],
  activity_digest: ['Platform activity digest', 'A platform activity summary is available.'],
} as const;

export type AdminNotificationType = keyof typeof adminNotificationTypes;
export type AdminNotification = {
  id: string;
  type: AdminNotificationType;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  link: string;
  createdAt: string;
  read: boolean;
};
export type AdminNotificationList = {
  notifications: AdminNotification[];
  nextCursor: string | null;
  unreadCount: number;
};
export type AdminNotificationPreference = {
  type: AdminNotificationType;
  label: string;
  description: string;
  globalEnabled: boolean;
  adminEnabled: boolean;
  channels: { inApp: 'active'; email: 'not_configured'; push: 'not_configured' };
};
export type AdminNotificationPreferences = { types: Record<AdminNotificationType, AdminNotificationPreference> };

const typeSet = new Set<string>(Object.keys(adminNotificationTypes));
export function isAdminNotificationList(value: unknown): value is AdminNotificationList {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  return Array.isArray(data.notifications) && data.notifications.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const notification = item as Record<string, unknown>;
    return typeof notification.id === 'string' && typeSet.has(String(notification.type)) &&
      ['info', 'warning', 'critical'].includes(String(notification.severity)) &&
      typeof notification.title === 'string' && typeof notification.message === 'string' &&
      typeof notification.link === 'string' && typeof notification.createdAt === 'string' &&
      typeof notification.read === 'boolean';
  }) && (data.nextCursor === null || typeof data.nextCursor === 'string') &&
    Number.isSafeInteger(data.unreadCount) && Number(data.unreadCount) >= 0;
}
export function isAdminNotificationPreferences(value: unknown): value is AdminNotificationPreferences {
  if (!value || typeof value !== 'object' || !('types' in value)) return false;
  const types = (value as { types: unknown }).types;
  return Boolean(types && typeof types === 'object' && Object.keys(adminNotificationTypes).every((key) => {
    const item = (types as Record<string, unknown>)[key];
    if (!item || typeof item !== 'object') return false;
    const preference = item as Record<string, unknown>;
    return preference.type === key && typeof preference.label === 'string' &&
      typeof preference.description === 'string' && typeof preference.globalEnabled === 'boolean' &&
      typeof preference.adminEnabled === 'boolean' && Boolean(preference.channels && typeof preference.channels === 'object');
  }));
}
