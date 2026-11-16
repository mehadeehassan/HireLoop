'use client';

import {
  Ban,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Mail,
  MoreHorizontal,
  RefreshCw,
  Search,
  Shield,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useSession } from '@/lib/auth-client';
import { isAccountActive, isManagedRole, type ManagedRole } from '@/lib/admin-user-policy';
import { formatDisplayDate } from '@/lib/date-format';
import DashboardAvatar from '@/components/dashboard/shared/DashboardAvatar';

type AdminUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string | null;
  createdAt: string | null;
  banned: boolean;
  banExpires: string | null;
};
type UserListData = {
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
};
type UserStats = {
  activeUsers: number;
  recruiters: number;
  suspendedUsers: number;
  newSignups: number;
  activeAdmins: number;
};
type UserAction =
  | { user: AdminUser; action: 'role_change'; role: ManagedRole }
  | { user: AdminUser; action: 'suspend' | 'unsuspend' };
type UserDialogState =
  | { type: 'actions'; user: AdminUser }
  | { type: 'confirm'; action: UserAction };
type SortField = 'name' | 'email' | 'role' | 'createdAt';
type SortDirection = 'asc' | 'desc';

const pageSizeOptions = [10, 20, 50] as const;
const roles: ManagedRole[] = ['seeker', 'recruiter', 'admin'];

const metrics = [
  { label: 'Total Active Users', key: 'activeUsers', helper: 'Accounts with access', icon: Users },
  { label: 'Recruiter Accounts', key: 'recruiters', helper: 'Assigned recruiter role', icon: BriefcaseBusiness },
  { label: 'Suspended Accounts', key: 'suspendedUsers', helper: 'Currently suspended', icon: Shield },
  { label: 'New Signups (24h)', key: 'newSignups', helper: 'Registered in the last day', icon: UserPlus },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAdminUser(value: unknown): value is AdminUser {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.email === 'string' &&
    (value.image === null || typeof value.image === 'string') &&
    (value.role === null || typeof value.role === 'string') &&
    (value.createdAt === null || typeof value.createdAt === 'string') &&
    typeof value.banned === 'boolean' &&
    (value.banExpires === null || typeof value.banExpires === 'string')
  );
}

function isUserListData(value: unknown): value is UserListData {
  return (
    isRecord(value) &&
    Array.isArray(value.users) &&
    value.users.every(isAdminUser) &&
    typeof value.total === 'number' &&
    Number.isSafeInteger(value.total) &&
    value.total >= 0 &&
    typeof value.page === 'number' &&
    typeof value.pageSize === 'number'
  );
}

function isUserStats(value: unknown): value is UserStats {
  return (
    isRecord(value) &&
    ['activeUsers', 'recruiters', 'suspendedUsers', 'newSignups', 'activeAdmins'].every((key) => (
      typeof value[key] === 'number' &&
      Number.isSafeInteger(value[key]) &&
      value[key] >= 0
    ))
  );
}

function getErrorMessage(payload: unknown, fallback: string) {
  return isRecord(payload) && typeof payload.error === 'string' ? payload.error : fallback;
}

function roleClass(role: string | null) {
  switch (role) {
    case 'recruiter':
      return 'border-[#9b71ff]/25 bg-[#8d68ff]/15 text-[#c2aaff]';
    case 'admin':
      return 'border-[#6a95ff]/25 bg-[#608cff]/15 text-[#9cbaff]';
    default:
      return 'border-white/[0.08] bg-white/[0.06] text-[#c6c6ce]';
  }
}

function statusStyle(user: AdminUser) {
  const suspended = !isAccountActive(user);
  return suspended
    ? { label: 'Suspended', className: 'bg-rose-400/10 text-rose-400', suspended: true }
    : { label: 'Active', className: 'bg-emerald-400/10 text-emerald-400', suspended: false };
}

