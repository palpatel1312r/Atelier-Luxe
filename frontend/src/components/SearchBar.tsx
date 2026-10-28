interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, placeholder = 'Search…' }: SearchBarProps) {
  return (
    <div className="relative">
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800"
      />
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
      </svg>
    </div>
  );
}
