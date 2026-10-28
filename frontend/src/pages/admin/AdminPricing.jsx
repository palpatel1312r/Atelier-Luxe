import { useEffect, useRef, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import api from "../../api/client";
import Icon from "../../components/ui/Icon";
import ProductResultThumbnail from "../../components/ProductResultThumbnail";
import "../../styles/admin-common.css";
import "../../styles/admin-pricing.css";

/* Helper: classify message type for styling */
function messageType(msg) {
    if (msg.startsWith("❌")) return "error";
    if (msg.startsWith("⚠️")) return "warning";
    return "success";
}

/* Strip the leading emoji for display */
function stripEmoji(msg) {
    return msg.replace(/^(✅|❌|⚠️|🗑️)\s*/, "");
}

export default function AdminPricing() {
    const [productQuery, setProductQuery] = useState("");
    const [productResults, setProductResults] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [groups, setGroups] = useState([]);
    const [message, setMessage] = useState("");
    const searchDebounce = useRef(null);
    const searchWrapRef = useRef(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/admin/groups")
            .then(({ data }) => {
                setGroups(data.data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    /* Close dropdown on outside click */
    useEffect(() => {
        const onDoc = (e) => {
            if (
                searchWrapRef.current &&
                !searchWrapRef.current.contains(e.target)
            ) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, []);

    const loadProducts = async (q = "") => {
        try {
            const { data } = await api.get("/products", {
                params: {
                    q: q || undefined,
                    per_page: 15,
                    sort: "newest",
                    include_inactive: 1,
                },
            });
            setProductResults(data.data || []);
        } catch {
            setProductResults([]);
        }
    };

    const searchProducts = (q) => {
        setProductQuery(q);
        setShowDropdown(true);
        clearTimeout(searchDebounce.current);
        searchDebounce.current = setTimeout(() => loadProducts(q), 300);
    };

    const selectProduct = async (p) => {
        try {
            const { data: productData } = await api.get(`/products/${p.id}`);
            const product = productData.data;

            const { data: pricing } = await api.get(
                `/admin/products/${p.id}/pricing`,
            );

            setSelectedProduct({
                ...product,
                group_prices: pricing.group_prices || [],
                dealer_prices: pricing.dealer_prices || [],
                quantity_slabs: pricing.quantity_slabs || [],
            });
            setProductResults([]);
            setProductQuery(product.name);
            setShowDropdown(false);
        } catch (err) {
            console.error("Failed to load product pricing:", err);
            setMessage("❌ Could not load product pricing.");
            setTimeout(() => setMessage(""), 3000);
        }
    };

    const clearProductSearch = () => {
        setProductQuery("");
        setProductResults([]);
        setSelectedProduct(null);
        setShowDropdown(false);
    };

    const alertClass = message ? `pm-alert--${messageType(message)}` : "";

    if (loading) {
        return (
            <AdminLayout>
                <div className="admin-pricing">
                    <div className="pm-skeleton">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="pm-skeleton__row" />
                        ))}
                    </div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="admin-pricing">
                {/* ===== Head ===== */}
                <header className="pm-head">
                    <div>
                        <p className="pm-head__eyebrow">
                            <span className="commerce-dot" />
                            Pricing operations
                        </p>
                        <h1 className="pm-head__title">Pricing Management</h1>
                        <p className="pm-head__sub">
                            Set group prices, dealer-specific overrides, and
                            quantity-slab pricing per product.
                        </p>
                    </div>
                </header>

                {message && (
                    <div className={`pm-alert ${alertClass}`} role="status">
                        <Icon
                            name={
                                messageType(message) === "error"
                                    ? "alert"
                                    : messageType(message) === "warning"
                                      ? "alert"
                                      : "check"
                            }
                            size={16}
                        />
                        <span>{stripEmoji(message)}</span>
                    </div>
                )}

                {/* ===== Search card ===== */}
                <section className="pm-search-card">
                    <div className="pm-search-card__head">
                        <span className="pm-search-card__icon">
                            <Icon name="search" size={18} />
                        </span>
                        <div>
                            <h2 className="pm-search-card__title">
                                Select a product
                            </h2>
                            <p className="pm-search-card__sub">
                                Search by name or SKU to edit pricing rules.
                            </p>
                        </div>
                    </div>

                    <div className="pm-search" ref={searchWrapRef}>
                        <input
                            className="pm-search__input"
                            value={productQuery}
                            onChange={(e) => searchProducts(e.target.value)}
                            onFocus={() => {
                                setShowDropdown(true);
                                if (productResults.length === 0)
                                    loadProducts(productQuery);
                            }}
                            placeholder="Type product name or SKU…"
                        />
                        {productQuery.length > 0 && (
                            <button
                                type="button"
                                className="pm-search__clear"
                                onClick={clearProductSearch}
                                aria-label="Clear product search"
                            >
                                ✕
                            </button>
                        )}

                        {showDropdown && (
                            <div className="pm-search__dropdown">
                                {productResults.length === 0 ? (
                                    <div className="pm-search__empty">
                                        {productQuery.length < 2
                                            ? "Keep typing to search…"
                                            : "No products found."}
                                    </div>
                                ) : (
                                    productResults.map((p) => (
                                        <div
                                            key={p.id}
                                            className="pm-search__option"
                                            onMouseDown={() => selectProduct(p)}
                                        >
                                            <ProductResultThumbnail product={p} size="sm" />
                                            <span className="product-result-copy">
                                                <span className="pm-search__option-name">{p.name}</span>
                                                {p.sku && <span className="pm-search__option-meta">{p.sku}</span>}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {!selectedProduct && (
                        <div
                            className="pm-empty"
                            style={{ padding: "40px 12px" }}
                        >
                            <div className="pm-empty__icon">
                                <Icon name="tag" size={26} />
                            </div>
                            <h3>No product selected</h3>
                            <p>
                                Start typing in the search above to load a
                                product's pricing rules.
                            </p>
                        </div>
                    )}
                </section>

                {/* ===== Editors ===== */}
                {selectedProduct && (
                    <>
                        <GroupPriceEditor
                            product={selectedProduct}
                            groups={groups}
                            setMessage={setMessage}
                        />
                        <DealerOverrideEditor
                            product={selectedProduct}
                            setMessage={setMessage}
                        />
                        <QuantitySlabEditor
                            product={selectedProduct}
                            setMessage={setMessage}
                        />
                    </>
                )}
            </div>
        </AdminLayout>
    );
}

/* ============================================================
   Group Price Editor
   ============================================================ */
function GroupPriceEditor({ product, groups, setMessage }) {
    const [prices, setPrices] = useState({});
    const [saving, setSaving] = useState(false);
    const variants = product.variants || [];

    useEffect(() => {
        const existing = product.group_prices || product.groupPrices || [];
        const map = {};
        existing.forEach((gp) => {
            const gid = gp.group_id ?? gp.groupId ?? gp.group?.id;
            const vid = gp.variant_id ?? gp.variantId ?? null;
            if (gid == null || vid == null) return;
            map[`${String(gid)}_${String(vid)}`] = gp.price;
        });
        setPrices(map);
    }, [product.id, variants.length]);

    const saveAll = async () => {
        setSaving(true);
        try {
            const groupPricesToSend = [];
            groups.forEach((g) => {
                variants.forEach((v, idx) => {
                    const key = v.id
                        ? `${String(g.id)}_${String(v.id)}`
                        : `${String(g.id)}_new-${idx}`;
                    const price = prices[key];
                    if (price === "" || price === undefined || price === null)
                        return;
                    groupPricesToSend.push({
                        product_id: product.id,
                        group_id: g.id,
                        variant_id: v.id || null,
                        price: Number(price),
                    });
                });
            });

            if (groupPricesToSend.length > 0) {
                await Promise.all(
                    groupPricesToSend.map((gp) =>
                        api.post("/admin/pricing/group-price", gp),
                    ),
                );
                setMessage("✅ All group prices saved");
            } else {
                setMessage("⚠️ No group prices to save");
            }
            setTimeout(() => setMessage(""), 3000);
        } catch (err) {
            setMessage(
                "❌ " + (err.response?.data?.message || "Could not save."),
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="pm-card">
            <div className="pm-card__head">
                <div className="pm-card__title-group">
                    <span className="pm-card__icon">
                        <Icon name="layers" size={18} />
                    </span>
                    <div>
                        <h2 className="pm-card__title">Group Prices</h2>
                        <p className="pm-card__sub">
                            Set per-variant prices for each dealer group. Empty
                            cells fall back to standard pricing.
                        </p>
                    </div>
                </div>
                <span className="pm-card__badge">
                    {variants.length} variant
                    {variants.length !== 1 ? "s" : ""} · {groups.length} group
                    {groups.length !== 1 ? "s" : ""}
                </span>
            </div>

            {groups.length === 0 ? (
                <div className="pm-empty" style={{ padding: "30px 12px" }}>
                    <p className="pm-card__sub">
                        No groups found. Create groups first to set tier
                        pricing.
                    </p>
                </div>
            ) : variants.length === 0 ? (
                <div className="pm-empty" style={{ padding: "30px 12px" }}>
                    <p className="pm-card__sub">
                        This product has no variants. Prices will be set
                        globally.
                    </p>
                </div>
            ) : (
                <div className="pm-gp-wrap">
                    <table className="pm-gp-table">
                        <thead>
                            <tr>
                                <th>Group</th>
                                {variants.map((v, idx) => (
                                    <th key={v.id || `new-${idx}`}>
                                        {v.sku || `Variant ${idx + 1}`}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {groups.map((g) => (
                                <tr key={g.id}>
                                    <td>{g.name}</td>
                                    {variants.map((v, idx) => {
                                        const key = v.id
                                            ? `${String(g.id)}_${String(v.id)}`
                                            : `${String(g.id)}_new-${idx}`;
                                        return (
                                            <td key={key}>
                                                <input
                                                    type="number"
                                                    className="pm-gp-input"
                                                    placeholder="₹"
                                                    value={prices[key] ?? ""}
                                                    onChange={(e) =>
                                                        setPrices({
                                                            ...prices,
                                                            [key]: e.target
                                                                .value,
                                                        })
                                                    }
                                                />
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {groups.length > 0 && variants.length > 0 && (
                <button
                    className="pm-btn pm-btn--primary"
                    onClick={saveAll}
                    disabled={saving}
                >
                    {saving ? "Saving…" : "Save All Prices"}
                </button>
            )}
        </section>
    );
}

/* ============================================================
   Dealer-Specific Override Editor
   ============================================================ */
function DealerOverrideEditor({ product, setMessage }) {
    const variantId = product.variants?.[0]?.id;
    const [dealerQuery, setDealerQuery] = useState("");
    const [dealerResults, setDealerResults] = useState([]);
    const [selectedDealer, setSelectedDealer] = useState(null);
    const [showDealerDropdown, setShowDealerDropdown] = useState(false);
    const [price, setPrice] = useState("");
    const [reason, setReason] = useState("");
    const [existingOverrides, setExistingOverrides] = useState([]);
    const [removingId, setRemovingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const searchDebounce = useRef(null);
    const wrapRef = useRef(null);

    const refreshOverrides = async () => {
        if (!product?.id) return;
        try {
            const { data } = await api.get(
                `/admin/products/${product.id}/pricing`,
            );
            setExistingOverrides(data.dealer_prices || []);
        } catch (err) {
            console.error("Failed to refresh overrides:", err);
        }
    };

    useEffect(() => {
        const overrides = product.dealer_prices || product.dealerPrices || [];
        setExistingOverrides(overrides);
        if (overrides.length > 0) {
            const firstOverride = overrides[0];
            const dealerName =
                firstOverride.dealer_name ||
                firstOverride.user?.name ||
                "Dealer #" + firstOverride.user_id;
            const dealerPhone =
                firstOverride.dealer_phone || firstOverride.user?.phone || "";
            setSelectedDealer({
                id: firstOverride.user_id,
                name: dealerName,
                phone: dealerPhone,
            });
            setDealerQuery(dealerName);
            setPrice(firstOverride.override_price);
            setReason(firstOverride.reason_text || "");
        } else {
            setSelectedDealer(null);
            setDealerQuery("");
            setPrice("");
            setReason("");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [product.id]);

    /* Close dropdown on outside click */
    useEffect(() => {
        const onDoc = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) {
                setShowDealerDropdown(false);
            }
        };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, []);

    const searchDealers = (q) => {
        setDealerQuery(q);
        setSelectedDealer(null);
        clearTimeout(searchDebounce.current);
        if (q.length < 2) {
            setDealerResults([]);
            return;
        }
        searchDebounce.current = setTimeout(async () => {
            try {
                const { data } = await api.get("/admin/sellers", {
                    params: { q, per_page: 8 },
                });
                setDealerResults(data.data || []);
                setShowDealerDropdown(true);
            } catch {
                setDealerResults([]);
            }
        }, 300);
    };

    const clearDealerSearch = () => {
        setDealerQuery("");
        setDealerResults([]);
        setSelectedDealer(null);
        setShowDealerDropdown(false);
        setPrice("");
        setReason("");
    };

    const save = async () => {
        setSaving(true);
        try {
            await api.post("/admin/pricing/dealer-override", {
                product_id: product.id,
                variant_id: variantId,
                user_id: selectedDealer.id,
                override_price: price,
                reason_text: reason,
            });
            setMessage(`✅ Special price set for ${selectedDealer.name}`);
            setTimeout(() => setMessage(""), 3000);
            setSelectedDealer(null);
            setDealerQuery("");
            setPrice("");
            setReason("");
            await refreshOverrides();
        } catch (err) {
            setMessage(
                "❌ " + (err.response?.data?.message || "Could not save."),
            );
        } finally {
            setSaving(false);
        }
    };

    const removeOverride = async (overrideId, dealerName) => {
        if (
            !window.confirm(
                `Remove special price for ${dealerName}? They will fall back to their group price.`,
            )
        )
            return;
        setRemovingId(overrideId);
        try {
            await api.delete(`/admin/pricing/dealer-override/${overrideId}`);
            setMessage(`✅ Override removed for ${dealerName}`);
            setTimeout(() => setMessage(""), 3000);
            await refreshOverrides();
        } catch (err) {
            setMessage(
                "❌ " +
                    (err.response?.data?.message ||
                        "Could not remove override."),
            );
        } finally {
            setRemovingId(null);
        }
    };

    return (
        <section className="pm-card">
            <div className="pm-card__head">
                <div className="pm-card__title-group">
                    <span className="pm-card__icon">
                        <Icon name="tag" size={18} />
                    </span>
                    <div>
                        <h2 className="pm-card__title">
                            Dealer-Specific Override
                        </h2>
                        <p className="pm-card__sub">
                            Give one dealer a special price without changing the
                            group rate. e.g. Nilesh at ₹410 while Group A stays
                            at ₹420.
                        </p>
                    </div>
                </div>
                {existingOverrides.length > 0 && (
                    <span className="pm-card__badge">
                        {existingOverrides.length} override
                        {existingOverrides.length !== 1 ? "s" : ""}
                    </span>
                )}
            </div>

            {/* Existing overrides */}
            {existingOverrides.length > 0 && (
                <div className="pm-existing">
                    <div className="pm-existing__head">
                        <p className="pm-existing__title">Existing Overrides</p>
                        <span className="pm-existing__count">
                            {existingOverrides.length}
                        </span>
                    </div>
                    <div className="pm-existing__list">
                        {existingOverrides.map((o, idx) => {
                            const dealerName =
                                o.dealer_name ||
                                o.user?.name ||
                                "Dealer #" + o.user_id;
                            return (
                                <div
                                    key={o.id ?? `override-${idx}`}
                                    className="pm-existing__item"
                                >
                                    <div className="pm-existing__item-info">
                                        <span className="pm-existing__item-name">
                                            {dealerName}
                                        </span>
                                        {o.dealer_phone && (
                                            <span className="pm-existing__item-phone">
                                                {o.dealer_phone}
                                            </span>
                                        )}
                                        <span className="pm-existing__item-price">
                                            ₹{o.override_price}
                                        </span>
                                        {o.reason_text && (
                                            <span className="pm-existing__item-reason">
                                                — {o.reason_text}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        className="pm-btn pm-btn--danger pm-btn--sm"
                                        onClick={() =>
                                            removeOverride(o.id, dealerName)
                                        }
                                        disabled={removingId === o.id}
                                    >
                                        {removingId === o.id
                                            ? "Removing…"
                                            : "✕ Remove"}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Form */}
            <div className="pm-grid">
                <div className="pm-field pm-combobox" ref={wrapRef}>
                    <label className="pm-field__label">Dealer</label>
                    <input
                        className="pm-input"
                        value={
                            selectedDealer ? selectedDealer.name : dealerQuery
                        }
                        onChange={(e) => searchDealers(e.target.value)}
                        onFocus={() => {
                            if (dealerResults.length > 0)
                                setShowDealerDropdown(true);
                        }}
                        placeholder="Search dealer name or phone…"
                        style={{ paddingRight: 36 }}
                    />
                    {dealerQuery.length > 0 && (
                        <button
                            type="button"
                            className="pm-input__clear"
                            onClick={clearDealerSearch}
                            aria-label="Clear dealer search"
                        >
                            ✕
                        </button>
                    )}
                    {showDealerDropdown && dealerResults.length > 0 && (
                        <div className="pm-combobox__dropdown">
                            {dealerResults.map((d) => (
                                <div
                                    key={d.id}
                                    className="pm-combobox__option"
                                    onMouseDown={() => {
                                        setSelectedDealer(d);
                                        setDealerQuery(d.name);
                                        setDealerResults([]);
                                        setShowDealerDropdown(false);
                                    }}
                                >
                                    <span
                                        style={{
                                            flex: 1,
                                            minWidth: 0,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {d.name}
                                    </span>
                                    <span className="pm-search__option-meta">
                                        {d.phone}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="pm-field">
                    <label className="pm-field__label">Override Price ₹</label>
                    <input
                        className="pm-input pm-input--mono"
                        type="number"
                        value={price}
                        placeholder="e.g. 410"
                        onChange={(e) => setPrice(e.target.value)}
                    />
                </div>

                <div className="pm-field pm-grid--full">
                    <label className="pm-field__label">
                        Reason
                        <span className="pm-field__optional">optional</span>
                    </label>
                    <input
                        className="pm-input"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g. loyal bulk customer"
                    />
                </div>
            </div>

            <div style={{ marginTop: 16 }}>
                <button
                    className="pm-btn pm-btn--primary"
                    disabled={!selectedDealer || !price || saving}
                    onClick={save}
                >
                    {saving
                        ? "Saving…"
                        : existingOverrides.length > 0
                          ? "Add / Update Override"
                          : "Set Override"}
                </button>
            </div>
        </section>
    );
}

/* ============================================================
   Quantity Slab Editor
   ============================================================ */
function QuantitySlabEditor({ product, setMessage }) {
    const variants = product.variants || [];
    const [selectedVariantId, setSelectedVariantId] = useState(
        variants[0]?.id ?? null,
    );
    const [slabs, setSlabs] = useState([]);
    const [existingSlabs, setExistingSlabs] = useState([]);
    const [deletingId, setDeletingId] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const all = product.quantity_slabs || [];
        setExistingSlabs(all);
        const filtered = all.filter(
            (s) => (s.variant_id ?? null) === (selectedVariantId ?? null),
        );
        setSlabs(
            filtered.length > 0
                ? filtered.map((s) => ({ ...s }))
                : [{ min_qty: 1, max_qty: "", price: "" }],
        );
    }, [selectedVariantId, product.id, product.quantity_slabs]);

    const refreshSlabs = async () => {
        if (!product?.id) return;
        try {
            const { data } = await api.get(
                `/admin/products/${product.id}/pricing`,
            );
            const all = data.quantity_slabs || [];
            setExistingSlabs(all);
            const filtered = all.filter(
                (s) => (s.variant_id ?? null) === (selectedVariantId ?? null),
            );
            setSlabs(
                filtered.length > 0
                    ? filtered.map((s) => ({ ...s }))
                    : [{ min_qty: 1, max_qty: "", price: "" }],
            );
        } catch (err) {
            console.error("Failed to refresh slabs:", err);
        }
    };

    const addRow = () =>
        setSlabs([...slabs, { min_qty: "", max_qty: "", price: "" }]);
    const updateRow = (i, key, val) =>
        setSlabs(slabs.map((s, idx) => (idx === i ? { ...s, [key]: val } : s)));
    const removeRow = (i) => setSlabs(slabs.filter((_, idx) => idx !== i));

    const save = async () => {
        setSaving(true);
        try {
            const cleaned = slabs
                .filter((s) => s.min_qty && s.price)
                .map((s) => ({
                    min_qty: Number(s.min_qty),
                    max_qty: s.max_qty ? Number(s.max_qty) : null,
                    price: Number(s.price),
                }));

            const hasIncomplete = slabs.some(
                (s) =>
                    (s.min_qty || s.max_qty || s.price) &&
                    (!s.min_qty || !s.price),
            );

            if (cleaned.length === 0 && hasIncomplete) {
                setMessage(
                    "⚠️ Please fill in Min Qty and Price for each slab, or remove empty rows.",
                );
                setTimeout(() => setMessage(""), 4000);
                setSaving(false);
                return;
            }

            await api.post("/admin/pricing/quantity-slabs", {
                product_id: product.id,
                variant_id: selectedVariantId,
                slabs: cleaned,
            });

            setMessage(
                cleaned.length > 0
                    ? "✅ Quantity slabs saved"
                    : "✅ All slabs cleared",
            );
            setTimeout(() => setMessage(""), 3000);
            await refreshSlabs();
        } catch (err) {
            setMessage(
                "❌ " +
                    (err.response?.data?.message || "Could not save slabs."),
            );
        } finally {
            setSaving(false);
        }
    };

    const removeExistingSlab = async (slabId, slabInfo) => {
        if (
            !window.confirm(
                `Delete this slab (${slabInfo.min_qty}–${slabInfo.max_qty ?? "∞"} = ₹${slabInfo.price})?`,
            )
        )
            return;
        setDeletingId(slabId);
        try {
            await api.delete(`/admin/pricing/quantity-slab/${slabId}`);
            setMessage("✅ Slab removed");
            setTimeout(() => setMessage(""), 3000);
            await refreshSlabs();
        } catch (err) {
            setMessage(
                "❌ " +
                    (err.response?.data?.message || "Could not remove slab."),
            );
        } finally {
            setDeletingId(null);
        }
    };

    const savedForVariant = existingSlabs.filter(
        (s) => (s.variant_id ?? null) === (selectedVariantId ?? null),
    );

    return (
        <section className="pm-card">
            <div className="pm-card__head">
                <div className="pm-card__title-group">
                    <span className="pm-card__icon">
                        <Icon name="layers" size={18} />
                    </span>
                    <div>
                        <h2 className="pm-card__title">
                            Quantity Slab Pricing
                        </h2>
                        <p className="pm-card__sub">
                            Offer better prices at higher quantities. Slabs
                            apply per variant, or globally across all variants.
                        </p>
                    </div>
                </div>
                <span className="pm-card__badge">
                    {savedForVariant.length} saved
                </span>
            </div>

            {variants.length > 0 && (
                <div
                    className="pm-field"
                    style={{ maxWidth: 420, marginBottom: 16 }}
                >
                    <label className="pm-field__label">
                        Applies to Variant
                    </label>
                    <select
                        className="pm-select"
                        value={selectedVariantId ?? ""}
                        onChange={(e) =>
                            setSelectedVariantId(
                                e.target.value ? Number(e.target.value) : null,
                            )
                        }
                    >
                        <option value="">— Global (all variants) —</option>
                        {variants.map((v) => (
                            <option key={v.id} value={v.id}>
                                {v.sku}
                                {v.attributes?.Size
                                    ? ` (${v.attributes.Size})`
                                    : ""}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Existing slabs */}
            {savedForVariant.length > 0 && (
                <div className="pm-existing">
                    <div className="pm-existing__head">
                        <p className="pm-existing__title">
                            Saved Slabs for this Variant
                        </p>
                        <span className="pm-existing__count">
                            {savedForVariant.length}
                        </span>
                    </div>
                    <div className="pm-existing__list">
                        {savedForVariant.map((s, idx) => (
                            <div
                                key={s.id ?? `slab-${idx}`}
                                className="pm-existing__item"
                            >
                                <div className="pm-existing__item-info">
                                    <span className="pm-existing__item-name">
                                        {s.min_qty}–{s.max_qty ?? "∞"}
                                    </span>
                                    <span className="pm-existing__item-price">
                                        ₹{s.price}
                                    </span>
                                </div>
                                <button
                                    className="pm-btn pm-btn--danger pm-btn--sm"
                                    onClick={() => removeExistingSlab(s.id, s)}
                                    disabled={deletingId === s.id}
                                >
                                    {deletingId === s.id
                                        ? "Removing…"
                                        : "✕ Remove"}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Editor rows */}
            <p className="pm-card__sub" style={{ marginBottom: 10 }}>
                Edit slabs below (this replaces all slabs for the selected
                variant when you save):
            </p>

            <div className="pm-slab-list">
                {slabs.map((s, i) => (
                    <div key={i} className="pm-slab-row">
                        <div className="pm-slab-field">
                            <label className="pm-slab-label">Min Qty</label>
                            <input
                                type="number"
                                className="pm-input pm-input--mono"
                                placeholder="Min"
                                value={s.min_qty}
                                onChange={(e) =>
                                    updateRow(i, "min_qty", e.target.value)
                                }
                            />
                        </div>
                        <div className="pm-slab-field">
                            <label className="pm-slab-label">Max Qty</label>
                            <input
                                type="number"
                                className="pm-input pm-input--mono"
                                placeholder="Blank = ∞"
                                value={s.max_qty}
                                onChange={(e) =>
                                    updateRow(i, "max_qty", e.target.value)
                                }
                            />
                        </div>
                        <div className="pm-slab-field">
                            <label className="pm-slab-label">Price ₹</label>
                            <input
                                type="number"
                                className="pm-input pm-input--mono"
                                placeholder="Price"
                                value={s.price}
                                onChange={(e) =>
                                    updateRow(i, "price", e.target.value)
                                }
                            />
                        </div>
                        <button
                            type="button"
                            className="pm-slab-remove"
                            onClick={() => removeRow(i)}
                            title="Remove slab row"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                    className="pm-btn pm-btn--outline pm-btn--sm"
                    onClick={addRow}
                    type="button"
                >
                    <Icon name="plus" size={14} />
                    Add Slab
                </button>
                <button
                    className="pm-btn pm-btn--primary pm-btn--sm"
                    onClick={save}
                    disabled={saving}
                    type="button"
                >
                    {saving ? "Saving…" : "Save Slabs"}
                </button>
            </div>
        </section>
    );
}
