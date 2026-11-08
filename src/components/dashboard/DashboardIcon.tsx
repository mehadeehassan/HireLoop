import type { ReactNode } from 'react';

export type DashboardIconName =
  | 'grid'
  | 'briefcase'
  | 'bookmark'
  | 'document'
  | 'message'
  | 'settings'
  | 'users'
  | 'chart'
  | 'building'
  | 'wallet'
  | 'logout';

export default function DashboardIcon({
  name,
  className = 'size-4.5',
}: {
  name: DashboardIconName;
  className?: string;
}) {
  const paths: Record<DashboardIconName, ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
      </>
    ),
    bookmark: <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />,
    document: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6M8 13h8M8 17h8" />
      </>
    ),
    message: (
      <>
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
        <path d="M8 9h8M8 13h5" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19 12a7 7 0 0 0-.08-1l2-1.55-2-3.45-2.42 1A7 7 0 0 0 15 6l-.55-2.55h-4L9.9 6a7 7 0 0 0-1.72 1l-2.6-.98-2 3.45L5.8 11a7 7 0 0 0 0 2l-2.22 1.55 2 3.45 2.6-.98A7 7 0 0 0 10 18l.45 2.55h4L15 18a7 7 0 0 0 1.5-1l2.42 1 2-3.45-2-1.55A7 7 0 0 0 19 12Z" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    chart: <path d="M3 3v18h18M7 16l4-4 3 2 5-7" />,
    building: (
      <path d="M4 21V5h10v16M14 9h6v12M8 9h2M8 13h2M8 17h2M18 13h2M18 17h2M2 21h20" />
    ),
    wallet: (
      <>
        <rect x="2" y="5" width="20" height="15" rx="3" />
        <path d="M16 12h6M16 12a2 2 0 1 0 0 4h4v-4" />
      </>
    ),
    logout: (
      <path d="M10 17l5-5-5-5M15 12H3M14 3h4a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-4" />
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
