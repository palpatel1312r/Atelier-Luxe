import type { Product } from "../types";

/**
 * What a customer actually pays for a product + size.
 *
 * Rules:
 *  1. If the product is on sale, use effective_price (sale price).
 *  2. Otherwise, if a size_price exists for the given size, use that.
 *  3. On sale AND size_price: use whichever is lower.
 */
export function priceForSize(product: Product, size?: string): number {
  const basePrice =
    typeof product.effective_price === "number"
      ? product.effective_price
      : product.price;

  if (!size) return basePrice;

  const sizePrices = (product.size_prices || {}) as Record<string, number>;
  const sizePrice = sizePrices[size];

  if (sizePrice == null) return basePrice;

  if (product.is_on_sale) {
    return Math.min(Number(sizePrice), basePrice);
  }

  return Number(sizePrice);
}

/**
 * The pre-sale price for a given size — used to show a struck-through
 * reference price when a product is on sale.
 */
export function originalPriceForSize(product: Product, size?: string): number {
  const sizePrices = (product.size_prices || {}) as Record<string, number>;
  const sizePrice = size ? sizePrices[size] : null;
  return sizePrice != null ? Number(sizePrice) : Number(product.price);
}

/** True if the product has an active sale (backend already computed this). */
export function hasSale(product: Product): boolean {
  return !!product.is_on_sale && product.effective_price < product.price;
}

/** Absolute savings vs. original price, rounded to 2 dp. */
export function savingsAmount(product: Product): number {
  if (!hasSale(product)) return 0;
  return Number((product.price - product.effective_price).toFixed(2));
}

/**
 * Lowest price across all sizes + any sale. Used for the "From ₹X" badge
 * on the product card.
 */
export function minPrice(product: Product): number {
  const base = Number(product.effective_price ?? product.price);
  const sizePrices = (product.size_prices || {}) as Record<string, number>;
  const sizeVals = Object.values(sizePrices)
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
  const prices = [base, ...sizeVals];
  return Math.min(...prices);
}

/** Highest price across all sizes. */
export function maxPrice(product: Product): number {
  const base = Number(product.price);
  const sizePrices = (product.size_prices || {}) as Record<string, number>;
  const sizeVals = Object.values(sizePrices)
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
  const prices = [base, ...sizeVals];
  return Math.max(...prices);
}

/** True if size_prices make min and max differ. */
export function hasSizePriceRange(product: Product): boolean {
  return minPrice(product) !== maxPrice(product);
}
