'use client';

import { toast } from 'sonner';
import { useSession } from '@/lib/auth-client';
import { useSavedJobIds } from '@/lib/seeker-jobs';

export default function JobSaveButton({
  jobId,
  className = '',
}: {
  jobId: string;
  className?: string;
}) {
  const { data: session, isPending } = useSession();
  const { jobIds, loading, save, remove } = useSavedJobIds();
  const saved = jobIds.includes(jobId);

  if (isPending || session?.user.role !== 'seeker') return null;

  async function toggleSaved() {
    try {
      if (saved) await remove(jobId);
      else await save(jobId);
    } catch (error) {
      console.error('Could not update saved jobs', error);
      toast.error(error instanceof Error ? error.message : 'Could not update saved jobs.');
    }
  }

  return (
    <button
      type="button"
      aria-label={saved ? 'Remove saved job' : 'Save job'}
      aria-pressed={saved}
      title={saved ? 'Remove saved job' : 'Save job'}
      onClick={toggleSaved}
      disabled={loading}
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
