interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-10">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="px-3 py-1.5 text-sm border border-stone-200 rounded disabled:opacity-40 hover:border-amber-800"
      >
        Prev
      </button>
      <span className="text-sm text-stone-600">
        {page} / {totalPages}
      </span>
      <button
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="px-3 py-1.5 text-sm border border-stone-200 rounded disabled:opacity-40 hover:border-amber-800"
      >
        Next
      </button>
    </div>
  );
}
