export default function AdminSectionPlaceholder({
  title,
}: {
  title: string;
}) {
  return (
    <div className="mx-auto w-full max-w-360 py-5 lg:py-7">
      <div className="mb-5 text-[11px] text-[#85858d]">
        Admin <span className="px-1.5 text-[#4f4f56]">/</span> {title}
      </div>
      <section className="rounded-xl border border-white/[0.07] bg-[#131316] px-5 py-10 sm:px-8">
        <h1 className="text-xl font-semibold tracking-[-0.03em] text-[#f0f0f3]">{title}</h1>
        <p className="mt-2 max-w-xl text-xs leading-5 text-[#8d8d95]">
          This section will be implemented in its dedicated admin dashboard update.
        </p>
      </section>
    </div>
  );
}
