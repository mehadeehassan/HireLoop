'use client';

type PageItem = number | 'ellipsis';

function getPageItems(page: number, pageCount: number): PageItem[] {
  if (pageCount <= 5) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  if (page <= 3) return [1, 2, 3, 'ellipsis', pageCount];
  if (page >= pageCount - 2) {
    return [1, 'ellipsis', pageCount - 2, pageCount - 1, pageCount];
  }

  return [1, 'ellipsis', page - 1, page, page + 1, 'ellipsis', pageCount];
}

type JobPaginationProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
};

const buttonClassName =
  'flex size-8 items-center justify-center rounded-md border border-white/[0.08] text-xs text-[#b8b8c0] transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40';

export default function JobPagination({
  page,
  pageCount,
  onPageChange,
}: JobPaginationProps) {
  if (pageCount <= 1) return null;

  return (
    <nav aria-label="Job listing pages" className="mt-7 flex items-center justify-center gap-1.5">
      <button
        type="button"
        aria-label="Previous page"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        className={buttonClassName}
      >
        <span aria-hidden="true">‹</span>
      </button>
      {getPageItems(page, pageCount).map((item, index) =>
        item === 'ellipsis' ? (
          <span key={`ellipsis-${index}`} className="px-1 text-xs text-[#777780]">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            aria-label={`Page ${item}`}
            aria-current={page === item ? 'page' : undefined}
            onClick={() => onPageChange(item)}
            className={`${buttonClassName} ${
              page === item
                ? 'border-white bg-white font-semibold text-[#171719] hover:border-white hover:text-[#171719]'
                : ''
            }`}
          >
            {item}
          </button>
        ),
      )}
      <button
        type="button"
        aria-label="Next page"
        disabled={page === pageCount}
        onClick={() => onPageChange(page + 1)}
        className={buttonClassName}
      >
        <span aria-hidden="true">›</span>
      </button>
    </nav>
  );
}
