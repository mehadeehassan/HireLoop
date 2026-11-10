'use client';

import { useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { useSession } from '@/lib/auth-client';
import { readSavedJobIds, saveJobIds, SAVED_JOBS_EVENT, SAVED_JOBS_KEY } from '@/lib/seeker-jobs';

export default function JobSaveButton({
  jobId,
  className = '',
}: {
  jobId: string;
  className?: string;
}) {
  const { data: session, isPending } = useSession();
  const saved = useSyncExternalStore(
    (onStoreChange) => {
      function handleStorageChange(event: StorageEvent) {
        if (event.key === SAVED_JOBS_KEY || event.key === null) onStoreChange();
      }

      window.addEventListener('storage', handleStorageChange);
      window.addEventListener(SAVED_JOBS_EVENT, onStoreChange);
      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener(SAVED_JOBS_EVENT, onStoreChange);
      };
    },
    () => {
      try {
        return readSavedJobIds().includes(jobId);
      } catch (error) {
        console.error('Could not read saved jobs', error);
        return false;
      }
    },
    () => false,
  );

  if (isPending || session?.user.role !== 'seeker') return null;

  function toggleSaved() {
    try {
      const savedJobs = readSavedJobIds();
      const nextSaved = !savedJobs.includes(jobId);
      const nextSavedJobs = nextSaved
        ? [...savedJobs, jobId]
        : savedJobs.filter((id) => id !== jobId);

      saveJobIds(nextSavedJobs);
    } catch (error) {
      console.error('Could not update saved jobs', error);
      toast.error('Could not save this job. Check your browser storage settings.');
    }
  }

  return (
    <button
      type="button"
      aria-label={saved ? 'Remove saved job' : 'Save job'}
      aria-pressed={saved}
      title={saved ? 'Remove saved job' : 'Save job'}
      onClick={toggleSaved}
      className={`flex size-9 shrink-0 items-center justify-center rounded-md border border-transparent text-[#9b9ba3] transition hover:border-white/8 hover:bg-[#202024] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8178ff] ${
        saved ? 'text-[#aaa2ff]' : ''
      } ${className}`}
    >
      <svg
        className="size-4"
        viewBox="0 0 24 24"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.7"
        aria-hidden="true"
      >
        <path d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-4-6 4V4.75Z" />
      </svg>
    </button>
  );
}
