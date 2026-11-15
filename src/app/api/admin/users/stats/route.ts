import { getActiveAdminSession, isAdminSessionResponse } from '@/lib/admin-server-auth';
import { isAccountActive } from '@/lib/admin-user-policy';
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

const queryPageSize = 100;
const dayInMilliseconds = 24 * 60 * 60 * 1000;

async function listUsers(
  headers: Headers,
  query: {
    limit: number;
    offset: number;
    sortBy: string;
    sortDirection: 'asc' | 'desc';
    filterField?: string;
    filterValue?: string | boolean;
    filterOperator?: 'eq';
  },
) {
  return auth.api.listUsers({ query, headers });
}

async function countSuspendedUsers(headers: Headers) {
  let offset = 0;
  let total = 0;

  while (true) {
    const result = await listUsers(headers, {
      limit: queryPageSize,
      offset,
      sortBy: 'createdAt',
      sortDirection: 'desc',
      filterField: 'banned',
      filterValue: true,
      filterOperator: 'eq',
    });
    total += result.users.filter((user) => !isAccountActive(user)).length;
    if (result.users.length === 0 || offset + result.users.length >= result.total) break;
    offset += result.users.length;
  }

  return total;
}

async function countActiveAdmins(headers: Headers) {
  let offset = 0;
  let total = 0;

  while (true) {
    const result = await listUsers(headers, {
      limit: queryPageSize,
      offset,
      sortBy: 'createdAt',
      sortDirection: 'desc',
      filterField: 'role',
      filterValue: 'admin',
      filterOperator: 'eq',
    });
    total += result.users.filter(isAccountActive).length;
    if (result.users.length === 0 || offset + result.users.length >= result.total) break;
    offset += result.users.length;
  }

  return total;
}

async function countRecentSignups(headers: Headers, cutoff: number) {
  let offset = 0;
  let total = 0;

  while (true) {
    const result = await listUsers(headers, {
      limit: queryPageSize,
      offset,
      sortBy: 'createdAt',
      sortDirection: 'desc',
    });
    if (result.users.length === 0) break;

    let reachedOlderSignup = false;
    for (const user of result.users) {
      const createdAt = user.createdAt instanceof Date
        ? user.createdAt.getTime()
        : new Date(user.createdAt).getTime();
      if (Number.isFinite(createdAt) && createdAt >= cutoff) {
        total += 1;
      } else {
        reachedOlderSignup = true;
        break;
      }
    }
    if (reachedOlderSignup || offset + result.users.length >= result.total) break;
    offset += result.users.length;
  }

  return total;
}

export async function GET() {
  const sessionContext = await getActiveAdminSession();
  if (isAdminSessionResponse(sessionContext)) return sessionContext;

  try {
    const cutoff = Date.now() - dayInMilliseconds;
    const [allUsers, recruiters, suspendedUsers, activeAdmins, newSignups] = await Promise.all([
      listUsers(sessionContext.headers, {
        limit: 1,
        offset: 0,
        sortBy: 'createdAt',
        sortDirection: 'desc',
      }),
      listUsers(sessionContext.headers, {
        limit: 1,
        offset: 0,
        sortBy: 'createdAt',
        sortDirection: 'desc',
        filterField: 'role',
        filterValue: 'recruiter',
        filterOperator: 'eq',
      }),
      countSuspendedUsers(sessionContext.headers),
      countActiveAdmins(sessionContext.headers),
      countRecentSignups(sessionContext.headers, cutoff),
    ]);

    return NextResponse.json({
      activeUsers: Math.max(0, allUsers.total - suspendedUsers),
      recruiters: recruiters.total,
      suspendedUsers,
      newSignups,
      activeAdmins,
    });
  } catch (error) {
    console.error('Could not load admin user statistics through Better Auth', error);
    return NextResponse.json({ error: 'Could not load user statistics.' }, { status: 502 });
  }
}
