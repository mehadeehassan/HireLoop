'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useSession } from '@/lib/auth-client';

type SavedJobsState = {
  jobIds: string[];
  savedAt: Record<string, string>;
  loading: boolean;
  loaded: boolean;
  error: string;
};

const emptyState: SavedJobsState = {
  jobIds: [],
  savedAt: {},
  loading: false,
  loaded: false,
  error: '',
};
const listeners = new Set<() => void>();
let activeUserId: string | null = null;
let state = emptyState;
let loadPromise: Promise<void> | null = null;

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(userId: string | null) {
  return userId && userId === activeUserId ? state : emptyState;
}

function setState(next: SavedJobsState) {
  state = next;
  notify();
}

export function resetSavedJobsClientState() {
  activeUserId = null;
  state = emptyState;
  loadPromise = null;
  notify();
}

function getErrorMessage(payload: unknown, fallback: string) {
  return typeof payload === 'object' &&
    payload !== null &&
    'message' in payload &&
    typeof payload.message === 'string'
    ? payload.message
    : fallback;
}

function isSavedJob(value: unknown): value is { jobId: string; createdAt: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'jobId' in value &&
    typeof value.jobId === 'string' &&
    'createdAt' in value &&
    typeof value.createdAt === 'string'
  );
}

function isSavedJobsResponse(
  value: unknown,
): value is {
  savedJobs: Array<{ jobId: string; createdAt: string }>;
  pagination: { totalPages: number };
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    'savedJobs' in value &&
    Array.isArray(value.savedJobs) &&
    value.savedJobs.every(isSavedJob) &&
    'pagination' in value &&
    typeof value.pagination === 'object' &&
    value.pagination !== null &&
    'totalPages' in value.pagination &&
    typeof value.pagination.totalPages === 'number'
  );
}

async function loadSavedJobs(userId: string) {
  if (loadPromise) return loadPromise;
  setState({ ...state, loading: true, error: '' });
  const request = Promise.resolve().then(async () => {
    try {
      const savedJobs: Array<{ jobId: string; createdAt: string }> = [];
      let page = 1;
      let totalPages = 1;
      do {
        const response = await fetch(
          `/api/seeker/saved-jobs?page=${page}&limit=100`,
          { cache: 'no-store' },
        );
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(getErrorMessage(payload, 'Could not load saved jobs.'));
        }
        if (!isSavedJobsResponse(payload)) {
          throw new Error('The saved jobs service returned an unexpected response.');
        }
        savedJobs.push(...payload.savedJobs);
        totalPages = payload.pagination.totalPages;
        page += 1;
      } while (page <= totalPages);

      if (activeUserId === userId) {
        setState({
          jobIds: savedJobs.map((item) => item.jobId),
          savedAt: Object.fromEntries(savedJobs.map((item) => [item.jobId, item.createdAt])),
          loading: false,
          loaded: true,
          error: '',
        });
      }
    } catch (error) {
      if (activeUserId === userId) {
        setState({
          ...emptyState,
          loaded: true,
          error: error instanceof Error ? error.message : 'Could not load saved jobs.',
        });
      }
    } finally {
      if (loadPromise === request) loadPromise = null;
    }
  });
  loadPromise = request;
  return request;
}

export function useSavedJobIds() {
  const { data: session, isPending } = useSession();
  const userId = session?.user.role === 'seeker' ? session.user.id : null;
  const savedJobs = useSyncExternalStore(
    subscribe,
    () => getSnapshot(userId),
    () => emptyState,
  );

  useEffect(() => {
    if (isPending) return;
    if (activeUserId !== userId) {
      activeUserId = userId;
      state = emptyState;
      loadPromise = null;
      notify();
    }
    if (userId && !state.loaded) void loadSavedJobs(userId);
  }, [isPending, userId, savedJobs.loaded]);

  const remove = useCallback(async (jobId: string) => {
    if (!userId) throw new Error('Sign in as a seeker to manage saved jobs.');
    const response = await fetch(`/api/seeker/saved-jobs/${encodeURIComponent(jobId)}`, {
      method: 'DELETE',
      cache: 'no-store',
    });
    const payload: unknown = await response.json();
    if (!response.ok) throw new Error(getErrorMessage(payload, 'Could not remove saved job.'));
    if (activeUserId === userId) {
      const jobIds = state.jobIds.filter((id) => id !== jobId);
      const savedAt = { ...state.savedAt };
      delete savedAt[jobId];
      setState({ ...state, jobIds, savedAt });
    }
  }, [userId]);

  const save = useCallback(async (jobId: string) => {
    if (!userId) throw new Error('Sign in as a seeker to save jobs.');
    const response = await fetch(`/api/seeker/saved-jobs/${encodeURIComponent(jobId)}`, {
      method: 'PUT',
      cache: 'no-store',
    });
    const payload: unknown = await response.json();
    if (!response.ok) throw new Error(getErrorMessage(payload, 'Could not save this job.'));
    if (activeUserId === userId && !state.jobIds.includes(jobId)) {
      setState({
        ...state,
        jobIds: [...state.jobIds, jobId],
        savedAt: { ...state.savedAt, [jobId]: new Date().toISOString() },
      });
    }
  }, [userId]);

  return {
    jobIds: savedJobs.jobIds,
    savedAt: savedJobs.savedAt,
    loading: isPending || (userId !== null && !savedJobs.loaded),
    error: savedJobs.error,
    remove,
    save,
  };
}
