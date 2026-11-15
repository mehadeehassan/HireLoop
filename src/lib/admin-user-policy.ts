export type ManagedRole = 'seeker' | 'recruiter' | 'admin';

export function isManagedRole(value: unknown): value is ManagedRole {
  return value === 'seeker' || value === 'recruiter' || value === 'admin';
}

export function isAccountActive(
  user: { banned?: boolean | null; banExpires?: Date | string | null },
  now = Date.now(),
) {
  if (user.banned !== true) return true;
  if (!user.banExpires) return false;
  const expiresAt = new Date(user.banExpires).getTime();
  return Number.isFinite(expiresAt) && expiresAt <= now;
}
