import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import api from "../../api/client";
import Icon from "../../components/ui/Icon";
import EnterpriseEmpty from "../../components/ui/EnterpriseEmpty";
import ProductResultThumbnail from "../../components/ProductResultThumbnail";
import AdminDataTableControls from "../../components/ui/AdminDataTableControls";
import "../../styles/admin-common.css";
import "../../styles/admin-products.css";

export default function AdminProducts() {
    const [products, setProducts] = useState([]);
    const [density, setDensity] = useState("comfortable");
    const [meta, setMeta] = useState(null);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(20);
    const [sortBy, setSortBy] = useState("newest");
    const [q, setQ] = useState("");
    const [selected, setSelected] = useState([]);
    const [selectAllPages, setSelectAllPages] = useState(false);
    const [bulkAction, setBulkAction] = useState("");
    const [loading, setLoading] = useState(true);
    const [searchResults, setSearchResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const searchDebounce = useRef(null);
    const searchWrapRef = useRef(null);
    const selectAllRef = useRef(null);
    const selectAllMobileRef = useRef(null);

    /* ---------- load ---------- */
    const load = (search = q, pageNum = page) => {
        setLoading(true);
        api.get("/products", {
            params: {
                page: pageNum,
                per_page: perPage,
                q: search || undefined,
                sort: sortBy,
                include_inactive: 1,
            },
        })
            .then(({ data }) => {
                setProducts(data.data);
                setMeta(data.meta);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, perPage, sortBy]);

    /* Close search dropdown on outside click */
    useEffect(() => {
        const onDocClick = (e) => {
            if (
                searchWrapRef.current &&
                !searchWrapRef.current.contains(e.target)
            ) {
                setShowResults(false);
            }
        };
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, []);

    /* ---------- derived stats ---------- */
    const stats = useMemo(() => {
        const total = meta?.total ?? products.length;
        const active = products.filter((p) => p.is_active).length;
        const lowStock = products.filter(
            (p) => p.stock_status === "low_stock",
        ).length;
        const outOfStock = products.filter(
            (p) => p.stock_status === "out_of_stock",
        ).length;
        return { total, active, lowStock, outOfStock };
    }, [products, meta]);

    /* ---------- search ---------- */
    const searchProducts = (value) => {
        setQ(value);
        setShowResults(true);
        clearTimeout(searchDebounce.current);
        if (value.length < 2) {
            setSearchResults([]);
            return;
        }
        searchDebounce.current = setTimeout(async () => {
            try {
                const { data } = await api.get("/products", {
                    params: { q: value, per_page: 10, include_inactive: 1 },
                });
                setSearchResults(data.data || []);
            } catch {
                setSearchResults([]);
            }
        }, 300);
    };

    const runSearch = () => {
        setSearchResults([]);
        setShowResults(false);
        setPage(1);
        load(q, 1);
    };

    const clearSearch = () => {
        setQ("");
        setSearchResults([]);
        setShowResults(false);
        setPage(1);
        load("", 1);
    };

    const selectProduct = (p) => {
        setQ(p.name);
        setSearchResults([]);
        setShowResults(false);
        setPage(1);
        load(p.name, 1);
    };

    /* ---------- selection ---------- */
    const isProductSelected = (id) =>
        selected.some((selectedId) => String(selectedId) === String(id));

    const toggleSelect = (id) => {
        setSelectAllPages(false);
        setSelected((current) => {
            const alreadySelected = current.some(
                (selectedId) => String(selectedId) === String(id),
            );
            return alreadySelected
                ? current.filter(
                      (selectedId) => String(selectedId) !== String(id),
                  )
                : [...current, id];
        });
    };

    const toggleSelectAll = async () => {
        const currentPageIds = products.map((p) => p.id);
        const allOnPageSelected =
            currentPageIds.length > 0 &&
            currentPageIds.every(isProductSelected);

        if (allOnPageSelected || selectAllPages) {
            setSelected([]);
            setSelectAllPages(false);
            return;
        }

        try {
            const params = {
                q: q || undefined,
                per_page: 100,
                include_inactive: 1,
                sort: "newest",
            };
            const { data } = await api.get("/products", {
                params: {
                    ...params,
                    page: 1,
                },
            });
            const ids = (data.data || []).map((p) => p.id);
            const lastPage = data.meta?.last_page ?? 1;

            for (let pageNum = 2; pageNum <= lastPage; pageNum += 1) {
                const pageResponse = await api.get("/products", {
                    params: { ...params, page: pageNum },
                });
                ids.push(...(pageResponse.data.data || []).map((p) => p.id));
            }

            setSelected(ids);
            setSelectAllPages(true);
        } catch (err) {
            alert(
                err.response?.data?.message ||
                    "Could not select all products. Please try again.",
            );
        }
    };

    const clearSelection = () => {
        setSelected([]);
        setSelectAllPages(false);
        setBulkAction("");
    };

    /* ---------- bulk ---------- */
    const applyBulkAction = async () => {
        if (!bulkAction || selected.length === 0) return;
        try {
            await api.post("/admin/products/bulk-action", {
                product_ids: selected,
                action: bulkAction,
            });
            clearSelection();
            load();
        } catch (err) {
            alert(err.response?.data?.message || "Bulk action failed.");
        }
    };

    const deleteProduct = async (id) => {
        if (!confirm("Delete this product? This cannot be undone.")) return;
        await api.delete(`/admin/products/${id}`);
        load();
    };

    const allOnPageSelected =
        products.length > 0 && products.every((p) => isProductSelected(p.id));
    const someOnPageSelected =
        !allOnPageSelected &&
        products.some((p) => isProductSelected(p.id));

    useEffect(() => {
        if (selectAllRef.current) {
            selectAllRef.current.indeterminate = someOnPageSelected;
        }
        if (selectAllMobileRef.current) {
            selectAllMobileRef.current.indeterminate = someOnPageSelected;
        }
    }, [someOnPageSelected]);

    const renderBulkActionControls = () => (
        <div className="ap-bulk-bar-inline">
            <div className="ap-bulk-bar-inline__left">
                <span className="ap-bulk-badge">
                    <Icon name="check" size={12} />
                    <strong>{selected.length}</strong> selected
                    {selectAllPages ? " (all pages)" : ""}
                </span>
                {!selectAllPages && meta?.total > products.length && (
                    <button
                        type="button"
                        className="ap-bulk-select-all-btn"
                        onClick={toggleSelectAll}
                    >
                        Select all {meta.total} products
                    </button>
                )}
            </div>

            <div className="ap-bulk-bar-inline__right">
                <select
                    className="ap-bulk-select-control"
                    value={bulkAction}
                    onChange={(event) => setBulkAction(event.target.value)}
                    aria-label="Choose bulk action"
                >
                    <option value="">Choose action…</option>
                    <option value="activate">Activate</option>
                    <option value="deactivate">Deactivate</option>
                    <option value="mark_in_stock">Mark In Stock</option>
                    <option value="mark_out_of_stock">Mark Out of Stock</option>
                    <option value="delete">Delete Selected</option>
                </select>
                <button
                    type="button"
                    className="ap-btn ap-btn--primary ap-btn--sm"
                    onClick={applyBulkAction}
                    disabled={!bulkAction}
                >
                    Apply
                </button>
                <button
                    type="button"
                    className="ap-btn ap-btn--ghost ap-btn--sm"
                    onClick={clearSelection}
                >
                    Clear
                </button>
            </div>
        </div>
    );

    /* ============================================================
       RENDER
       ============================================================ */
    return (
        <AdminLayout>
            <div className="admin-products">
                {/* ===== Header ===== */}
                <header className="ap-head">
                    <div>
                        <p className="ap-head__eyebrow">
                            <span className="commerce-dot" />
                            Catalog operations
                        </p>
                        <h1 className="ap-head__title">The inventory edit.</h1>
                        <p className="ap-head__sub">
                            Organize what you sell. Keep product information,
                            availability, and inventory under control.
                        </p>
                    </div>
                </header>

                {/* ===== Stats ===== */}
                {!loading && products.length > 0 && (
                    <div className="ap-stats" aria-label="Catalog overview">
                        <div className="ap-stats__item">
                            <span className="ap-stats__label">
                                Total products
                            </span>
                            <span className="ap-stats__value">
                                {stats.total}
                            </span>
                        </div>
                        <div className="ap-stats__item ap-stats__item--success">
                            <span className="ap-stats__label">Active</span>
                            <span className="ap-stats__value">
                                {stats.active}
                            </span>
                        </div>
                        <div className="ap-stats__item ap-stats__item--warn">
                            <span className="ap-stats__label">Low stock</span>
                            <span className="ap-stats__value">
                                {stats.lowStock}
                            </span>
                        </div>
                        <div className="ap-stats__item ap-stats__item--danger">
                            <span className="ap-stats__label">
                                Out of stock
                            </span>
                            <span className="ap-stats__value">
                                {stats.outOfStock}
                            </span>
                        </div>
                    </div>
                )}

                {/* ===== Toolbar ===== */}
                <div className="ap-toolbar">
                    <div className="ap-search" ref={searchWrapRef}>
                        <input
                            className="ap-search__input"
                            placeholder="Search products…"
                            value={q}
                            onChange={(e) => searchProducts(e.target.value)}
                            onFocus={() => setShowResults(true)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    runSearch();
                                }
                            }}
                        />
                        {q.length > 0 && (
                            <button
                                type="button"
                                onClick={clearSearch}
                                className="ap-search__clear"
                                aria-label="Clear search"
                            >
                                ✕
                            </button>
                        )}
                        {showResults && searchResults.length > 0 && (
                            <div className="ap-search__results">
                                {searchResults.map((p) => (
                                    <div
                                        key={p.id}
                                        className="ap-search__result"
                                        onClick={() => selectProduct(p)}
                                    >
                                        <ProductResultThumbnail product={p} size="sm" />
                                        <span className="product-result-copy">
                                            <span className="ap-search__result-name">{p.name}</span>
                                            <span className="ap-search__result-meta">{p.sku || p.category}</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        className="ap-btn ap-btn--outline ap-btn--sm"
                        onClick={runSearch}
                    >
                        <Icon name="search" size={13} />
                        Search
                    </button>

                    <Link
                        to="/admin/products/new"
                        className="ap-btn ap-btn--primary ap-btn--sm"
                    >
                        <Icon name="plus" size={14} />
                        Add Product
                    </Link>

                    <div className="enterprise-density" role="group" aria-label="Table density"><button type="button" aria-pressed={density === "comfortable"} onClick={() => setDensity("comfortable")}>Comfortable</button><button type="button" aria-pressed={density === "compact"} onClick={() => setDensity("compact")}>Compact</button></div>
                    <div className="ap-toolbar__spacer" />

                    <span className="ap-toolbar__count">
                        {meta?.total ?? products.length} product
                        {(meta?.total ?? products.length) !== 1 ? "s" : ""}
                    </span>
                </div>

                {/* Bulk actions now integrated directly into table header */}

                {/* ===== Table ===== */}
                <div className={`ap-table-card enterprise-inventory-matrix is-${density}`}>
                    {loading ? (
                        <div className="ap-skeleton">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="ap-skeleton__row" />
                            ))}
                        </div>
                    ) : products.length === 0 ? (
                        <EnterpriseEmpty title={q ? "No matching products" : "Your product catalog is empty"} description={q ? `Nothing matches “${q}”. Try another search.` : "Add your first wholesale product to start building your inventory."} to={!q ? "/admin/products/new" : undefined} action="Create a product" />
                    ) : (
                        <>
                            {selected.length > 0 && (
                                <div className="ap-bulk-mobile">
                                    <label className="ap-bulk-mobile__select-all">
                                        <input
                                            type="checkbox"
                                            className="ap-check"
                                            ref={selectAllMobileRef}
                                            checked={
                                                selectAllPages ||
                                                allOnPageSelected
                                            }
                                            onChange={toggleSelectAll}
                                            aria-label="Select all products on this page"
                                        />
                                        <span>Select page</span>
                                    </label>
                                    {renderBulkActionControls()}
                                </div>
                            )}
                            <div className="enterprise-mobile-product-deck">{products.map(p => <article className="enterprise-mobile-product" key={p.id}><div><input type="checkbox" className="ap-check" aria-label={`Select ${p.name}`} checked={isProductSelected(p.id)} onChange={() => toggleSelect(p.id)}/><span className="enterprise-mobile-product__title"><strong>{p.name}</strong><small>{p.sku || p.category || 'Catalog product'}</small></span><span className={`enterprise-stock ${Number(p.available_stock)>0 ? 'is-in':''}`}>{p.available_stock} in stock</span></div><dl><div><dt>MRP</dt><dd>₹{Number(p.mrp||0).toLocaleString('en-IN')}</dd></div><div><dt>Status</dt><dd>{p.is_active?'Active':'Inactive'}</dd></div></dl><div className="enterprise-mobile-product__actions"><Link to={`/admin/products/${p.id}/edit`}>Edit product</Link><button type="button" onClick={()=>deleteProduct(p.id)}>Delete</button></div></article>)}</div><div className="ap-table-scroll">
                            <table className="ap-table">
                                <thead className={selected.length > 0 ? "has-selection" : ""}>
                                    {selected.length > 0 ? (
                                        <tr className="ap-bulk-head-row">
                                            <th className="ap-check-col">
                                                <input
                                                    type="checkbox"
                                                    className="ap-check"
                                                    ref={selectAllRef}
                                                    checked={
                                                        selectAllPages ||
                                                        allOnPageSelected
                                                    }
                                                    onChange={toggleSelectAll}
                                                    aria-label="Select all"
                                                />
                                            </th>
                                            <th colSpan={6} className="ap-bulk-head-content">
                                                {renderBulkActionControls()}
                                            </th>
                                        </tr>
                                    ) : (
                                        <tr>
                                            <th className="ap-check-col">
                                                <input
                                                    type="checkbox"
                                                    className="ap-check"
                                                    ref={selectAllRef}
                                                    checked={
                                                        selectAllPages ||
                                                        allOnPageSelected
                                                    }
                                                    onChange={toggleSelectAll}
                                                    aria-label="Select all"
                                                />
                                            </th>
                                            <th>Product</th>
                                            <th>Category</th>
                                            <th>MRP</th>
                                            <th>Stock</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    )}
                                </thead>
                                <tbody>
                                    {products.map((p) => {
                                        const img =
                                            p.images?.find((i) => i.is_primary)
                                                ?.image_path ||
                                            p.images?.[0]?.image_path;
                                        const isSelected = isProductSelected(p.id);
                                        const stockClass =
                                            p.stock_status === "in_stock"
                                                ? "ap-stock--in-stock"
                                                : p.stock_status === "low_stock"
                                                  ? "ap-stock--low"
                                                  : "ap-stock--out";

                                        return (
                                            <tr
                                                key={p.id}
                                                className={
                                                    isSelected
                                                        ? "is-selected"
                                                        : ""
                                                }
                                            >
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        className="ap-check"
                                                        checked={isSelected}
                                                        onChange={() =>
                                                            toggleSelect(p.id)
                                                        }
                                                        aria-label={`Select ${p.name}`}
                                                    />
                                                </td>
                                                <td>
                                                    <div className="ap-product">
                                                        {img ? (
                                                            <div className="ap-product__thumb">
                                                                <img
                                                                    src={img}
                                                                    alt=""
                                                                    onError={(
                                                                        e,
                                                                    ) => {
                                                                        e.currentTarget.parentElement.classList.add(
                                                                            "ap-product__thumb--empty",
                                                                        );
                                                                        e.currentTarget.style.display =
                                                                            "none";
                                                                    }}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="ap-product__thumb ap-product__thumb--empty">
                                                                —
                                                            </div>
                                                        )}
                                                        <div className="ap-product__info">
                                                            <span className="ap-product__name">
                                                                {p.name}
                                                            </span>
                                                            {p.sku && (
                                                                <span className="ap-product__meta">
                                                                    SKU: {p.sku}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    {p.category ? (
                                                        <span className="ap-category">
                                                            {p.category}
                                                        </span>
                                                    ) : (
                                                        <span
                                                            style={{
                                                                color: "var(--ink-soft)",
                                                                opacity: 0.5,
                                                            }}
                                                        >
                                                            —
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className="ap-mrp">
                                                        ₹
                                                        {Number(
                                                            p.mrp || 0,
                                                        ).toLocaleString(
                                                            "en-IN",
                                                        )}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span
                                                        className={`ap-stock ${stockClass}`}
                                                    >
                                                        {p.available_stock}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span
                                                        className={`ap-status ap-status--${
                                                            p.is_active
                                                                ? "active"
                                                                : "inactive"
                                                        }`}
                                                    >
                                                        {p.is_active
                                                            ? "Active"
                                                            : "Inactive"}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="ap-actions">
                                                        <Link
                                                            to={`/admin/products/${p.id}/edit`}
                                                            className="ap-btn ap-btn--outline ap-btn--sm"
                                                        >
                                                            <Icon
                                                                name="edit"
                                                                size={11}
                                                            />
                                                            Edit
                                                        </Link>
                                                        <button
                                                            className="ap-btn ap-btn--danger ap-btn--sm"
                                                            onClick={() =>
                                                                deleteProduct(
                                                                    p.id,
                                                                )
                                                            }
                                                            title="Delete product"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div></>
                    )}
                </div>

                {/* ===== Pagination ===== */}
                <AdminDataTableControls
                    sortBy={sortBy}
                    onSortChange={(value) => {
                        setSortBy(value);
                        setPage(1);
                    }}
                    sortOptions={[
                        { value: "newest", label: "Newest first" },
                        { value: "name_asc", label: "Name: A to Z" },
                        { value: "name_desc", label: "Name: Z to A" },
                    ]}
                    pageSize={perPage}
                    pageSizes={[10, 20, 50, 100]}
                    onPageSizeChange={(value) => {
                        setPerPage(value);
                        setPage(1);
                    }}
                    page={page}
                    pageCount={meta?.last_page || 1}
                    total={meta?.total ?? products.length}
                    countLabel="product"
                    onPageChange={setPage}
                />
            </div>
        </AdminLayout>
    );
}
