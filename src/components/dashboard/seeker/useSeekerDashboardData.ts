'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PublicJob } from '@/lib/public-jobs';
import { isPublicJob, isSeekerApplication, type SeekerApplication } from './seeker-data';

export function useSeekerDashboardData({ includeJobs = true }: { includeJobs?: boolean } = {}) {
  const [applications, setApplications] = useState<SeekerApplication[]>([]);
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback((options?: { background?: boolean }) => {
    if (!options?.background) setLoading(true);
    setError('');
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    function handleFocus() {
      refresh();
    }

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refresh]);

  useEffect(() => {
    if (includeJobs) return;

    const refreshTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh({ background: true });
    }, 15_000);
    return () => window.clearInterval(refreshTimer);
  }, [includeJobs, refresh]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const [applicationsResponse, jobsResponse] = await Promise.all([
          fetch('/api/seeker/applications', { cache: 'no-store', signal: controller.signal }),
          includeJobs
            ? fetch('/api/jobs', { cache: 'no-store', signal: controller.signal })
            : Promise.resolve(null),
        ]);
        if (!applicationsResponse.ok) {
          const errorPayload: unknown = await applicationsResponse.json().catch(() => null);
          throw new Error(
            typeof errorPayload === 'object' &&
              errorPayload !== null &&
              'error' in errorPayload &&
              typeof errorPayload.error === 'string'
              ? errorPayload.error
              : 'Could not load your applications.',
          );
        }
        const applicationsPayload: unknown = await applicationsResponse.json();
        const nextApplications =
          typeof applicationsPayload === 'object' &&
          applicationsPayload !== null &&
          'applications' in applicationsPayload &&
          Array.isArray(applicationsPayload.applications)
            ? applicationsPayload.applications
            : null;
        if (!nextApplications?.every(isSeekerApplication)) {
          throw new Error('The applications service returned an unexpected response.');
        }

        setApplications(nextApplications);
        if (!jobsResponse) return;
        if (!jobsResponse.ok) {
          setJobs([]);
          setError('Could not load job listings.');
          return;
        }
        const jobsPayload: unknown = await jobsResponse.json();
        const nextJobs =
          typeof jobsPayload === 'object' &&
          jobsPayload !== null &&
          'jobs' in jobsPayload &&
          Array.isArray(jobsPayload.jobs)
            ? jobsPayload.jobs
            : null;
        if (!nextJobs?.every(isPublicJob)) {
          throw new Error('The jobs service returned an unexpected response.');
        }
        setJobs(nextJobs);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(
          loadError instanceof Error ? loadError.message : 'Could not load seeker dashboard data.',
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [includeJobs, reloadKey]);

  return { applications, jobs, loading, error, refresh };
}
