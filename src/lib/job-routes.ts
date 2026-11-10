export function getJobApplyHref(jobId: string) {
  return `/browse-jobs/${encodeURIComponent(jobId)}?apply=1#apply`;
}
