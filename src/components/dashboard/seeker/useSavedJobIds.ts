'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import {
  isSavedJobDates,
  saveJobIds,
  SAVED_JOBS_EVENT,
  SAVED_JOBS_DATES_KEY,
  SAVED_JOBS_KEY,
} from '@/lib/seeker-jobs';

function subscribe(onChange: () => void) {
  window.addEventListener(SAVED_JOBS_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(SAVED_JOBS_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

function getSnapshot() {
  return localStorage.getItem(SAVED_JOBS_KEY) || '[]';
}

function getDatesSnapshot() {
  return localStorage.getItem(SAVED_JOBS_DATES_KEY) || '{}';
}

export function useSavedJobIds() {
  const savedJobs = useSyncExternalStore(subscribe, getSnapshot, () => '[]');
  const savedDates = useSyncExternalStore(subscribe, getDatesSnapshot, () => '{}');
  const jobIds = useMemo(() => {
    try {
      const parsed: unknown = JSON.parse(savedJobs);
      if (Array.isArray(parsed) && parsed.every((id): id is string => typeof id === 'string')) {
        return parsed;
      }
    } catch (error) {
      console.error('Could not read saved seeker jobs', error);
    }
    console.error('Saved jobs data is invalid.');
    return [];
  }, [savedJobs]);
  const savedAt = useMemo(() => {
    try {
      const parsed: unknown = JSON.parse(savedDates);
      if (isSavedJobDates(parsed)) return parsed;
      throw new Error('Saved job dates are invalid.');
    } catch (error) {
      console.error('Could not read saved job dates', error);
      return {};
    }
  }, [savedDates]);

  const remove = useCallback(
    (jobId: string) => {
      saveJobIds(jobIds.filter((id) => id !== jobId));
    },
    [jobIds],
  );

  return { jobIds, remove, savedAt };
}