function csvCell(value: string) {
  const safeValue = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

function exportUsers(users: AdminUser[]) {
  const rows = [
    ['Name', 'Email', 'Role', 'Status', 'Join Date'],
    ...users.map((user) => [
      user.name,
      user.email,
      user.role || 'Unknown',
      statusStyle(user).label,
      formatDisplayDate(user.createdAt),
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'hireloop-users.csv';
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function UserActions({
  user,
  currentAdminId,
  activeAdminCount,
  disabled,
  onOpen,
}: {
  user: AdminUser;
  currentAdminId?: string;
  activeAdminCount: number | null;
  disabled: boolean;
  onOpen: (user: AdminUser) => void;
}) {
  const currentUser = user.id === currentAdminId;
  const status = statusStyle(user);
  const isLastActiveAdmin =
    user.role === 'admin' &&
    !status.suspended &&
    activeAdminCount !== null &&
    activeAdminCount <= 1;
  if (currentUser || isLastActiveAdmin) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[10px] text-[#85858d]">
        <Shield aria-hidden="true" className="size-3" />
        {currentUser ? 'Your account' : 'Last active admin'}
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onOpen(user)}
      aria-label={`Manage ${user.name}`}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.09] bg-white/[0.025] px-2.5 text-[10px] font-medium text-[#c8c8d0] transition hover:border-[#9b71ff]/35 hover:bg-[#8d68ff]/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9b71ff]/70 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <MoreHorizontal aria-hidden="true" className="size-3.5" />
      Manage
    </button>
  );
}

function UserTableSkeleton() {
  return (
    <div aria-label="Loading users" className="animate-pulse space-y-3 p-5">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="h-12 rounded-md bg-white/[0.04]" />
      ))}
    </div>
  );
}

function UserRow({
  user,
  currentAdminId,
  activeAdminCount,
  disabled,
  onOpenManage,
}: {
  user: AdminUser;
  currentAdminId?: string;
  activeAdminCount: number | null;
  disabled: boolean;
  onOpenManage: (user: AdminUser) => void;
}) {
  const status = statusStyle(user);

  return (
    <tr className="border-b border-white/[0.055] last:border-0 transition-colors hover:bg-white/[0.02]">
      <td className="px-4 py-3.5 sm:px-5">
        <div className="flex min-w-[150px] items-center gap-2.5">
          <DashboardAvatar src={user.image} name={user.name} size="sm" />
          <span className="max-w-[160px] truncate text-[11px] font-medium text-[#e2e2e7]">{user.name}</span>
        </div>
      </td>
      <td className="px-3 py-3.5">
        <span className="block max-w-[190px] truncate text-[10px] text-[#a2a2aa]">{user.email}</span>
      </td>
      <td className="px-3 py-3.5">
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] ${roleClass(user.role)}`}>
          {user.role ? user.role[0].toUpperCase() + user.role.slice(1) : 'Unknown'}
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-3.5 text-[10px] text-[#a2a2aa]">
        {formatDisplayDate(user.createdAt)}
      </td>
      <td className="px-3 py-3.5">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] ${status.className}`}>
          <span className="size-1.5 rounded-full bg-current" />
          {status.label}
        </span>
      </td>
      <td className="min-w-[120px] px-4 py-3.5 sm:px-5">
        <UserActions
          user={user}
          currentAdminId={currentAdminId}
          activeAdminCount={activeAdminCount}
          disabled={disabled}
          onOpen={onOpenManage}
        />
      </td>
    </tr>
  );
}

