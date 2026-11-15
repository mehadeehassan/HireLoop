import { getActiveAdminSession, isAdminSessionResponse } from '@/lib/admin-server-auth';
import { isAccountActive, isManagedRole } from '@/lib/admin-user-policy';
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

const pageSizes = new Set([10, 20, 50]);
const sortableFields = new Set(['name', 'email', 'role', 'createdAt']);
const searchFields = new Set(['name', 'email']);
const statuses = new Set(['all', 'active', 'suspended']);
type SortableField = 'name' | 'email' | 'role' | 'createdAt';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseInteger(value: string | null, fallback: number) {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function toIsoDate(value: unknown) {
  if (!(value instanceof Date) && typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function serializeUser(user: {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: string | null;
  createdAt: Date | string;
  banned?: boolean | null;
  banExpires?: Date | string | null;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image || null,
    role: user.role || null,
    createdAt: toIsoDate(user.createdAt),
    banned: user.banned === true,
    banExpires: toIsoDate(user.banExpires),
  };
}

async function getBannedUsers(
  headers: Headers,
  search: { searchValue?: string; searchField?: 'name' | 'email'; searchOperator?: 'contains' },
  sortBy: SortableField,
  sortDirection: 'asc' | 'desc',
) {
  const users = [];
  let offset = 0;
  let total = 0;

  while (true) {
    const result = await auth.api.listUsers({
      query: {
        ...search,
        limit: 100,
        offset,
        sortBy,
        sortDirection,
        filterField: 'banned',
        filterValue: true,
        filterOperator: 'eq',
      },
      headers,
    });
    users.push(...result.users);
    total = result.total;
    if (result.users.length === 0 || offset + result.users.length >= total) break;
    offset += result.users.length;
  }

  return users;
}

function compareUsers(
  left: { id: string; name: string; email: string; role?: string | null; createdAt: Date | string },
  right: { id: string; name: string; email: string; role?: string | null; createdAt: Date | string },
  sortBy: SortableField,
  sortDirection: 'asc' | 'desc',
) {
  const leftValue = sortBy === 'createdAt'
    ? (left.createdAt instanceof Date ? left.createdAt.getTime() : new Date(left.createdAt).getTime())
    : String(left[sortBy] ?? '');
  const rightValue = sortBy === 'createdAt'
    ? (right.createdAt instanceof Date ? right.createdAt.getTime() : new Date(right.createdAt).getTime())
    : String(right[sortBy] ?? '');
  const valueOrder = leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
  const tieOrder = left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  const order = valueOrder || tieOrder;
  return sortDirection === 'asc' ? order : -order;
}

async function getStatusFilteredUsers({
  headers,
  search,
  sortBy,
  sortDirection,
  status,
  offset,
  pageSize,
}: {
  headers: Headers;
  search: { searchValue?: string; searchField?: 'name' | 'email'; searchOperator?: 'contains' };
  sortBy: SortableField;
  sortDirection: 'asc' | 'desc';
  status: 'active' | 'suspended';
  offset: number;
  pageSize: number;
}) {
  const bannedUsers = await getBannedUsers(headers, search, sortBy, sortDirection);
  const activeBannedUsers = bannedUsers.filter(isAccountActive);
  const suspendedUsers = bannedUsers.filter((user) => !isAccountActive(user));

  if (status === 'suspended') {
    return {
      users: suspendedUsers.slice(offset, offset + pageSize),
      total: suspendedUsers.length,
    };
  }

  const unbannedUsers = await auth.api.listUsers({
    query: {
      ...search,
      limit: pageSize + activeBannedUsers.length,
      offset: Math.max(0, offset - activeBannedUsers.length),
      sortBy,
      sortDirection,
      filterField: 'banned',
      filterValue: false,
      filterOperator: 'eq',
    },
    headers,
  });
  const users = [...unbannedUsers.users, ...activeBannedUsers]
    .sort((left, right) => compareUsers(left, right, sortBy, sortDirection));

  return {
    users: users.slice(offset, offset + pageSize),
    total: unbannedUsers.total + activeBannedUsers.length,
  };
}

export async function GET(request: Request) {
  const sessionContext = await getActiveAdminSession();
  if (isAdminSessionResponse(sessionContext)) return sessionContext;

  const params = new URL(request.url).searchParams;
  const page = parseInteger(params.get('page'), 1);
  const pageSize = parseInteger(params.get('pageSize'), 10);
  const searchValue = params.get('search')?.trim() || '';
  const searchField = params.get('searchField') || 'email';
  const normalizedSearchField: 'name' | 'email' = searchField === 'name' ? 'name' : 'email';
  const roleFilter = params.get('role') || 'all';
  const statusFilter = params.get('status') || 'all';
  const sortBy = params.get('sortBy') || 'createdAt';
  const sortDirection = params.get('sortDirection') || 'desc';
  const normalizedSortDirection = sortDirection === 'asc' ? 'asc' : 'desc';
  const normalizedSortBy: SortableField =
    sortBy === 'name' || sortBy === 'email' || sortBy === 'role' || sortBy === 'createdAt'
      ? sortBy
      : 'createdAt';
  const normalizedStatusFilter =
    statusFilter === 'active' || statusFilter === 'suspended' ? statusFilter : 'all';

  if (
    page === null ||
    page < 1 ||
    pageSize === null ||
    !pageSizes.has(pageSize) ||
    searchValue.length > 120 ||
    !searchFields.has(searchField) ||
    (roleFilter !== 'all' && !isManagedRole(roleFilter)) ||
    !statuses.has(statusFilter) ||
    (roleFilter !== 'all' && statusFilter !== 'all') ||
    !sortableFields.has(sortBy) ||
    !['asc', 'desc'].includes(sortDirection) ||
    (page - 1) * pageSize > Number.MAX_SAFE_INTEGER
  ) {
    return NextResponse.json({ error: 'The user list query is invalid.' }, { status: 400 });
  }

  const filter = roleFilter !== 'all'
    ? {
        filterField: 'role' as const,
        filterValue: roleFilter,
        filterOperator: 'eq' as const,
      }
    : normalizedStatusFilter !== 'all'
      ? {
          filterField: 'banned' as const,
          filterValue: normalizedStatusFilter === 'suspended',
          filterOperator: 'eq' as const,
        }
      : {};

  try {
    const search: {
      searchValue?: string;
      searchField?: 'name' | 'email';
      searchOperator?: 'contains';
    } = searchValue
      ? {
          searchValue,
          searchField: normalizedSearchField,
          searchOperator: 'contains' as const,
        }
      : {};
    const offset = (page - 1) * pageSize;
    const result = normalizedStatusFilter !== 'all'
      ? await getStatusFilteredUsers({
          headers: sessionContext.headers,
          search,
          sortBy: normalizedSortBy,
          sortDirection: normalizedSortDirection,
          status: normalizedStatusFilter,
          offset,
          pageSize,
        })
      : await auth.api.listUsers({
          query: {
            ...search,
            limit: pageSize,
            offset,
            sortBy: normalizedSortBy,
            sortDirection: normalizedSortDirection,
            ...filter,
          },
          headers: sessionContext.headers,
        });

    if (
      !isRecord(result) ||
      !Array.isArray(result.users) ||
      typeof result.total !== 'number' ||
      !Number.isSafeInteger(result.total) ||
      result.total < 0
    ) {
      console.error('Better Auth returned an invalid admin user list');
      return NextResponse.json({ error: 'The user service returned invalid data.' }, { status: 502 });
    }

    return NextResponse.json({
      users: result.users.map(serializeUser),
      total: result.total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Could not load users through the Better Auth admin API', error);
    return NextResponse.json({ error: 'Could not load users.' }, { status: 502 });
  }
}
