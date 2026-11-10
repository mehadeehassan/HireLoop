import type { ReactNode } from 'react';

export default function SeekerPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[#f0f0f3] sm:text-2xl">{title}</h1>
        {description && <p className="mt-1.5 text-xs text-[#92929b]">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
