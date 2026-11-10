'use client';

export default function DashboardPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  const visiblePages = pages.filter((number) =>
    number === 1 || number === totalPages || Math.abs(number - page) <= 1,
  );

  return (
    <nav className="flex items-center justify-end gap-1.5 px-3 py-4" aria-label="Pagination">
      <button
        type="button"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="flex h-8 min-w-8 items-center justify-center rounded-md border border-[#252d43] px-2 text-[11px] text-[#aab1c1] disabled:cursor-not-allowed disabled:opacity-40"
      >
        ‹
      </button>
      {visiblePages.map((number, index) => (
        <span key={number} className="flex items-center gap-1.5">
          {index > 0 && number - visiblePages[index - 1] > 1 && (
            <span className="text-[11px] text-[#6f778b]">…</span>
          )}
          <button
            type="button"
            onClick={() => onPageChange(number)}
            aria-current={number === page ? 'page' : undefined}
            className={`flex size-8 items-center justify-center rounded-md border text-[11px] ${
              number === page
                ? 'border-[#6258ff] bg-[#6258ff] text-white'
                : 'border-[#252d43] text-[#aab1c1] hover:border-[#6258ff]/50'
            }`}
          >
            {number}
          </button>
        </span>
      ))}
      <button
        type="button"
        aria-label="Next page"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="flex h-8 min-w-8 items-center justify-center rounded-md border border-[#252d43] px-2 text-[11px] text-[#aab1c1] disabled:cursor-not-allowed disabled:opacity-40"
      >
        ›
      </button>
    </nav>
  );
}
