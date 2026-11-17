'use client';

import { resetSavedJobsClientState } from '@/lib/seeker-jobs';

export function getUserStorageKey(userId: string, key: string) {
  return `hireloop:${encodeURIComponent(userId)}:${key}`;
}

export function clearHireLoopBrowserState() {
  try {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key?.startsWith('hireloop:')) localStorage.removeItem(key);
    }
  } catch (error) {
    console.error('Could not clear HireLoop browser state', error);
  }
  resetSavedJobsClientState();
}

export function clearLegacyHireLoopState() {
  try {
    for (const key of [
      'hireloop:saved-jobs',
      'hireloop:saved-jobs-dates',
      'hireloop:archived-applications',
      'hireloop:seeker-notification-read',
    ]) {
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.error('Could not remove legacy HireLoop browser state', error);
  }
}
