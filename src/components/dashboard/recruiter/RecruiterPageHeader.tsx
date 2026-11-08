import Link from 'next/link';

export default function RecruiterPageHeader({
  eyebrow,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="mb-2 text-[11px] text-[#7e879f]">
          <span>{eyebrow}</span>
        </p>
        <h1 className="font-sans text-[24px] font-semibold leading-tight text-[#f0f2f7] sm:text-[28px]">
          {title}
        </h1>
        <p className="mt-1 text-[12px] text-[#8f96aa] sm:text-[13px]">{description}</p>
      </div>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="flex h-10 shrink-0 items-center justify-center rounded-md bg-[#6258ff] px-4 text-[12px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,.12)]"
        >
          <span className="mr-1.5 text-lg leading-none">+</span> {actionLabel}
        </Link>
      )}
    </div>
  );
}
