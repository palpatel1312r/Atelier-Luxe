import { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, Link } from "react-router-dom";
import Layout from "../components/Layout";
import ProductCard from "../components/ProductCard";
import api from "../api/client";
import "../styles/product-list.css";
import Icon from "../components/ui/Icon";
import TradeHero from "../components/TradeHero";
import Reveal from "../components/ui/Reveal";

// ===== CACHE HELPERS =====
const CACHE_KEYS = {
    CATEGORIES: "app_categories",
    BRANDS: "app_brands",
    PRODUCTS: "product_list_",
};

const CACHE_EXPIRY = 1 * 60 * 1000; // 1 minute

const getCachedData = (key) => {
    try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp > CACHE_EXPIRY) {
            localStorage.removeItem(key);
            return null;
        }
        return data;
    } catch {
        return null;
    }
};

const setCachedData = (key, data) => {
    try {
        localStorage.setItem(
            key,
            JSON.stringify({
                data,
                timestamp: Date.now(),
            }),
        );
    } catch {
        // Ignore storage errors
    }
};

const getCacheKey = (params) => {
    const sorted = Object.keys(params)
        .filter(
            (key) =>
                params[key] !== "" &&
                params[key] !== undefined &&
                params[key] !== null,
        )
        .sort()
        .reduce((obj, key) => {
            obj[key] = params[key];
            return obj;
        }, {});
    return CACHE_KEYS.PRODUCTS + JSON.stringify(sorted);
};

const SORT_OPTIONS = [
    { value: "", label: "Relevance" },
    { value: "newest", label: "Newest First" },
    { value: "best_selling", label: "Best Selling" },
    { value: "name_asc", label: "Name A–Z" },
    { value: "name_desc", label: "Name Z–A" },
    { value: "price_low", label: "Price: Low to High" },
    { value: "price_high", label: "Price: High to Low" },
];

const DEFAULT_FILTERS = {
    category_id: "",
    brand_id: "",
    sort: "",
    in_stock: "",
    price_min: "",
    price_max: "",
};

