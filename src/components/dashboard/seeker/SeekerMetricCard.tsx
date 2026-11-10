import DashboardIcon, { type DashboardIconName } from '@/components/dashboard/DashboardIcon';

const iconColors: Record<string, string> = {
  bookmark: 'text-white',
  document: 'text-[#bbb5ff]',
  calendar: 'text-amber-400',
  offer: 'text-emerald-400',
};

export default function SeekerMetricCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: DashboardIconName | 'calendar' | 'offer';
  tone: string;
}) {
  return (
    <article className="rounded-xl border border-[#26262b] bg-[#131316] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-[#94949e] sm:text-xs">{label}</p>
        <span className={`${tone} ${iconColors[icon] || ''}`}>
          {icon === 'calendar' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4.5" aria-hidden="true">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M16 3v4M8 3v4M3 10h18" />
            </svg>
          ) : icon === 'offer' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4.5" aria-hidden="true">
              <path d="M8 3h8v8a4 4 0 0 1-8 0V3ZM12 15v6M8 21h8M8 7H5v2a4 4 0 0 0 4 4M16 7h3v2a4 4 0 0 1-4 4" />
            </svg>
          ) : (
            <DashboardIcon name={icon} className="size-4.5" />
          )}
        </span>
      </div>
      <p className="mt-4 text-2xl font-semibold text-[#f2f2f4]">{value}</p>
    </article>
  );
}
