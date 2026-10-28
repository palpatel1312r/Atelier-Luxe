import { useEffect, useState } from "react";
import { Product } from "../types";
import { api } from "../lib/api";
import { getRecentlyViewedIds } from "../lib/recentlyViewed";
import ProductCard from "./ProductCard";

interface RecentlyViewedProps {
  excludeId?: number;
  onSelect: (product: Product) => void;
}

export default function RecentlyViewed({
  excludeId,
  onSelect,
}: RecentlyViewedProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = getRecentlyViewedIds(excludeId).slice(0, 4);
    if (ids.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all(ids.map((id) => api.getProduct(id).catch(() => null)))
      .then((results) => {
        if (cancelled) return;
        setProducts(results.filter((p): p is Product => !!p));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [excludeId]);

  if (!loading && products.length === 0) return null;

  return (
    <section className="mt-16 sm:mt-24">
      <div className="border-t border-stone-200 pt-12">
        <h2 className="text-2xl font-light text-stone-800 mb-8">
          Recently viewed
        </h2>

        {loading && <p className="text-sm text-stone-500 py-4">Loading…</p>}

        {!loading && products.length > 0 && (
          <div className="-mx-4 sm:-mx-0 overflow-x-auto sm:overflow-visible pb-2">
            <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-6 px-4 sm:px-0 min-w-max sm:min-w-0">
              {products.map((p) => (
                <div key={p.id} className="w-64 sm:w-auto flex-shrink-0">
                  <ProductCard product={p} onSelect={onSelect} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
