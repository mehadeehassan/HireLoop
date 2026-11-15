'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PublicJob } from '@/lib/public-jobs';
import { isPublicJob, isSeekerApplication, type SeekerApplication } from './seeker-data';

type JobPagination = { page: number; limit: number; total: number; totalPages: number };

export function useSeekerDashboardData({
  includeApplications = true,
  includeJobs = true,
  jobSearch = '',
  jobPage = 1,
  jobLimit = 50,
}: {
  includeApplications?: boolean;
  includeJobs?: boolean;
  jobSearch?: string;
  jobPage?: number;
  jobLimit?: number;
} = {}) {
  const [applications, setApplications] = useState<SeekerApplication[]>([]);
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [jobPagination, setJobPagination] = useState<JobPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(() => {
    setLoading(true);
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
    const controller = new AbortController();

    async function load() {
      try {
        const jobQuery = new URLSearchParams({
          page: String(jobPage),
          limit: String(jobLimit),
        });
        if (jobSearch.trim()) jobQuery.set('search', jobSearch.trim());
        const [applicationsResponse, jobsResponse] = await Promise.all([
          includeApplications
            ? fetch('/api/seeker/applications', { cache: 'no-store', signal: controller.signal })
            : Promise.resolve(null),
          includeJobs
            ? fetch(`/api/jobs?${jobQuery}`, { cache: 'no-store', signal: controller.signal })
            : Promise.resolve(null),
        ]);
        if (applicationsResponse) {
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
        }

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
        const pagination =
          typeof jobsPayload === 'object' &&
          jobsPayload !== null &&
          'pagination' in jobsPayload &&
          typeof jobsPayload.pagination === 'object' &&
          jobsPayload.pagination !== null
            ? jobsPayload.pagination
            : null;
        if (
          pagination &&
          'page' in pagination &&
          'limit' in pagination &&
          'total' in pagination &&
          'totalPages' in pagination &&
          typeof pagination.page === 'number' &&
          Number.isSafeInteger(pagination.page) &&
          pagination.page >= 0 &&
          typeof pagination.limit === 'number' &&
          Number.isSafeInteger(pagination.limit) &&
          pagination.limit >= 0 &&
          typeof pagination.total === 'number' &&
          Number.isSafeInteger(pagination.total) &&
          pagination.total >= 0 &&
          typeof pagination.totalPages === 'number' &&
          Number.isSafeInteger(pagination.totalPages) &&
          pagination.totalPages >= 0
        ) {
          setJobPagination({
            page: pagination.page,
            limit: pagination.limit,
            total: pagination.total,
            totalPages: Math.max(1, pagination.totalPages),
          });
        } else {
          throw new Error('The jobs service returned invalid pagination data.');
        }
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
  }, [includeApplications, includeJobs, jobLimit, jobPage, jobSearch, reloadKey]);

  return { applications, jobs, jobPagination, loading, error, refresh };
}
