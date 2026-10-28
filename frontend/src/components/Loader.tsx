export default function Loader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-stone-500 gap-3">
      <div className="h-8 w-8 border-2 border-stone-300 border-t-amber-800 rounded-full animate-spin" />
      <p className="text-sm tracking-wide">{label}</p>
    </div>
  );
}
