const blockedAdminMutationPaths = new Set([
  '/api/auth/admin/set-role',
  '/api/auth/admin/create-user',
  '/api/auth/admin/update-user',
  '/api/auth/admin/remove-user',
  '/api/auth/admin/ban-user',
  '/api/auth/admin/unban-user',
  '/api/auth/admin/set-user-password',
  '/api/auth/admin/revoke-user-session',
  '/api/auth/admin/revoke-user-sessions',
  '/api/auth/admin/impersonate-user',
  '/api/auth/admin/stop-impersonating',
]);

export function isBlockedAdminMutation(pathname: string, method: string) {
  return method.toUpperCase() === 'POST' && blockedAdminMutationPaths.has(pathname);
}

export function requestsRoleChange(pathname: string, method: string, body: unknown) {
  if (method.toUpperCase() !== 'POST' || pathname !== '/api/auth/update-user') return false;
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return false;

  if ('role' in body) return true;
  const data = (body as { data?: unknown }).data;
  return typeof data === 'object' && data !== null && !Array.isArray(data) && 'role' in data;
}
