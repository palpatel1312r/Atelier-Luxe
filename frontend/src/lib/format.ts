/**
 * Format an amount in Indian Rupees.
 * Uses Indian digit grouping (1,23,456 not 123,456) and no decimals
 * by default (INR prices in this app are whole rupees).
 */
export function formatPrice(
  amount: number | string | null | undefined,
): string {
  const n = Number(amount);
  if (!isFinite(n)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(n);
}

/** Alias kept for compatibility — same as formatPrice now. */
export const formatINR = formatPrice;

export function formatDate(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
