export type RecruiterJob = {
  id: string;
  title: string;
  department: string;
  company: string;
  location: string;
  type: string;
  compensation: string;
  applicants: number;
  status: 'Active' | 'Draft' | 'Expired' | 'Closed';
  deadline: string;
  category?: string;
  remote?: boolean;
  responsibility?: string;
  qualifications?: string;
};

export const recruiterJobCategories = [
  'Engineering & Tech',
  'Design & Creative',
  'Product',
  'Marketing',
  'Sales',
  'Business Development',
  'Data & Analytics',
  'Quality Assurance',
  'Customer Support',
  'Operations',
  'Human Resources',
  'Finance & Accounting',
  'Legal',
  'Healthcare',
  'Education',
  'Administration',
  'Research',
] as const;

export const recruiterJobs: RecruiterJob[] = [
  {
    id: 'frontend-developer',
    title: 'Frontend Developer',
    department: 'Engineering',
    company: 'HirePulse Network',
    location: 'Remote (New York, USA)',
    type: 'Full-time',
    compensation: '$25 - $40 / hr',
    applicants: 34,
    status: 'Active',
    deadline: 'May 30, 2025',
  },
  {
    id: 'senior-product-designer',
    title: 'Senior Product Designer',
    department: 'Design',
    company: 'HirePulse Labs',
    location: 'London, UK (Hybrid)',
    type: 'Full-time',
    compensation: '$90k - $110k / yr',
    applicants: 18,
    status: 'Active',
    deadline: 'Jun 14, 2025',
  },
  {
    id: 'devops-specialist',
    title: 'DevOps Specialist',
    department: 'Infrastructure',
    company: 'HirePulse Platform',
    location: 'Berlin, Germany',
    type: 'Full-time',
    compensation: '$95k - $120k / yr',
    applicants: 12,
    status: 'Active',
    deadline: 'Jun 30, 2025',
  },
  {
    id: 'product-marketing-lead',
    title: 'Product Marketing Lead',
    department: 'Marketing',
    company: 'HirePulse Network',
    location: 'Remote (EU/US)',
    type: 'Full-time',
    compensation: '$100k - $150k / yr',
    applicants: 27,
    status: 'Active',
    deadline: 'Jul 15, 2025',
  },
  {
    id: 'qa-automation-engineer',
    title: 'QA Automation Engineer',
    department: 'Quality',
    company: 'HirePulse Platform',
    location: 'Dublin, Ireland (Hybrid)',
    type: 'Part-time',
    compensation: '$35 - $50 / hr',
    applicants: 8,
    status: 'Active',
    deadline: 'May 01, 2025',
  },
];
