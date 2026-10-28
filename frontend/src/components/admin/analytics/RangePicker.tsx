interface RangePickerProps {
  days: number;
  from?: string;
  to?: string;
  onChange: (next: { days?: number; from?: string; to?: string }) => void;
}

const PRESETS = [7, 30, 90];

export default function RangePicker({
  days,
  from,
  to,
  onChange,
}: RangePickerProps) {
  const custom = !!from && !!to;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((d) => (
        <button
          key={d}
          onClick={() => onChange({ days: d })}
          className={`px-3 py-1.5 text-xs tracking-wider uppercase rounded border transition-colors ${
            !custom && days === d
              ? "bg-stone-800 text-white border-stone-800"
              : "bg-white text-stone-600 border-stone-200 hover:border-amber-800"
          }`}
        >
          {d}d
        </button>
      ))}

      <div className="flex items-center gap-2 ml-1">
        <input
          type="date"
          value={from ?? ""}
          onChange={(e) => onChange({ from: e.target.value, to })}
          className="px-2 py-1.5 text-xs border border-stone-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-800/30"
        />
        <span className="text-xs text-stone-400">→</span>
        <input
          type="date"
          value={to ?? ""}
          onChange={(e) => onChange({ from, to: e.target.value })}
          className="px-2 py-1.5 text-xs border border-stone-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-800/30"
        />
        {custom && (
          <button
            onClick={() => onChange({ days: 30 })}
            className="text-xs text-stone-500 hover:text-amber-800 underline"
          >
            clear
          </button>
        )}
      </div>
    </div>
  );
}