export default function AdminUsersManager() {
  const { data: session } = useSession();
  const [searchInput, setSearchInput] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [searchField, setSearchField] = useState<'name' | 'email'>('email');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof pageSizeOptions)[number]>(10);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [statsRetry, setStatsRetry] = useState(0);
  const [listState, setListState] = useState<{ key: string; data: UserListData } | null>(null);
  const [listError, setListError] = useState<{ key: string; message: string } | null>(null);
  const [statsState, setStatsState] = useState<{ key: number; data: UserStats } | null>(null);
  const [statsError, setStatsError] = useState<{ key: number; message: string } | null>(null);
  const [userDialog, setUserDialog] = useState<UserDialogState | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [mutatingUserId, setMutatingUserId] = useState<string | null>(null);
  const userActionDialog = useRef<HTMLDialogElement>(null);

  const listKey = [
    page,
    pageSize,
    searchValue,
    searchField,
    roleFilter,
    statusFilter,
    sortBy,
    sortDirection,
    refreshVersion,
  ].join('|');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextSearch = searchInput.trim();
      if (nextSearch !== searchValue) {
        setSearchValue(nextSearch);
        setPage(1);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, searchValue]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      searchField,
      sortBy,
      sortDirection,
    });
    if (searchValue) params.set('search', searchValue);
    if (roleFilter !== 'all') params.set('role', roleFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);

    async function loadUsers() {
      try {
        const response = await fetch(`/api/admin/users?${params}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error(getErrorMessage(payload, 'Could not load users.'));
        if (!isUserListData(payload)) throw new Error('The user service returned invalid data.');

        const lastPage = Math.max(1, Math.ceil(payload.total / pageSize));
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setListState({ key: listKey, data: payload });
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : 'Could not load users.';
        setListError({
          key: listKey,
          message,
        });
        toast.error(message);
      }
    }

    void loadUsers();
    return () => controller.abort();
  }, [
    listKey,
    page,
    pageSize,
    roleFilter,
    searchField,
    searchValue,
    sortBy,
    sortDirection,
    statusFilter,
  ]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadStats() {
      try {
        const response = await fetch('/api/admin/users/stats', {
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error(getErrorMessage(payload, 'Could not load user statistics.'));
        if (!isUserStats(payload)) throw new Error('The user statistics service returned invalid data.');
        setStatsState({ key: statsRetry, data: payload });
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : 'Could not load user statistics.';
        setStatsError({
          key: statsRetry,
          message,
        });
        toast.error(message);
      }
    }

    void loadStats();
    return () => controller.abort();
  }, [statsRetry]);

  const listData = listState?.key === listKey ? listState.data : null;
  const currentListError = listError?.key === listKey ? listError.message : null;
  const listLoading = !listData && !currentListError;
  const stats = statsState?.key === statsRetry ? statsState.data : null;
  const currentStatsError = statsError?.key === statsRetry ? statsError.message : null;
  const statsLoading = !stats && !currentStatsError;
  const currentAdminId = session?.user.id;

  useEffect(() => {
    const dialog = userActionDialog.current;
    if (!dialog) return;
    if (userDialog && !dialog.open) dialog.showModal();
    if (!userDialog && dialog.open) dialog.close();
  }, [userDialog]);

  function chooseAction(action: UserAction) {
    setUserDialog({ type: 'confirm', action });
    setSuspensionReason('');
  }

  function openUserActions(user: AdminUser) {
    setUserDialog({ type: 'actions', user });
  }

  function returnToUserActions(user: AdminUser) {
    setUserDialog({ type: 'actions', user });
    setSuspensionReason('');
  }

  function updateRoleFilter(value: string) {
    setRoleFilter(value);
    setStatusFilter('all');
    setPage(1);
  }

  function updateStatusFilter(value: 'all' | 'active' | 'suspended') {
    setStatusFilter(value);
    setRoleFilter('all');
    setPage(1);
  }

  function refreshAdminData() {
    setRefreshVersion((version) => version + 1);
    setStatsRetry((version) => version + 1);
  }

  async function confirmAction() {
    if (!userDialog || userDialog.type !== 'confirm') return;
    const action = userDialog.action;
    setMutatingUserId(action.user.id);

    const body = action.action === 'role_change'
      ? { action: action.action, role: action.role }
      : {
          action: action.action,
          ...(action.action === 'suspend' && suspensionReason.trim()
            ? { reason: suspensionReason.trim() }
            : {}),
        };

    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(action.user.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        if (isRecord(payload) && payload.actionApplied === true) {
          refreshAdminData();
        }
        throw new Error(getErrorMessage(payload, 'The user action failed.'));
      }

      toast.success(
        action.action === 'role_change'
          ? `${action.user.name}'s role was updated.`
          : action.action === 'suspend'
            ? `${action.user.name} was suspended.`
            : `${action.user.name} was unsuspended.`,
      );
      setUserDialog(null);
      refreshAdminData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The user action failed.';
      toast.error(message);
    } finally {
      setMutatingUserId(null);
    }
  }

  const totalPages = listData ? Math.max(1, Math.ceil(listData.total / pageSize)) : 1;
  const firstUser = listData?.total ? (page - 1) * pageSize + 1 : 0;
  const lastUser = listData ? Math.min(page * pageSize, listData.total) : 0;
  return (
    <div className="mx-auto w-full max-w-[1440px] py-5 lg:py-7">
      <div className="mb-5 text-[11px] text-[#85858d]">
        Admin <span className="px-1.5 text-[#4f4f56]">/</span> Manage Users
      </div>

      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.03em] text-[#f0f0f3] sm:text-2xl">
            User Management
          </h1>
          <p className="mt-1 text-xs text-[#8d8d95]">
            Review, filter, and manage platform access for all users.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="relative min-w-0 flex-1 sm:min-w-[220px]">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#898991]" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={`Search by ${searchField}...`}
              aria-label={`Search users by ${searchField}`}
              className="h-9 w-full rounded-md border border-white/[0.09] bg-[#111114] pl-9 pr-3 text-xs text-[#e7e7ec] outline-none placeholder:text-[#77777e] focus:border-[#9b71ff]/70"
            />
          </label>
          <label>
            <span className="sr-only">Search field</span>
            <select
              value={searchField}
              onChange={(event) => {
                setSearchField(event.target.value as 'name' | 'email');
                setPage(1);
              }}
              className="h-9 w-full rounded-md border border-white/[0.09] bg-[#17171b] px-3 text-xs text-[#d3d3d9] outline-none focus:border-[#9b71ff]/70 sm:w-auto"
            >
              <option value="email">Email</option>
              <option value="name">Name</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by role</span>
            <select
              value={roleFilter}
              onChange={(event) => updateRoleFilter(event.target.value)}
              className="h-9 w-full rounded-md border border-white/[0.09] bg-[#17171b] px-3 text-xs text-[#d3d3d9] outline-none focus:border-[#9b71ff]/70 sm:w-auto"
            >
              <option value="all">All Roles</option>
              <option value="seeker">Seekers</option>
              <option value="recruiter">Recruiters</option>
              <option value="admin">Admins</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by account status</span>
            <select
              value={statusFilter}
              onChange={(event) => updateStatusFilter(event.target.value as typeof statusFilter)}
              className="h-9 w-full rounded-md border border-white/[0.09] bg-[#17171b] px-3 text-xs text-[#d3d3d9] outline-none focus:border-[#9b71ff]/70 sm:w-auto"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Sort users</span>
            <select
              value={`${sortBy}:${sortDirection}`}
              onChange={(event) => {
                const [field, direction] = event.target.value.split(':');
                setSortBy(field as SortField);
                setSortDirection(direction as SortDirection);
                setPage(1);
              }}
              className="h-9 w-full rounded-md border border-white/[0.09] bg-[#17171b] px-3 text-xs text-[#d3d3d9] outline-none focus:border-[#9b71ff]/70 sm:w-auto"
            >
              <option value="createdAt:desc">Newest first</option>
              <option value="createdAt:asc">Oldest first</option>
              <option value="name:asc">Name A–Z</option>
              <option value="name:desc">Name Z–A</option>
              <option value="email:asc">Email A–Z</option>
              <option value="email:desc">Email Z–A</option>
              <option value="role:asc">Role A–Z</option>
              <option value="role:desc">Role Z–A</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => listData && exportUsers(listData.users)}
            disabled={!listData || listData.users.length === 0 || listLoading}
            title="Export the currently visible page"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#f0f0f2] px-3 text-xs font-medium text-[#17171b] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Download aria-hidden="true" className="size-3.5" />
            Export List
          </button>
        </div>
      </div>

      <p className="mb-4 text-[10px] text-[#77777f]">
        Better Auth supports one role or status filter at a time; selecting either clears the other.
        {searchInput.trim() !== searchValue && <span className="ml-1 text-[#a78bfa]">Searching…</span>}
      </p>

      <section aria-label="User account statistics" className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, key, helper, icon: Icon }) => (
          <article key={key} className="min-h-[108px] rounded-xl border border-white/[0.07] bg-[#131316] p-4">
            <div className="mb-3 flex items-start justify-between">
              <span className="flex size-8 items-center justify-center rounded-md bg-[#252529] text-[#d2d2d8]">
                <Icon aria-hidden="true" className="size-4" strokeWidth={1.8} />
              </span>
              <span className="text-[10px] text-[#77777f]">Live</span>
            </div>
            <p className="text-[10px] text-[#9999a1]">{label}</p>
            <div className="mt-0.5 flex items-end justify-between gap-2">
              {statsLoading ? (
                <span aria-hidden="true" className="h-6 w-16 animate-pulse rounded bg-white/[0.08]" />
              ) : stats ? (
                <p className="text-xl font-semibold leading-6 tracking-[-0.02em] text-[#ededf0]">
                  {stats[key].toLocaleString()}
                </p>
              ) : (
                <p className="text-[10px] text-rose-300">Unavailable</p>
              )}
              <span className="text-right text-[9px] text-[#7e7e86]">{helper}</span>
            </div>
          </article>
        ))}
      </section>

      {currentStatsError && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-400/20 bg-rose-400/[0.06] px-4 py-3 text-xs text-rose-200">
          <span>{currentStatsError}</span>
          <button
            type="button"
            onClick={() => setStatsRetry((value) => value + 1)}
            className="inline-flex items-center gap-1.5 rounded px-2 py-1 hover:bg-rose-300/10"
          >
            <RefreshCw aria-hidden="true" className="size-3.5" />
            Retry
          </button>
        </div>
      )}

      <section aria-label="Registered users" className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#131316]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] px-4 py-3.5 sm:px-5">
          <div>
            <h2 className="text-xs font-semibold text-[#ededf0]">All Users</h2>
            <p className="mt-0.5 text-[10px] text-[#85858d]">
              {listData
                ? `${listData.total.toLocaleString()} matching account${listData.total === 1 ? '' : 's'}`
                : 'User records from Better Auth'}
            </p>
          </div>
          <label className="flex items-center gap-2 text-[10px] text-[#85858d]">
            Rows
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value) as (typeof pageSizeOptions)[number]);
                setPage(1);
              }}
              className="h-8 rounded-md border border-white/[0.09] bg-[#17171b] px-2 text-[10px] text-[#d3d3d9] outline-none focus:border-[#9b71ff]/70"
            >
              {pageSizeOptions.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        </div>

        {currentListError ? (
          <div role="alert" className="px-5 py-12 text-center">
            <p className="text-xs font-medium text-rose-200">{currentListError}</p>
            <button
              type="button"
              onClick={() => setRefreshVersion((version) => version + 1)}
              className="mt-3 inline-flex items-center gap-2 rounded-md border border-white/[0.1] px-3 py-2 text-[10px] text-[#d3d3d9] transition hover:bg-white/[0.05]"
            >
              <RefreshCw aria-hidden="true" className="size-3.5" />
              Try again
            </button>
          </div>
        ) : listLoading ? (
          <UserTableSkeleton />
        ) : listData && listData.users.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Users aria-hidden="true" className="mx-auto size-6 text-[#66666e]" />
            <p className="mt-3 text-xs font-medium text-[#c5c5cc]">
              {searchValue || roleFilter !== 'all' || statusFilter !== 'all'
                ? 'No users match these filters'
                : 'No users have registered yet'}
            </p>
            {(searchValue || roleFilter !== 'all' || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setSearchValue('');
                  setRoleFilter('all');
                  setStatusFilter('all');
                  setPage(1);
                }}
                className="mt-2 text-[10px] text-[#b49aff] hover:text-white"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : listData ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.015] text-[9px] font-medium uppercase tracking-[0.08em] text-[#77777f]">
                    <th scope="col" className="px-4 py-3 font-medium sm:px-5">User Name</th>
                    <th scope="col" className="px-3 py-3 font-medium">Email Address</th>
                    <th scope="col" className="px-3 py-3 font-medium">Role</th>
                    <th scope="col" className="px-3 py-3 font-medium">Join Date</th>
                    <th scope="col" className="px-3 py-3 font-medium">Status</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium sm:px-5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listData.users.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      currentAdminId={currentAdminId}
                      activeAdminCount={stats?.activeAdmins ?? null}
                      disabled={mutatingUserId === user.id}
                      onOpenManage={openUserActions}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-3 md:hidden">
              {listData.users.map((user) => {
                const status = statusStyle(user);
                return (
                  <article key={user.id} className="rounded-lg border border-white/[0.07] bg-[#17171b] p-3">
                    <div className="flex items-start gap-3">
                      <DashboardAvatar src={user.image} name={user.name} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-[#e4e4e9]">{user.name}</p>
                        <p className="mt-1 flex min-w-0 items-center gap-1 text-[10px] text-[#96969e]">
                          <Mail aria-hidden="true" className="size-3 shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] ${roleClass(user.role)}`}>
                        {user.role ? user.role[0].toUpperCase() + user.role.slice(1) : 'Unknown'}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] ${status.className}`}>
                        {status.label}
                      </span>
                      <span className="ml-auto flex items-center gap-1 text-[10px] text-[#85858d]">
                        <CalendarDays aria-hidden="true" className="size-3" />
                        {formatDisplayDate(user.createdAt)}
                      </span>
                    </div>
                    <div className="mt-3 border-t border-white/[0.06] pt-2">
                      <UserActions
                        user={user}
                        currentAdminId={currentAdminId}
                        activeAdminCount={stats?.activeAdmins ?? null}
                        disabled={mutatingUserId === user.id}
                        onOpen={openUserActions}
                      />
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 border-t border-white/[0.07] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-[10px] text-[#85858d]">
                Showing {firstUser.toLocaleString()}–{lastUser.toLocaleString()} of {listData.total.toLocaleString()}
              </p>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-white/[0.09] px-2.5 text-[10px] text-[#c8c8cf] transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft aria-hidden="true" className="size-3.5" />
                  Previous
                </button>
                <span aria-live="polite" className="px-2 text-[10px] text-[#a0a0a8]">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-white/[0.09] px-2.5 text-[10px] text-[#c8c8cf] transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight aria-hidden="true" className="size-3.5" />
                </button>
              </div>
            </div>
          </>
        ) : null}
      </section>

      {userDialog && (
        <dialog
          ref={userActionDialog}
          role={userDialog.type === 'confirm' ? 'alertdialog' : 'dialog'}
          aria-modal="true"
          aria-labelledby="admin-user-dialog-title"
          aria-describedby={userDialog.type === 'confirm'
            ? 'admin-user-confirm-description'
            : 'admin-user-actions-description'}
          className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-white/[0.1] bg-[#17171b] p-5 text-[#e7e7ec] shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm sm:p-6"
          onCancel={(event) => {
            event.preventDefault();
            if (!mutatingUserId) setUserDialog(null);
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !mutatingUserId) setUserDialog(null);
          }}
        >
          {userDialog.type === 'actions' ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <DashboardAvatar
                    src={userDialog.user.image}
                    name={userDialog.user.name}
                    size="md"
                  />
                  <div className="min-w-0">
                    <h2 id="admin-user-dialog-title" className="truncate text-base font-semibold text-[#f0f0f3]">
                      Manage user
                    </h2>
                    <p className="mt-0.5 truncate text-xs text-[#9999a2]">
                      {userDialog.user.name} · {userDialog.user.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close user actions"
                  onClick={() => setUserDialog(null)}
                  className="rounded-lg p-2 text-[#85858d] transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9b71ff]/70"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] ${roleClass(userDialog.user.role)}`}>
                  {userDialog.user.role
                    ? `${userDialog.user.role[0].toUpperCase()}${userDialog.user.role.slice(1)}`
                    : 'Unknown role'}
                </span>
                {(() => {
                  const status = statusStyle(userDialog.user);
                  return (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] ${status.className}`}>
                      <span className="size-1.5 rounded-full bg-current" />
                      {status.label}
                    </span>
                  );
                })()}
              </div>

              <p id="admin-user-actions-description" className="mt-4 text-xs leading-5 text-[#9999a2]">
                Choose an account role or update this user&apos;s access.
              </p>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#85858d]">
                    Assign role
                  </h3>
                  {!isManagedRole(userDialog.user.role) ? (
                    <span className="text-[10px] text-[#85858d]">Unavailable for this role</span>
                  ) : null}
                </div>
                <div className="space-y-2">
                  {roles.map((role) => {
                    const currentRole = role === userDialog.user.role;
                    const roleIcon = role === 'recruiter'
                      ? <BriefcaseBusiness aria-hidden="true" className="size-4" />
                      : role === 'admin'
                        ? <Shield aria-hidden="true" className="size-4" />
                        : <Users aria-hidden="true" className="size-4" />;
                    const roleDisabled =
                      currentRole ||
                      !isManagedRole(userDialog.user.role) ||
                      !isAccountActive(userDialog.user) ||
                      Boolean(mutatingUserId);

                    return (
                      <button
                        key={role}
                        type="button"
                        disabled={roleDisabled}
                        onClick={() => chooseAction({
                          user: userDialog.user,
                          action: 'role_change',
                          role,
                        })}
                        className="group flex w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-left transition hover:border-[#9b71ff]/30 hover:bg-[#8d68ff]/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9b71ff]/70 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-white/[0.07] disabled:hover:bg-white/[0.025]"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.04] text-[#b8a1f5] transition group-hover:bg-[#8d68ff]/15">
                          {roleIcon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-medium capitalize text-[#e5e5ea]">
                            {role}
                          </span>
                          <span className="mt-0.5 block text-[10px] text-[#85858d]">
                            {currentRole
                              ? 'Current role'
                              : !isAccountActive(userDialog.user)
                                ? 'Restore account access before changing roles'
                                : `Change this user to ${role}`}
                          </span>
                        </span>
                        {currentRole ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#8d68ff]/10 px-2 py-1 text-[9px] text-[#bca8f3]">
                            <Check aria-hidden="true" className="size-3" />
                            Current
                          </span>
                        ) : (
                          <ChevronRight aria-hidden="true" className="size-4 text-[#77777f] transition group-hover:translate-x-0.5 group-hover:text-[#c7b5f7]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 border-t border-white/[0.07] pt-4">
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#85858d]">
                  Account access
                </h3>
                <button
                  type="button"
                  disabled={Boolean(mutatingUserId)}
                  onClick={() => chooseAction({
                    user: userDialog.user,
                    action: isAccountActive(userDialog.user) ? 'suspend' : 'unsuspend',
                  })}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                    isAccountActive(userDialog.user)
                      ? 'border-rose-400/15 bg-rose-400/[0.035] hover:border-rose-400/30 hover:bg-rose-400/[0.07] focus-visible:ring-rose-400/60'
                      : 'border-emerald-400/15 bg-emerald-400/[0.035] hover:border-emerald-400/30 hover:bg-emerald-400/[0.07] focus-visible:ring-emerald-400/60'
                  }`}
                >
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                    isAccountActive(userDialog.user)
                      ? 'bg-rose-400/10 text-rose-400'
                      : 'bg-emerald-400/10 text-emerald-400'
                  }`}>
                    {isAccountActive(userDialog.user)
                      ? <Ban aria-hidden="true" className="size-4" />
                      : <Check aria-hidden="true" className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-xs font-medium ${
                      isAccountActive(userDialog.user) ? 'text-rose-300' : 'text-emerald-300'
                    }`}>
                      {isAccountActive(userDialog.user) ? 'Suspend user' : 'Restore account access'}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-[#85858d]">
                      {isAccountActive(userDialog.user)
                        ? 'Revoke access and invalidate active sessions'
                        : 'Allow the user to sign in and access their account'}
                    </span>
                  </span>
                  <ChevronRight aria-hidden="true" className="size-4 text-[#77777f]" />
                </button>
              </div>
            </>
          ) : (
            <>
            <div className="flex items-start justify-between gap-4">
              <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                userDialog.action.action === 'suspend'
                  ? 'bg-rose-400/10 text-rose-400'
                  : userDialog.action.action === 'unsuspend'
                    ? 'bg-emerald-400/10 text-emerald-400'
                    : 'bg-[#8d68ff]/15 text-[#b49aff]'
              }`}>
                {userDialog.action.action === 'role_change'
                  ? <Shield aria-hidden="true" className="size-4" />
                  : userDialog.action.action === 'suspend'
                    ? <Ban aria-hidden="true" className="size-4" />
                    : <Check aria-hidden="true" className="size-4" />}
              </div>
              <button
                type="button"
                aria-label="Close confirmation"
                disabled={Boolean(mutatingUserId)}
                onClick={() => setUserDialog(null)}
                className="rounded-lg p-2 text-[#85858d] transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
            <h2 id="admin-user-dialog-title" className="mt-4 text-base font-semibold text-[#f0f0f3]">
              {userDialog.action.action === 'role_change'
                ? `Make ${userDialog.action.user.name} a ${userDialog.action.role}?`
                : userDialog.action.action === 'suspend'
                  ? `Suspend ${userDialog.action.user.name}?`
                  : `Unsuspend ${userDialog.action.user.name}?`}
            </h2>
            <p id="admin-user-confirm-description" className="mt-2 text-xs leading-5 text-[#a0a0a8]">
              {userDialog.action.action === 'role_change'
                ? `This updates the user's Better Auth role to ${userDialog.action.role} and revokes their existing sessions.`
                : userDialog.action.action === 'suspend'
                  ? 'They will lose access and all existing sessions will be revoked.'
                  : 'They will be able to sign in and access role-protected areas again.'}
            </p>
            {userDialog.action.action === 'suspend' && (
              <label className="mt-4 block">
                <span className="mb-1.5 block text-[10px] font-medium text-[#c5c5cc]">
                  Suspension reason <span className="font-normal text-[#77777f]">(optional)</span>
                </span>
                <textarea
                  value={suspensionReason}
                  onChange={(event) => setSuspensionReason(event.target.value)}
                  maxLength={500}
                  rows={3}
                  className="w-full resize-none rounded-md border border-white/[0.09] bg-[#101013] px-3 py-2 text-xs text-[#e7e7ec] outline-none placeholder:text-[#77777f] focus:border-[#9b71ff]/70"
                  placeholder="Add a reason for the audit record"
                />
              </label>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={Boolean(mutatingUserId)}
                onClick={() => returnToUserActions(userDialog.action.user)}
                className="h-9 rounded-md border border-white/[0.09] px-3 text-xs text-[#c7c7ce] transition hover:bg-white/[0.05] disabled:opacity-40"
              >
                Back to actions
              </button>
              <button
                type="button"
                disabled={Boolean(mutatingUserId)}
                onClick={() => void confirmAction()}
                className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-medium text-white transition disabled:cursor-wait disabled:opacity-60 ${
                  userDialog.action.action === 'suspend'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-[#7b55dc] hover:bg-[#8d68ff]'
                }`}
              >
                {mutatingUserId
                  ? <RefreshCw aria-hidden="true" className="size-3.5 animate-spin" />
                  : null}
                {mutatingUserId
                  ? 'Applying…'
                  : userDialog.action.action === 'role_change'
                    ? 'Confirm role change'
                    : userDialog.action.action === 'suspend'
                      ? 'Suspend user'
                      : 'Unsuspend user'}
              </button>
            </div>
            </>
          )}
        </dialog>
      )}
    </div>
  );
}
