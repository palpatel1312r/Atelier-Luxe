import { useEffect, useState } from "react";
import { Product } from "../types";
import { api } from "../lib/api";
import ProductCard from "./ProductCard";

interface RelatedProductsProps {
  productId: number;
  onSelect: (product: Product) => void;
}

export default function RelatedProducts({
  productId,
  onSelect,
}: RelatedProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getRelatedProducts(productId, 8)
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  // Nothing to show
  if (!loading && products.length === 0) return null;

  return (
    <section className="mt-16 sm:mt-24">
      <div className="border-t border-stone-200 pt-12">
        <h2 className="text-2xl font-light text-stone-800 mb-8">
          You may also like
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
