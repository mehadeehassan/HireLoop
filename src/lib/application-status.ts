export const applicationStatuses = [
  'New',
  'Reviewed',
  'Shortlisted',
  'Interview',
  'Rejected',
] as const;

export type ApplicationStatus = (typeof applicationStatuses)[number];
