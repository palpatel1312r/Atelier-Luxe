import { useMemo } from "react";
import type { FacetResponse, FacetValue, CategoryFacet } from "../types";
import { PRICE_PRESETS } from "../lib/constants";
import { formatPrice } from "../lib/format";

interface FiltersProps {
  facets: FacetResponse | null;
  loading: boolean;
  searchParams: URLSearchParams;
  onUpdate: (updater: (prev: URLSearchParams) => URLSearchParams) => void;
  onClearAll: () => void;
}

function listParam(params: URLSearchParams, key: string): string[] {
  const v = params.get(key);
  return v ? v.split(",").filter(Boolean) : [];
}

function toggleInList(
  params: URLSearchParams,
  key: string,
  value: string,
): URLSearchParams {
  const next = new URLSearchParams(params);
  const current = listParam(params, key);
  const set = new Set(current);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  if (set.size === 0) next.delete(key);
  else next.set(key, Array.from(set).join(","));
  next.delete("page");
  return next;
}

export default function Filters({
  facets,
  loading,
  searchParams,
  onUpdate,
  onClearAll,
}: FiltersProps) {
  const activeCategories = listParam(searchParams, "category");
  const activeColors = listParam(searchParams, "colors");
  const activeSizes = listParam(searchParams, "sizes");
  const minPrice = searchParams.get("min_price") ?? "";
  const maxPrice = searchParams.get("max_price") ?? "";
  const inStock = searchParams.get("in_stock") === "1";
  const onSale = searchParams.get("on_sale") === "1";

  const hasActiveFilters = useMemo(() => {
    return (
      activeCategories.length > 0 ||
      activeColors.length > 0 ||
      activeSizes.length > 0 ||
      !!minPrice ||
      !!maxPrice ||
      inStock ||
      onSale
    );
  }, [
    activeCategories,
    activeColors,
    activeSizes,
    minPrice,
    maxPrice,
    inStock,
    onSale,
  ]);

  const setMinPrice = (v: string) => {
    onUpdate((prev) => {
      const next = new URLSearchParams(prev);
      if (v) next.set("min_price", v);
      else next.delete("min_price");
      next.delete("page");
      return next;
    });
  };
  const setMaxPrice = (v: string) => {
    onUpdate((prev) => {
      const next = new URLSearchParams(prev);
      if (v) next.set("max_price", v);
      else next.delete("max_price");
      next.delete("page");
      return next;
    });
  };

  const applyPreset = (min?: number, max?: number) => {
    onUpdate((prev) => {
      const next = new URLSearchParams(prev);
      if (min !== undefined) next.set("min_price", String(min));
      else next.delete("min_price");
      if (max !== undefined) next.set("max_price", String(max));
      else next.delete("max_price");
      next.delete("page");
      return next;
    });
  };

  const toggleInStock = () => {
    onUpdate((prev) => {
      const next = new URLSearchParams(prev);
      if (inStock) next.delete("in_stock");
      else next.set("in_stock", "1");
      next.delete("page");
      return next;
    });
  };

  const toggleOnSale = () => {
    onUpdate((prev) => {
      const next = new URLSearchParams(prev);
      if (onSale) next.delete("on_sale");
      else next.set("on_sale", "1");
      next.delete("page");
      return next;
    });
  };

  return (
    <aside className="hidden lg:block w-64 flex-shrink-0">
      <div className="sticky top-28 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm tracking-wider uppercase text-stone-800 font-medium">
            Filters
          </h2>
          {hasActiveFilters && (
            <button
              onClick={onClearAll}
              className="text-xs tracking-wider uppercase text-amber-800 hover:text-amber-900 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {loading && !facets && (
          <p className="text-xs text-stone-400">Loading filters…</p>
        )}

        {facets && facets.categories.length > 0 && (
          <FilterSection title="Category">
            <ul className="space-y-1.5">
              {facets.categories.map((c) => (
                <li key={c.name}>
                  <FilterCheckbox
                    label={c.name}
                    count={c.count}
                    checked={activeCategories.includes(c.name)}
                    onChange={() =>
                      onUpdate((prev) =>
                        toggleInCategory(prev, c.name, facets.categories),
                      )
                    }
                  />
                </li>
              ))}
            </ul>
          </FilterSection>
        )}

        {facets && (
          <FilterSection title="Price">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder={String(facets.price_range.min)}
                  className="w-full px-2.5 py-1.5 border border-stone-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800"
                />
                <span className="text-stone-400 text-xs">–</span>
                <input
                  type="number"
                  min={0}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder={String(facets.price_range.max)}
                  className="w-full px-2.5 py-1.5 border border-stone-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800"
                />
              </div>
              <p className="text-[10px] text-stone-400">
                Range: {formatPrice(facets.price_range.min)} –{" "}
                {formatPrice(facets.price_range.max)}
              </p>
              <ul className="pt-1 space-y-0.5">
                {PRICE_PRESETS.map((p) => (
                  <li key={p.label}>
                    <button
                      onClick={() => applyPreset(p.min, p.max)}
                      className="w-full text-left text-xs text-stone-600 hover:text-amber-800 transition-colors py-1"
                    >
                      {p.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </FilterSection>
        )}

        {facets && facets.colors.length > 0 && (
          <FilterSection title="Color">
            <div className="flex flex-wrap gap-1.5">
              {facets.colors.map((c) => (
                <FilterChip
                  key={c.name}
                  label={c.name}
                  count={c.count}
                  checked={activeColors.some(
                    (v) => v.toLowerCase() === c.name.toLowerCase(),
                  )}
                  onClick={() =>
                    onUpdate((prev) => toggleInList(prev, "colors", c.name))
                  }
                />
              ))}
            </div>
          </FilterSection>
        )}

        {facets && facets.sizes.length > 0 && (
          <FilterSection title="Size">
            <div className="flex flex-wrap gap-1.5">
              {facets.sizes.map((s) => (
                <FilterSizeButton
                  key={s.name}
                  label={s.name}
                  count={s.count}
                  checked={activeSizes.includes(s.name)}
                  onClick={() =>
                    onUpdate((prev) => toggleInList(prev, "sizes", s.name))
                  }
                />
              ))}
            </div>
          </FilterSection>
        )}

        <FilterSection title="Availability">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={inStock}
                onChange={toggleInStock}
                className="accent-amber-800"
              />
              In stock only
            </label>
            <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onSale}
                onChange={toggleOnSale}
                className="accent-amber-800"
              />
              <span>On sale</span>
              {facets?.on_sale_count != null && (
                <span className="ml-auto text-xs text-stone-400">
                  {facets.on_sale_count}
                </span>
              )}
            </label>
          </div>
        </FilterSection>
      </div>
    </aside>
  );
}

/* ============================================================
   Sub-components
   ============================================================ */

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-stone-200 pt-5 first:border-t-0 first:pt-0">
      <h3 className="text-xs tracking-wider uppercase text-stone-500 mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

function FilterCheckbox({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer select-none group">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="accent-amber-800"
      />
      <span className="capitalize group-hover:text-amber-800 transition-colors">
        {label}
      </span>
      <span className="ml-auto text-xs text-stone-400">{count}</span>
    </label>
  );
}

function FilterChip({
  label,
  count,
  checked,
  onClick,
}: {
  label: string;
  count: number;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-xs rounded-full border transition-colors capitalize ${
        checked
          ? "bg-stone-800 text-white border-stone-800"
          : "bg-white text-stone-700 border-stone-200 hover:border-amber-800"
      }`}
    >
      {label}
      <span className={`ml-1 ${checked ? "text-white/60" : "text-stone-400"}`}>
        {count}
      </span>
    </button>
  );
}

function FilterSizeButton({
  label,
  count,
  checked,
  onClick,
}: {
  label: string;
  count: number;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`min-w-[2.5rem] px-2.5 py-1.5 text-xs border rounded transition-colors ${
        checked
          ? "bg-stone-800 text-white border-stone-800"
          : "bg-white text-stone-700 border-stone-200 hover:border-amber-800"
      }`}
      title={`${count} products`}
    >
      {label}
    </button>
  );
}

function toggleInCategory(
  params: URLSearchParams,
  value: string,
  allCategories: CategoryFacet[],
): URLSearchParams {
  const next = new URLSearchParams(params);
  const current = listParam(params, "category");
  const set = new Set(current);
  if (set.has(value)) set.delete(value);
  else set.add(value);

  if (set.size === 0 || set.size === allCategories.length) {
    next.delete("category");
  } else if (set.size === 1) {
    next.set("category", Array.from(set)[0]);
  } else {
    next.set("category", Array.from(set).join(","));
  }
  next.delete("page");
  return next;
}
