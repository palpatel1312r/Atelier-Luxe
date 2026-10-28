interface Pill {
  label: string;
  onRemove: () => void;
}

export default function ActiveFilterPills({ pills }: { pills: Pill[] }) {
  if (pills.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <span className="text-xs tracking-wider uppercase text-stone-500">
        Active:
      </span>
      {pills.map((p, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 bg-stone-100 text-stone-700 text-xs rounded-full"
        >
          {p.label}
          <button
            onClick={p.onRemove}
            aria-label={`Remove ${p.label}`}
            className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-stone-300 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </span>
      ))}
    </div>
  );
}