function CatalogSortDropdown({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef(null);
    const triggerRef = useRef(null);
    const optionRefs = useRef([]);
    const selectedIndex = Math.max(
        SORT_OPTIONS.findIndex((option) => option.value === value),
        0,
    );
    const selectedOption = SORT_OPTIONS[selectedIndex];

    useEffect(() => {
        const closeOnOutsideClick = (event) => {
            if (!wrapperRef.current?.contains(event.target)) setOpen(false);
        };
        document.addEventListener("pointerdown", closeOnOutsideClick);
        return () =>
            document.removeEventListener("pointerdown", closeOnOutsideClick);
    }, []);

    const focusOption = (index) => {
        const nextIndex = (index + SORT_OPTIONS.length) % SORT_OPTIONS.length;
        setOpen(true);
        requestAnimationFrame(() => optionRefs.current[nextIndex]?.focus());
    };

    const chooseOption = (option) => {
        onChange(option.value);
        setOpen(false);
        triggerRef.current?.focus();
    };

    const handleTriggerKeyDown = (event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            focusOption(selectedIndex);
        } else if (event.key === "Tab") {
            setOpen(false);
        } else if (event.key === "Escape") {
            setOpen(false);
        }
    };

    const handleOptionKeyDown = (event, index) => {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            focusOption(index + 1);
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            focusOption(index - 1);
        } else if (event.key === "Home") {
            event.preventDefault();
            focusOption(0);
        } else if (event.key === "End") {
            event.preventDefault();
            focusOption(SORT_OPTIONS.length - 1);
        } else if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
            triggerRef.current?.focus();
        } else if (event.key === "Tab") {
            setOpen(false);
        }
    };

    return (
        <div className="catalog-sort" ref={wrapperRef}>
            <button
                ref={triggerRef}
                type="button"
                className="catalog-sort__trigger"
                aria-label="Sort products"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls="catalog-sort-options"
                onClick={() => setOpen((isOpen) => !isOpen)}
                onKeyDown={handleTriggerKeyDown}
            >
                <span>{selectedOption.label}</span>
                <Icon
                    name="chevron"
                    size={15}
                    className={`catalog-sort__chevron${open ? " is-open" : ""}`}
                />
            </button>
            {open && (
                <div
                    id="catalog-sort-options"
                    className="catalog-sort__options"
                    role="listbox"
                    aria-label="Sort products"
                >
                    {SORT_OPTIONS.map((option, index) => (
                        <button
                            key={option.value}
                            ref={(element) => {
                                optionRefs.current[index] = element;
                            }}
                            type="button"
                            className={`catalog-sort__option${value === option.value ? " is-selected" : ""}`}
                            role="option"
                            aria-selected={value === option.value}
                            tabIndex={-1}
                            onClick={() => chooseOption(option)}
                            onKeyDown={(event) =>
                                handleOptionKeyDown(event, index)
                            }
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function CatalogCategoryDropdown({ categories, value, onChange }) {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef(null);
    const triggerRef = useRef(null);
    const optionRefs = useRef([]);
    const options = [
        { value: "", label: "All categories" },
        ...categories.map((category) => ({
            value: String(category.id),
            label: category.name,
        })),
    ];
    const selectedIndex = Math.max(
        options.findIndex((option) => option.value === String(value)),
        0,
    );

    useEffect(() => {
        const closeOnOutsideClick = (event) => {
            if (!wrapperRef.current?.contains(event.target)) setOpen(false);
        };
        document.addEventListener("pointerdown", closeOnOutsideClick);
        return () =>
            document.removeEventListener("pointerdown", closeOnOutsideClick);
    }, []);

    const focusOption = (index) => {
        const nextIndex = (index + options.length) % options.length;
        setOpen(true);
        requestAnimationFrame(() => optionRefs.current[nextIndex]?.focus());
    };

    const chooseOption = (option) => {
        onChange(option.value);
        setOpen(false);
        triggerRef.current?.focus();
    };

    return (
        <div className="catalog-category" ref={wrapperRef}>
            <button
                ref={triggerRef}
                type="button"
                className="catalog-category__trigger"
                aria-label="Filter by category"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls="catalog-category-options"
                onClick={() => setOpen((isOpen) => !isOpen)}
                onKeyDown={(event) => {
                    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                        event.preventDefault();
                        focusOption(selectedIndex);
                    } else if (event.key === "Escape") {
                        setOpen(false);
                    }
                }}
            >
                <span className="catalog-category__label">Category</span>
                <span className="catalog-category__value">
                    {options[selectedIndex].label}
                </span>
                <Icon
                    name="chevron"
                    size={15}
                    className={`catalog-sort__chevron${open ? " is-open" : ""}`}
                />
            </button>
            {open && (
                <div
                    id="catalog-category-options"
                    className="catalog-sort__options catalog-category__options"
                    role="listbox"
                    aria-label="Filter by category"
                >
                    {options.map((option, index) => (
                        <button
                            key={option.value || "all"}
                            ref={(element) => {
                                optionRefs.current[index] = element;
                            }}
                            type="button"
                            className={`catalog-sort__option${String(value) === option.value ? " is-selected" : ""}`}
                            role="option"
                            aria-selected={String(value) === option.value}
                            tabIndex={-1}
                            onClick={() => chooseOption(option)}
                            onKeyDown={(event) => {
                                if (event.key === "ArrowDown") {
                                    event.preventDefault();
                                    focusOption(index + 1);
                                } else if (event.key === "ArrowUp") {
                                    event.preventDefault();
                                    focusOption(index - 1);
                                } else if (event.key === "Home") {
                                    event.preventDefault();
                                    focusOption(0);
                                } else if (event.key === "End") {
                                    event.preventDefault();
                                    focusOption(options.length - 1);
                                } else if (event.key === "Escape") {
                                    event.preventDefault();
                                    setOpen(false);
                                    triggerRef.current?.focus();
                                } else if (event.key === "Tab") {
                                    setOpen(false);
                                }
                            }}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function ProductList() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [products, setProducts] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);

    const q = searchParams.get("q") || "";
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);

    const updateSearch = (value) => {
        setSearchParams(
            (current) => {
                const next = new URLSearchParams(current);
                if (value) next.set("q", value);
                else next.delete("q");
                return next;
            },
            { replace: true },
        );
        setPage(1);
    };

    useEffect(() => {
        setPage(1);
    }, [q]);

    // ---------- Load categories with cache ----------
    useEffect(() => {
        const cachedCategories = getCachedData(CACHE_KEYS.CATEGORIES);
        if (cachedCategories) {
            setCategories(cachedCategories);
            // Still fetch in background
            fetchCategories();
            return;
        }
        fetchCategories();

        async function fetchCategories() {
            try {
                const { data } = await api.get("/categories");
                setCategories(data.data || []);
                setCachedData(CACHE_KEYS.CATEGORIES, data.data || []);
            } catch {
                // Ignore
            }
        }
    }, []);

    // ---------- Load brands with cache ----------
    useEffect(() => {
        const cachedBrands = getCachedData(CACHE_KEYS.BRANDS);
        if (cachedBrands) {
            setBrands(cachedBrands);
            // Still fetch in background
            fetchBrands();
            return;
        }
        fetchBrands();

        async function fetchBrands() {
            try {
                const { data } = await api.get("/brands");
                setBrands(data.data || []);
                setCachedData(CACHE_KEYS.BRANDS, data.data || []);
            } catch {
                // Ignore
            }
        }
    }, []);

    // ---------- Load products with cache ----------
    // Ignore older responses when a search/filter/page changes quickly.
    useEffect(() => {
        let cancelled = false;
        const controller = new AbortController();
        const params = Object.fromEntries(
            Object.entries({ q, page, per_page: 20, ...filters }).filter(
                ([, value]) => value !== "",
            ),
        );
        const cacheKey = getCacheKey(params);
        const cachedProducts = getCachedData(cacheKey);

        if (cachedProducts) {
            setProducts(cachedProducts.data || []);
            setMeta(cachedProducts.meta || null);
            setLoading(false);
        } else {
            setLoading(true);
        }

        async function fetchProducts() {
            try {
                const { data } = await api.get("/products", {
                    params,
                    signal: controller.signal,
                });
                if (cancelled) return;
                setProducts(data.data || []);
                setMeta(data.meta || null);
                setCachedData(cacheKey, {
                    data: data.data,
                    meta: data.meta,
                });
            } catch (err) {
                if (!cancelled && err?.code !== "ERR_CANCELED") {
                    console.error("Error loading products:", err);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchProducts();
        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [q, page, filters]);

    const activeFilterCount = useMemo(
        () => Object.values(filters).filter((v) => v !== "").length,
        [filters],
    );

    const openSheet = () => {
        setDraftFilters(filters);
        setSheetOpen(true);
    };
    const applySheet = () => {
        setFilters(draftFilters);
        setPage(1);
        setSheetOpen(false);
    };
    const clearSheet = () => {
        setDraftFilters(DEFAULT_FILTERS);
    };

    const selectCategory = (id) => {
        setFilters((f) => ({ ...f, category_id: id }));
        setPage(1);
    };

    const removeFilter = (key) => {
        setFilters((f) => ({ ...f, [key]: "" }));
        setPage(1);
    };

    return (
        <Layout>
            <div className="product-list-page">
                <TradeHero
                    variant="catalog"
                    eyebrow=""
                    title="Good products."
                    emphasis="Great possibilities."
                    description="A considered range for ambitious businesses. Find relevant products, compare your trade prices, and order with less friction."
                    count={meta?.total}
                    countLabel="products in this selection"
                    products={products}
                />
                {/* <div className="studio-market-note">
                    <strong>THE CURATED MARKET</strong>
                    <span>
                        Find your next idea. Source your next opportunity.
                    </span>
                    <span>
                        <Icon name="shield" size={16} /> Prices tailored to your
                        account
                    </span>
                </div> */}
                {/* <div className="trade-v12-marketbar" aria-label="Quick sourcing actions">
                    <div><span className="trade-v12-marketbar__dot" aria-hidden="true"/><strong>Your sourcing desk</strong><span>Browse by category, compare trade rates, and replenish faster.</span></div>
                    <nav aria-label="Procurement shortcuts">
                        <Link to="/wishlist"><Icon name="heart" size={15}/> Saved items</Link>
                        <Link to="/fast-order"><Icon name="orders" size={15}/> Order by SKU <Icon name="arrow" size={13}/></Link>
                    </nav>
                </div> */}
                <div className="catalog-results__heading">
                    <div>
                        <span className="catalog-results__eyebrow">
                            CURATED FOR YOUR BUSINESS
                        </span>
                        <h2>Explore the catalog</h2>
                    </div>
                    <span className="catalog-results__count">
                        <Icon name="box" size={16} />
                        {meta?.total ?? products.length} products
                    </span>
                </div>
                <div className="product-list-page__toolbar">
                    <CatalogCategoryDropdown
                        categories={categories}
                        value={filters.category_id}
                        onChange={selectCategory}
                    />
                    <CatalogSortDropdown
                        value={filters.sort}
                        onChange={(sort) => {
                            setFilters((f) => ({ ...f, sort }));
                            setPage(1);
                        }}
                    />
                    <button
                        className="product-list-page__filter-toggle"
                        onClick={openSheet}
                    >
                        <Icon name="filter" size={17} /> Sort &amp; Filter
                        {activeFilterCount > 0 && (
                            <span className="product-list-page__filter-count">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>

                <div
                    className="catalog-quick-filters"
                    role="group"
                    aria-label="Quick inventory filters"
                >
                    <span>
                        <Icon name="filter" size={14} /> Quick filters
                    </span>
                    <button
                        type="button"
                        aria-pressed={filters.in_stock === ""}
                        onClick={() => {
                            setFilters((f) => ({ ...f, in_stock: "" }));
                            setPage(1);
                        }}
                    >
                        All stock
                    </button>
                    <button
                        type="button"
                        aria-pressed={filters.in_stock === "1"}
                        onClick={() => {
                            setFilters((f) => ({ ...f, in_stock: "1" }));
                            setPage(1);
                        }}
                    >
                        Available now
                    </button>
                    <button
                        type="button"
                        aria-pressed={filters.in_stock === "0"}
                        onClick={() => {
                            setFilters((f) => ({ ...f, in_stock: "0" }));
                            setPage(1);
                        }}
                    >
                        Out of stock
                    </button>
                </div>

                <div className="arc-market-results catalog-results--full">
                    {activeFilterCount > 0 && (
                        <div className="product-list-page__active-filters">
                            {filters.sort && (
                                <ActiveChip
                                    label={
                                        SORT_OPTIONS.find(
                                            (o) => o.value === filters.sort,
                                        )?.label
                                    }
                                    onRemove={() => removeFilter("sort")}
                                />
                            )}
                            {filters.brand_id && (
                                <ActiveChip
                                    label={
                                        brands.find(
                                            (b) =>
                                                String(b.id) ===
                                                filters.brand_id,
                                        )?.name || "Brand"
                                    }
                                    onRemove={() => removeFilter("brand_id")}
                                />
                            )}
                            {filters.in_stock && (
                                <ActiveChip
                                    label={
                                        filters.in_stock === "1"
                                            ? "In Stock"
                                            : "Out of Stock"
                                    }
                                    onRemove={() => removeFilter("in_stock")}
                                />
                            )}
                            {(filters.price_min || filters.price_max) && (
                                <ActiveChip
                                    label={`₹${filters.price_min || 0}–${filters.price_max || "∞"}`}
                                    onRemove={() => {
                                        removeFilter("price_min");
                                        removeFilter("price_max");
                                    }}
                                />
                            )}
                        </div>
                    )}

                    {loading ? (
                        <SkeletonGrid />
                    ) : (
                        <>
                            <div className="product-list-page__grid catalog-grid--delight">
                                {products.map((p, index) => (
                                    <ProductCard
                                        key={p.id}
                                        product={p}
                                        revealIndex={index}
                                    />
                                ))}
                            </div>

                            {products.length === 0 && (
                                <Reveal className="product-list-page__empty catalog-empty">
                                    <span className="catalog-empty__symbol">
                                        <Icon name="search" size={31} />
                                    </span>
                                    <p className="product-list-page__empty-title">
                                        Nothing found just yet
                                    </p>
                                    <p className="product-list-page__empty-sub">
                                        Try clearing a filter or searching a
                                        different term.
                                    </p>
                                    <button
                                        type="button"
                                        className="catalog-empty__reset"
                                        onClick={() => {
                                            updateSearch("");
                                            setFilters(DEFAULT_FILTERS);
                                        }}
                                    >
                                        Clear search &amp; filters{" "}
                                        <Icon name="arrow" size={16} />
                                    </button>
                                </Reveal>
                            )}

                            {meta && meta.last_page > 1 && (
                                <div className="product-list-page__pagination">
                                    <button
                                        disabled={meta.current_page <= 1}
                                        onClick={() => setPage((p) => p - 1)}
                                    >
                                        ← Prev
                                    </button>
                                    <span className="tabular">
                                        {meta.current_page} / {meta.last_page}
                                    </span>
                                    <button
                                        disabled={
                                            meta.current_page >= meta.last_page
                                        }
                                        onClick={() => setPage((p) => p + 1)}
                                    >
                                        Next →
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {sheetOpen && (
                <FilterSheet
                    draft={draftFilters}
                    setDraft={setDraftFilters}
                    brands={brands}
                    onApply={applySheet}
                    onClear={clearSheet}
                    onClose={() => setSheetOpen(false)}
                    resultCount={meta?.total}
                />
            )}
        </Layout>
    );
}

function ActiveChip({ label, onRemove }) {
    return (
        <button className="chip chip--removable" onClick={onRemove}>
            {label} <span>✕</span>
        </button>
    );
}

function SkeletonGrid() {
    return (
        <div className="product-list-page__grid">
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="product-skeleton">
                    <div className="product-skeleton__img" />
                    <div
                        className="product-skeleton__line"
                        style={{ width: "70%" }}
                    />
                    <div
                        className="product-skeleton__line"
                        style={{ width: "45%" }}
                    />
                </div>
            ))}
        </div>
    );
}

function FilterSheet({
    draft,
    setDraft,
    brands,
    onApply,
    onClear,
    onClose,
    resultCount,
}) {
    const closeRef = useRef(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        closeRef.current?.focus();
        const onEscape = (event) => {
            if (event.key === "Escape") onCloseRef.current();
        };
        document.addEventListener("keydown", onEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", onEscape);
        };
    }, []);

    return createPortal(
        <div className="filter-sheet-overlay" onClick={onClose}>
            <div
                className="filter-sheet"
                role="dialog"
                aria-modal="true"
                aria-labelledby="catalog-filter-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="filter-sheet__handle" />
                <div className="filter-sheet__header">
                    <h2 id="catalog-filter-title">Sort &amp; Filter</h2>
                    <button
                        ref={closeRef}
                        type="button"
                        aria-label="Close filters"
                        className="filter-sheet__close"
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </div>

                <div className="filter-sheet__body">
                    <section className="filter-sheet__section">
                        <h3>Sort by</h3>
                        <div className="filter-sheet__option-list">
                            {SORT_OPTIONS.map((o) => (
                                <label
                                    key={o.value}
                                    className="filter-sheet__radio"
                                >
                                    <input
                                        type="radio"
                                        name="sort"
                                        checked={draft.sort === o.value}
                                        onChange={() =>
                                            setDraft((d) => ({
                                                ...d,
                                                sort: o.value,
                                            }))
                                        }
                                    />
                                    {o.label}
                                </label>
                            ))}
                        </div>
                    </section>

                    <section className="filter-sheet__section">
                        <h3>Availability</h3>
                        <div className="filter-sheet__pill-row">
                            {[
                                ["", "All"],
                                ["1", "In Stock"],
                                ["0", "Out of Stock"],
                            ].map(([val, label]) => (
                                <button
                                    key={val}
                                    className={`chip ${draft.in_stock === val ? "chip--active" : ""}`}
                                    onClick={() =>
                                        setDraft((d) => ({
                                            ...d,
                                            in_stock: val,
                                        }))
                                    }
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </section>

                    {brands.length > 0 && (
                        <section className="filter-sheet__section">
                            <h3>Brand</h3>
                            <div className="filter-sheet__pill-row">
                                <button
                                    className={`chip ${draft.brand_id === "" ? "chip--active" : ""}`}
                                    onClick={() =>
                                        setDraft((d) => ({
                                            ...d,
                                            brand_id: "",
                                        }))
                                    }
                                >
                                    Any
                                </button>
                                {brands.map((b) => (
                                    <button
                                        key={b.id}
                                        className={`chip ${draft.brand_id === String(b.id) ? "chip--active" : ""}`}
                                        onClick={() =>
                                            setDraft((d) => ({
                                                ...d,
                                                brand_id: String(b.id),
                                            }))
                                        }
                                    >
                                        {b.name}
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}

                    <section className="filter-sheet__section">
                        <h3>Price range (₹)</h3>
                        <div className="filter-sheet__price-row">
                            <input
                                type="number"
                                placeholder="Min"
                                value={draft.price_min}
                                onChange={(e) =>
                                    setDraft((d) => ({
                                        ...d,
                                        price_min: e.target.value,
                                    }))
                                }
                            />
                            <span>–</span>
                            <input
                                type="number"
                                placeholder="Max"
                                value={draft.price_max}
                                onChange={(e) =>
                                    setDraft((d) => ({
                                        ...d,
                                        price_max: e.target.value,
                                    }))
                                }
                            />
                        </div>
                    </section>
                </div>

                <div className="filter-sheet__footer">
                    <button className="btn btn--outline" onClick={onClear}>
                        Clear all
                    </button>
                    <button className="btn btn--brass" onClick={onApply}>
                        Show results
                        {resultCount != null ? ` (${resultCount})` : ""}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
