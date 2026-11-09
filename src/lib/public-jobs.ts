export type PublicJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  workMode: string;
  compensation: string;
  description: string;
  remote: boolean;
  applyUrl: string | null;
};

export type PublicJobsResponse = {
  jobs: PublicJob[];
  newJobsThisMonth: number;
};
