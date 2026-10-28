import { formatPrice } from "../../../lib/format";

export default function KpiCard({
  label,
  value,
  changePct,
  prefix = "",
}: {
  label: string;
  value: number;
  changePct?: number;
  prefix?: string;
}) {
  const formatted =
    prefix === "₹"
      ? formatPrice(value)
      : `${prefix}${value.toLocaleString("en-IN")}`;

  const isUp = (changePct ?? 0) > 0;
  const isDown = (changePct ?? 0) < 0;
  const showChange = changePct !== undefined && changePct !== null;

  return (
    <div className="bg-white rounded-lg border border-stone-200 p-5">
      <p className="text-xs tracking-wider uppercase text-stone-500 mb-2">
        {label}
      </p>
      <p className="text-2xl font-light text-stone-800">{formatted}</p>
      {showChange && (
        <p
          className={`text-xs mt-2 ${
            isUp ? "text-green-700" : isDown ? "text-red-600" : "text-stone-400"
          }`}
        >
          {isUp ? "▲" : isDown ? "▼" : "•"} {Math.abs(changePct!)}% vs prior
          period
        </p>
      )}
    </div>
  );
}
