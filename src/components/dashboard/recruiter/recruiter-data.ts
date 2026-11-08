export type RecruiterJob = {
  id: string;
  title: string;
  department: string;
  company: string;
  location: string;
  type: string;
  compensation: string;
  applicants: number;
  status: 'Active' | 'Draft' | 'Expired';
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

export const recruiterApplications = [
  {
    id: 1,
    name: 'Olivia Martin',
    initials: 'OM',
    role: 'Frontend Developer',
    email: 'olivia@example.com',
    experience: '4 years',
    status: 'New',
    date: 'May 28, 2025',
    phone: '+1 555 010 2214',
    location: 'New York, USA',
    skills: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS'],
    summary:
      'Frontend engineer with 4 years of experience building accessible, high-performance web applications.',
  },
  {
    id: 2,
    name: 'Ethan Williams',
    initials: 'EW',
    role: 'Senior Product Designer',
    email: 'ethan@example.com',
    experience: '7 years',
    status: 'Reviewed',
    date: 'May 27, 2025',
    phone: '+44 20 7946 0182',
    location: 'London, UK',
    skills: ['Figma', 'Design Systems', 'Prototyping', 'User Research'],
    summary:
      'Product designer focused on scalable design systems and end-to-end product experiences.',
  },
  {
    id: 3,
    name: 'Sophia Brown',
    initials: 'SB',
    role: 'DevOps Specialist',
    email: 'sophia@example.com',
    experience: '5 years',
    status: 'Shortlisted',
    date: 'May 25, 2025',
    phone: '+49 30 1234 5678',
    location: 'Berlin, Germany',
    skills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD'],
    summary:
      'DevOps specialist experienced in cloud infrastructure, automation, and reliable deployment pipelines.',
  },
  {
    id: 4,
    name: 'Noah Davis',
    initials: 'ND',
    role: 'QA Automation Engineer',
    email: 'noah@example.com',
    experience: '3 years',
    status: 'Rejected',
    date: 'May 24, 2025',
    phone: '+353 1 555 0198',
    location: 'Dublin, Ireland',
    skills: ['Playwright', 'Selenium', 'JavaScript', 'API Testing'],
    summary: 'Automation QA engineer specializing in browser, API, and regression testing.',
  },
];
