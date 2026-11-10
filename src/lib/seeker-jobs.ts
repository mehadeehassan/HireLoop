export const SAVED_JOBS_KEY = 'hireloop:saved-jobs';
export const SAVED_JOBS_DATES_KEY = 'hireloop:saved-jobs-dates';
export const SAVED_JOBS_EVENT = 'hireloop:saved-jobs-change';

export function isSavedJobDates(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((date) => typeof date === 'string')
  );
}

export function readSavedJobIds() {
  const savedJobs: unknown = JSON.parse(localStorage.getItem(SAVED_JOBS_KEY) || '[]');
  if (
    !Array.isArray(savedJobs) ||
    !savedJobs.every((id: unknown): id is string => typeof id === 'string')
  ) {
    throw new Error('Saved jobs data is invalid.');
  }
  return savedJobs;
}

export function readSavedJobDates(): Record<string, string> {
  const savedDates: unknown = JSON.parse(localStorage.getItem(SAVED_JOBS_DATES_KEY) || '{}');
  if (!isSavedJobDates(savedDates)) {
    throw new Error('Saved job dates are invalid.');
  }
  return savedDates;
}

export function saveJobIds(jobIds: string[]) {
  const uniqueJobIds = [...new Set(jobIds)];
  let savedDates: Record<string, string> = {};
  try {
    savedDates = readSavedJobDates();
  } catch (error) {
    console.error('Could not read saved job dates', error);
  }

  const jobIdSet = new Set(uniqueJobIds);
  const nextSavedDates = Object.fromEntries(
    Object.entries(savedDates).filter(([id]) => jobIdSet.has(id)),
  );
  const now = new Date().toISOString();
  for (const id of uniqueJobIds) {
    if (!nextSavedDates[id]) nextSavedDates[id] = now;
  }

  localStorage.setItem(SAVED_JOBS_KEY, JSON.stringify(uniqueJobIds));
  localStorage.setItem(SAVED_JOBS_DATES_KEY, JSON.stringify(nextSavedDates));
  window.dispatchEvent(new Event(SAVED_JOBS_EVENT));
}
