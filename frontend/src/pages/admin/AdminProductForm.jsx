import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import api from "../../api/client";
import RichTextEditor from "../../components/RichTextEditor.jsx";
import Icon from "../../components/ui/Icon";
import "../../styles/admin-common.css";
import "../../styles/admin-product-edit.css";

const LABEL_OPTIONS = [
    "New",
    "Hot",
    "Trending",
    "Limited Stock",
    "Offer",
    "Best Seller",
];

export default function AdminProductForm() {
    const navigate = useNavigate();

    /* ---------- reference data ---------- */
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [groups, setGroups] = useState([]);
    const [dealers, setDealers] = useState([]);
    const [dealersLoading, setDealersLoading] = useState(true);
    const [dealersError, setDealersError] = useState("");

    /* ---------- form state ---------- */
    const [form, setForm] = useState({
        name: "",
        category_id: "",
        brand_id: "",
        description: "",
        min_order_qty: 1,
        low_stock_threshold: 10,
    });
    const [categoryQuery, setCategoryQuery] = useState("");
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

    const [variants, setVariants] = useState([
        { sku: "", barcode: "", mrp: "", stock_quantity: "", pack_size: "" },
    ]);
    const [attributes, setAttributes] = useState([{ name: "", value: "" }]);
    const [labels, setLabels] = useState([]);
    const [images, setImages] = useState([]);
    const [groupPrices, setGroupPrices] = useState({});
    const [notificationMode, setNotificationMode] = useState("all");
    const [selectedDealerIds, setSelectedDealerIds] = useState([]);
    const [dealerQuery, setDealerQuery] = useState("");

    /* ---------- status ---------- */
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    /* ---------- load reference data ---------- */
    useEffect(() => {
        api.get("/admin/categories").then(({ data }) =>
            setCategories(data.data),
        );
        api.get("/admin/brands").then(({ data }) => setBrands(data.data));
        api.get("/admin/groups").then(({ data }) => setGroups(data.data));

        const loadDealers = async () => {
            setDealersLoading(true);
            setDealersError("");
            try {
                const allDealers = [];
                let page = 1;
                let lastPage = 1;
                do {
                    const { data } = await api.get("/admin/sellers", {
                        params: { is_active: true, per_page: 100, page },
                    });
                    allDealers.push(...(data.data || []));
                    lastPage = data.last_page || 1;
                    page += 1;
                } while (page <= lastPage);
                setDealers(allDealers);
            } catch (err) {
                console.error("Failed to load dealers:", err);
                setDealersError("Could not load dealers. Please try again.");
            } finally {
                setDealersLoading(false);
            }
        };
        loadDealers();
    }, []);

    /* ---------- derived ---------- */
    const filteredCategories = categories
        .filter((c) =>
            c.name.toLowerCase().includes(categoryQuery.toLowerCase()),
        )
        .sort((a, b) => a.name.localeCompare(b.name));
    const filteredDealers = dealers.filter((dealer) =>
        `${dealer.name || ""} ${dealer.company_name || ""} ${dealer.phone || ""}`
            .toLowerCase()
            .includes(dealerQuery.trim().toLowerCase()),
    );

    const toggleDealer = (dealerId) =>
        setSelectedDealerIds((current) =>
            current.includes(dealerId)
                ? current.filter((id) => id !== dealerId)
                : [...current, dealerId],
        );

    const toggleFilteredDealers = () => {
        const filteredIds = filteredDealers.map((dealer) => dealer.id);
        const allSelected = filteredIds.every((id) =>
            selectedDealerIds.includes(id),
        );
        setSelectedDealerIds((current) =>
            allSelected
                ? current.filter((id) => !filteredIds.includes(id))
                : [...new Set([...current, ...filteredIds])],
        );
    };

    const validVariants = variants.filter((v) => v.sku);
    const hasImages = images.length > 0;
    const canNotify =
        notificationMode === "all" || selectedDealerIds.length > 0;
    const canSubmit =
        form.name.trim() &&
        form.category_id &&
        hasImages &&
        validVariants.length > 0 &&
        canNotify;

    /* ---------- variants ---------- */
    const addVariant = () =>
        setVariants([
            ...variants,
            {
                sku: "",
                barcode: "",
                mrp: "",
                stock_quantity: "",
                pack_size: "",
            },
        ]);

    const updateVariant = (i, key, val) =>
        setVariants(
            variants.map((v, idx) => (idx === i ? { ...v, [key]: val } : v)),
        );

    const removeVariant = (i) => {
        if (variants.length === 1) {
            setVariants([
                {
                    sku: "",
                    barcode: "",
                    mrp: "",
                    stock_quantity: "",
                    pack_size: "",
                },
            ]);
            return;
        }
        setVariants(variants.filter((_, idx) => idx !== i));
    };

    /* ---------- attributes ---------- */
    const addAttribute = () =>
        setAttributes([...attributes, { name: "", value: "" }]);

    const updateAttribute = (i, key, val) =>
        setAttributes(
            attributes.map((a, idx) => (idx === i ? { ...a, [key]: val } : a)),
        );

    const removeAttribute = (i) => {
        if (attributes.length === 1) {
            setAttributes([{ name: "", value: "" }]);
            return;
        }
        setAttributes(attributes.filter((_, idx) => idx !== i));
    };

    /* ---------- labels ---------- */
    const toggleLabel = (label) =>
        setLabels((l) =>
            l.includes(label) ? l.filter((x) => x !== label) : [...l, label],
        );

    /* ---------- description ---------- */
    const handleDescriptionChange = (value) =>
        setForm((prev) => ({ ...prev, description: value }));

    /* ---------- images ---------- */
    const handleImageSelect = (e, variantId = null) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const newImages = files.map((file, i) => ({
            file,
            preview: URL.createObjectURL(file),
            is_primary: images.length === 0 && i === 0,
            variant_id: variantId,
        }));
        setImages((prev) => [...prev, ...newImages]);
        e.target.value = "";
    };

    const removeImage = (i) => {
        setImages((prev) =>
            prev
                .filter((_, idx) => idx !== i)
                .map((img, idx) => ({
                    ...img,
                    // If we removed the primary, promote the new first
                    is_primary: idx === 0,
                })),
        );
    };

    const setPrimary = (i) =>
        setImages((prev) =>
            prev.map((img, idx) => ({ ...img, is_primary: idx === i })),
        );

    /* ---------- submit ---------- */
    const submit = async (e) => {
        e.preventDefault();
        setError("");

        if (!form.name.trim()) {
            setError("Product name is required.");
            return;
        }
        if (!form.category_id) {
            setError("Please select a category.");
            return;
        }
        if (images.length === 0) {
            setError("Please upload at least one product image.");
            return;
        }
        if (validVariants.length === 0) {
            setError("Please add at least one variant with an SKU.");
            return;
        }
        if (notificationMode === "selected" && selectedDealerIds.length === 0) {
            setError("Please select at least one dealer to notify.");
            return;
        }

        setSaving(true);
        try {
            const { data } = await api.post("/admin/products", {
                ...form,
                variants: validVariants,
                notification_mode: notificationMode,
                ...(notificationMode === "selected"
                    ? { notification_dealer_ids: selectedDealerIds }
                    : {}),
                attributes: attributes
                    .filter((a) => a.name)
                    .map((a) => ({ name: a.name, value: a.value })),
                labels,
            });

            const productId = data.data.id;
            const createdVariants = data.data.variants || [];

            /* upload images sequentially */
            for (const img of images) {
                const fd = new FormData();
                fd.append("file", img.file);
                fd.append("folder", "products");
                const uploadRes = await api.post("/uploads", fd, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                await api.post(`/admin/products/${productId}/images`, {
                    image_path: uploadRes.data.path,
                    is_primary: img.is_primary,
                    variant_id: img.variant_id || null,
                });
            }

            /* group prices */
            for (const g of groups) {
                validVariants.forEach((v, idx) => {
                    const key = `${g.id}_${idx}`;
                    const price = groupPrices[key];
                    if (price === undefined || price === "") return;

                    const matchedVariant = createdVariants.find(
                        (cv) => cv.sku === v.sku,
                    );

                    api.post("/admin/pricing/group-price", {
                        product_id: productId,
                        variant_id: matchedVariant?.id ?? null,
                        group_id: g.id,
                        price: Number(price),
                    }).catch(console.error);
                });
            }

            navigate("/admin/products");
        } catch (err) {
            setError(
                err.response?.data?.errors?.notification_dealer_ids?.[0] ||
                    err.response?.data?.message ||
                    "Could not create product. Check required fields.",
            );
        } finally {
            setSaving(false);
        }
    };

    /* ============================================================
       RENDER
       ============================================================ */
    return (
        <AdminLayout>
            <div className="admin-product-edit">
                {/* ===== Header ===== */}
                <header className="ape-head">
                    <div>
                        <p className="ape-head__eyebrow">
                            Catalog / Products / New
                        </p>
                        <h1 className="ape-head__title">Add Product</h1>
                        <p className="ape-head__sub">
                            Create a new product with variants, images, and
                            pricing tiers.
                        </p>
                    </div>
                    <div className="ape-head__actions">
                        <Link
                            to="/admin/products"
                            className="ape-btn ape-btn--ghost ape-btn--sm"
                        >
                            <Icon name="arrow" size={14} />
                            Back to Products
                        </Link>
                    </div>
                </header>

                {error && (
                    <div className="ape-alert ape-alert--error" role="alert">
                        <Icon name="alert" size={16} />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={submit} noValidate>
                    <div className="ape-layout">
                        {/* ===== Main column ===== */}
                        <div className="ape-main">
                            {/* --- Basic Details --- */}
                            <section className="ape-card">
                                <div className="ape-card__head">
                                    <div className="ape-card__title-group">
                                        <span className="ape-card__icon">
                                            <Icon name="box" size={18} />
                                        </span>
                                        <div>
                                            <h2 className="ape-card__title">
                                                Basic Details
                                            </h2>
                                            <p className="ape-card__sub">
                                                Name, category, brand and
                                                stocking rules.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="ape-grid">
                                    <div className="ape-field ape-field--full">
                                        <label className="ape-field__label">
                                            Product Name{" "}
                                            <span className="ape-field__req">
                                                *
                                            </span>
                                        </label>
                                        <input
                                            className="ape-input"
                                            value={form.name}
                                            placeholder="e.g. Cotton Bath Towel – 500 GSM"
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    name: e.target.value,
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="ape-field ape-combobox">
                                        <label className="ape-field__label">
                                            Category{" "}
                                            <span className="ape-field__req">
                                                *
                                            </span>
                                        </label>
                                        <input
                                            className="ape-input"
                                            value={categoryQuery}
                                            onChange={(e) => {
                                                setCategoryQuery(
                                                    e.target.value,
                                                );
                                                setForm({
                                                    ...form,
                                                    category_id: "",
                                                });
                                                setShowCategoryDropdown(true);
                                            }}
                                            onFocus={() =>
                                                setShowCategoryDropdown(true)
                                            }
                                            onBlur={() =>
                                                setTimeout(
                                                    () =>
                                                        setShowCategoryDropdown(
                                                            false,
                                                        ),
                                                    200,
                                                )
                                            }
                                            placeholder="Search category…"
                                        />
                                        {showCategoryDropdown &&
                                            filteredCategories.length > 0 && (
                                                <div className="ape-combobox__dropdown">
                                                    {filteredCategories.map(
                                                        (c) => (
                                                            <div
                                                                key={c.id}
                                                                className={`ape-combobox__option ${
                                                                    form.category_id ===
                                                                    c.id
                                                                        ? "ape-combobox__option--selected"
                                                                        : ""
                                                                }`}
                                                                onMouseDown={() => {
                                                                    setForm({
                                                                        ...form,
                                                                        category_id:
                                                                            c.id,
                                                                    });
                                                                    setCategoryQuery(
                                                                        c.name,
                                                                    );
                                                                    setShowCategoryDropdown(
                                                                        false,
                                                                    );
                                                                }}
                                                            >
                                                                {c.name}
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            )}
                                    </div>

                                    <div className="ape-field">
                                        <label className="ape-field__label">
                                            Brand
                                        </label>
                                        <select
                                            className="ape-select"
                                            value={form.brand_id}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    brand_id: e.target.value,
                                                })
                                            }
                                        >
                                            <option value="">No brand</option>
                                            {brands.map((b) => (
                                                <option key={b.id} value={b.id}>
                                                    {b.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="ape-field">
                                        <label className="ape-field__label">
                                            MOQ (Minimum Order)
                                        </label>
                                        <input
                                            className="ape-input ape-input--mono"
                                            type="number"
                                            min="1"
                                            value={form.min_order_qty}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    min_order_qty:
                                                        e.target.value,
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="ape-field">
                                        <label className="ape-field__label">
                                            Low Stock Threshold
                                        </label>
                                        <input
                                            className="ape-input ape-input--mono"
                                            type="number"
                                            min="0"
                                            value={form.low_stock_threshold}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    low_stock_threshold:
                                                        e.target.value,
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="ape-field ape-field--full">
                                        <label className="ape-field__label">
                                            Description
                                        </label>
                                        <div className="ape-rte">
                                            <RichTextEditor
                                                value={form.description || ""}
                                                onChange={
                                                    handleDescriptionChange
                                                }
                                                placeholder="Write product description…"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* --- Images --- */}
                            <section className="ape-card">
                                <div className="ape-card__head">
                                    <div className="ape-card__title-group">
                                        <span className="ape-card__icon">
                                            <Icon name="image" size={18} />
                                        </span>
                                        <div>
                                            <h2 className="ape-card__title">
                                                Product Images
                                            </h2>
                                            <p className="ape-card__sub">
                                                Upload one or more images. The
                                                first image is the primary.
                                            </p>
                                        </div>
                                    </div>
                                    <span
                                        className={`ape-card__badge ${
                                            hasImages
                                                ? "ape-card__badge--success"
                                                : "ape-card__badge--danger"
                                        }`}
                                    >
                                        {hasImages
                                            ? `${images.length} selected`
                                            : "Required"}
                                    </span>
                                </div>

                                {!hasImages && (
                                    <label className="ape-dropzone">
                                        <span className="ape-dropzone__icon">
                                            <Icon name="plus" size={22} />
                                        </span>
                                        <span className="ape-dropzone__title">
                                            Drop images here or click to upload
                                        </span>
                                        <span className="ape-dropzone__hint">
                                            JPG · PNG · WEBP · Max 5 MB each
                                        </span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleImageSelect}
                                        />
                                    </label>
                                )}

                                {hasImages && (
                                    <>
                                        <div className="ape-images">
                                            {images.map((img, i) => (
                                                <div
                                                    key={i}
                                                    className="ape-image-tile"
                                                >
                                                    <img
                                                        src={img.preview}
                                                        alt=""
                                                    />
                                                    {img.is_primary && (
                                                        <span className="ape-image-tile__primary">
                                                            Primary
                                                        </span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        className="ape-image-tile__remove"
                                                        onClick={() =>
                                                            removeImage(i)
                                                        }
                                                        aria-label="Remove image"
                                                        title="Remove image"
                                                    >
                                                        ✕
                                                    </button>
                                                    {!img.is_primary && (
                                                        <button
                                                            type="button"
                                                            className="ape-image-tile__primary-btn"
                                                            onClick={() =>
                                                                setPrimary(i)
                                                            }
                                                        >
                                                            Set Primary
                                                        </button>
                                                    )}
                                                </div>
                                            ))}

                                            {/* Add more tile */}
                                            <label className="ape-image-upload">
                                                <span className="ape-image-upload__icon">
                                                    +
                                                </span>
                                                <span>Add more</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    onChange={handleImageSelect}
                                                />
                                            </label>
                                        </div>
                                    </>
                                )}
                            </section>

                            {/* --- Variants --- */}
                            <section className="ape-card">
                                <div className="ape-card__head">
                                    <div className="ape-card__title-group">
                                        <span className="ape-card__icon">
                                            <Icon name="layers" size={18} />
                                        </span>
                                        <div>
                                            <h2 className="ape-card__title">
                                                Variants
                                            </h2>
                                            <p className="ape-card__sub">
                                                Add at least one variant with an
                                                SKU.
                                            </p>
                                        </div>
                                    </div>
                                    <span className="ape-card__badge">
                                        {validVariants.length} valid
                                    </span>
                                </div>

                                <div className="ape-variant-list">
                                    {variants.map((v, i) => (
                                        <div
                                            key={i}
                                            className="ape-variant-row"
                                            style={{
                                                animationDelay: `${i * 0.03}s`,
                                            }}
                                        >
                                            <div className="ape-variant-row__field">
                                                <label className="ape-variant-row__label">
                                                    SKU *
                                                </label>
                                                <input
                                                    className="ape-variant-row__input ape-variant-row__input--mono"
                                                    placeholder="SKU"
                                                    value={v.sku}
                                                    onChange={(e) =>
                                                        updateVariant(
                                                            i,
                                                            "sku",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="ape-variant-row__field">
                                                <label className="ape-variant-row__label">
                                                    Barcode
                                                </label>
                                                <input
                                                    className="ape-variant-row__input ape-variant-row__input--mono"
                                                    placeholder="Barcode"
                                                    value={v.barcode}
                                                    onChange={(e) =>
                                                        updateVariant(
                                                            i,
                                                            "barcode",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="ape-variant-row__field">
                                                <label className="ape-variant-row__label">
                                                    MRP ₹
                                                </label>
                                                <input
                                                    className="ape-variant-row__input ape-variant-row__input--mono"
                                                    type="number"
                                                    placeholder="0"
                                                    value={v.mrp}
                                                    onChange={(e) =>
                                                        updateVariant(
                                                            i,
                                                            "mrp",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="ape-variant-row__field">
                                                <label className="ape-variant-row__label">
                                                    Stock
                                                </label>
                                                <input
                                                    className="ape-variant-row__input ape-variant-row__input--mono"
                                                    type="number"
                                                    placeholder="0"
                                                    value={v.stock_quantity}
                                                    onChange={(e) =>
                                                        updateVariant(
                                                            i,
                                                            "stock_quantity",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="ape-variant-row__field">
                                                <label className="ape-variant-row__label">
                                                    Pack Size
                                                </label>
                                                <input
                                                    className="ape-variant-row__input"
                                                    placeholder="e.g. 12 pcs"
                                                    value={v.pack_size}
                                                    onChange={(e) =>
                                                        updateVariant(
                                                            i,
                                                            "pack_size",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                className="ape-variant-row__remove"
                                                onClick={() => removeVariant(i)}
                                                aria-label="Remove variant"
                                                title="Remove variant"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ marginTop: 12 }}>
                                    <button
                                        type="button"
                                        className="ape-btn ape-btn--outline ape-btn--sm"
                                        onClick={addVariant}
                                    >
                                        <Icon name="plus" size={14} />
                                        Add Variant
                                    </button>
                                </div>
                            </section>

                            {/* --- Attributes --- */}
                            <section className="ape-card">
                                <div className="ape-card__head">
                                    <div className="ape-card__title-group">
                                        <span className="ape-card__icon">
                                            <Icon name="tag" size={18} />
                                        </span>
                                        <div>
                                            <h2 className="ape-card__title">
                                                Attributes
                                            </h2>
                                            <p className="ape-card__sub">
                                                Color, size, material, and other
                                                specifications.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="ape-attr-list">
                                    {attributes.map((a, i) => (
                                        <div key={i} className="ape-attr-row">
                                            <input
                                                className="ape-attr-row__input"
                                                placeholder="Attribute name (e.g. Color)"
                                                value={a.name}
                                                onChange={(e) =>
                                                    updateAttribute(
                                                        i,
                                                        "name",
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            <input
                                                className="ape-attr-row__input"
                                                placeholder="Value (e.g. Red)"
                                                value={a.value}
                                                onChange={(e) =>
                                                    updateAttribute(
                                                        i,
                                                        "value",
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            <button
                                                type="button"
                                                className="ape-variant-row__remove ape-attr-row__remove"
                                                onClick={() =>
                                                    removeAttribute(i)
                                                }
                                                aria-label="Remove attribute"
                                                title="Remove attribute"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ marginTop: 12 }}>
                                    <button
                                        type="button"
                                        className="ape-btn ape-btn--outline ape-btn--sm"
                                        onClick={addAttribute}
                                    >
                                        <Icon name="plus" size={14} />
                                        Add Attribute
                                    </button>
                                </div>
                            </section>

                            {/* --- Group Prices --- */}
                            <section className="ape-card">
                                <div className="ape-card__head">
                                    <div className="ape-card__title-group">
                                        <span className="ape-card__icon">
                                            <Icon name="tag" size={18} />
                                        </span>
                                        <div>
                                            <h2 className="ape-card__title">
                                                Group Prices
                                            </h2>
                                            <p className="ape-card__sub">
                                                Optional. Set pricing per dealer
                                                group and variant.
                                            </p>
                                        </div>
                                    </div>
                                    <span className="ape-card__badge">
                                        {groups.length} group
                                        {groups.length !== 1 ? "s" : ""}
                                    </span>
                                </div>

                                {groups.length === 0 ? (
                                    <p className="ape-card__sub">
                                        No groups found. Create groups first to
                                        set tier pricing.
                                    </p>
                                ) : validVariants.length === 0 ? (
                                    <p className="ape-card__sub">
                                        Add at least one variant with an SKU to
                                        set group prices.
                                    </p>
                                ) : (
                                    <div className="ape-gp-table-wrap">
                                        <table className="ape-gp-table">
                                            <thead>
                                                <tr>
                                                    <th>Group</th>
                                                    {validVariants.map(
                                                        (v, idx) => (
                                                            <th
                                                                key={`new-${idx}`}
                                                            >
                                                                {v.sku}
                                                            </th>
                                                        ),
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {groups.map((g) => (
                                                    <tr key={g.id}>
                                                        <td>{g.name}</td>
                                                        {validVariants.map(
                                                            (v, idx) => {
                                                                const key = `${g.id}_${idx}`;
                                                                return (
                                                                    <td
                                                                        key={
                                                                            key
                                                                        }
                                                                    >
                                                                        <input
                                                                            className="ape-gp-input"
                                                                            type="number"
                                                                            min="0"
                                                                            step="0.01"
                                                                            placeholder="₹"
                                                                            value={
                                                                                groupPrices[
                                                                                    key
                                                                                ] ??
                                                                                ""
                                                                            }
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                setGroupPrices(
                                                                                    {
                                                                                        ...groupPrices,
                                                                                        [key]: e
                                                                                            .target
                                                                                            .value,
                                                                                    },
                                                                                )
                                                                            }
                                                                        />
                                                                    </td>
                                                                );
                                                            },
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </section>

                            {/* --- Labels --- */}
                            <section className="ape-card">
                                <div className="ape-card__head">
                                    <div className="ape-card__title-group">
                                        <span className="ape-card__icon">
                                            <Icon name="bell" size={18} />
                                        </span>
                                        <div>
                                            <h2 className="ape-card__title">
                                                Send Notification
                                            </h2>
                                            <p className="ape-card__sub">
                                                Choose which active dealers
                                                receive an alert when this
                                                product is created.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="ape-notify-options">
                                    <label className="ape-notify-option">
                                        <input
                                            type="radio"
                                            name="notification-mode"
                                            value="all"
                                            checked={notificationMode === "all"}
                                            onChange={() => setNotificationMode("all")}
                                        />
                                        <span>
                                            <strong>All active dealers</strong>
                                            <small>
                                                Send the new product notification
                                                to every active dealer.
                                            </small>
                                        </span>
                                    </label>
                                    <label className="ape-notify-option">
                                        <input
                                            type="radio"
                                            name="notification-mode"
                                            value="selected"
                                            checked={notificationMode === "selected"}
                                            onChange={() => setNotificationMode("selected")}
                                        />
                                        <span>
                                            <strong>Choose specific dealers</strong>
                                            <small>
                                                Only selected dealers will be
                                                notified.
                                            </small>
                                        </span>
                                    </label>
                                </div>

                                {notificationMode === "selected" && (
                                    <div className="ape-dealer-picker">
                                        <div className="ape-dealer-picker__toolbar">
                                            <input
                                                className="ape-input"
                                                type="search"
                                                value={dealerQuery}
                                                onChange={(e) => setDealerQuery(e.target.value)}
                                                placeholder="Search by dealer, company, or phone"
                                                aria-label="Search dealers"
                                            />
                                            <button
                                                type="button"
                                                className="ape-btn ape-btn--outline ape-btn--sm"
                                                onClick={toggleFilteredDealers}
                                                disabled={dealersLoading || filteredDealers.length === 0}
                                            >
                                                {filteredDealers.length > 0 &&
                                                filteredDealers.every((dealer) =>
                                                    selectedDealerIds.includes(dealer.id),
                                                )
                                                    ? "Clear visible"
                                                    : "Select visible"}
                                            </button>
                                        </div>
                                        <p className="ape-card__sub">
                                            {selectedDealerIds.length} dealer
                                            {selectedDealerIds.length === 1 ? "" : "s"} selected
                                        </p>
                                        {dealersLoading ? (
                                            <p className="ape-card__sub" role="status">
                                                Loading active dealers…
                                            </p>
                                        ) : dealersError ? (
                                            <p className="ape-notify-error" role="alert">
                                                {dealersError}
                                            </p>
                                        ) : filteredDealers.length === 0 ? (
                                            <p className="ape-card__sub">
                                                No matching active dealers found.
                                            </p>
                                        ) : (
                                            <div className="ape-dealer-picker__list">
                                                {filteredDealers.map((dealer) => (
                                                    <label
                                                        key={dealer.id}
                                                        className="ape-dealer-option"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedDealerIds.includes(dealer.id)}
                                                            onChange={() => toggleDealer(dealer.id)}
                                                        />
                                                        <span>
                                                            <strong>{dealer.name}</strong>
                                                            <small>
                                                                {[dealer.company_name, dealer.phone]
                                                                    .filter(Boolean)
                                                                    .join(" · ") || dealer.email}
                                                            </small>
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                        {notificationMode === "selected" &&
                                            selectedDealerIds.length === 0 &&
                                            !dealersLoading && (
                                                <p className="ape-notify-error" role="alert">
                                                    Select at least one dealer to notify.
                                                </p>
                                            )}
                                    </div>
                                )}
                            </section>

                            {/* --- Labels --- */}
                            <section className="ape-card">
                                <div className="ape-card__head">
                                    <div className="ape-card__title-group">
                                        <span className="ape-card__icon">
                                            <Icon name="star" size={18} />
                                        </span>
                                        <div>
                                            <h2 className="ape-card__title">
                                                Labels
                                            </h2>
                                            <p className="ape-card__sub">
                                                Highlight this product on the
                                                storefront.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="ape-labels">
                                    {LABEL_OPTIONS.map((label) => (
                                        <label
                                            key={label}
                                            className="ape-label-chip"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={labels.includes(label)}
                                                onChange={() =>
                                                    toggleLabel(label)
                                                }
                                            />
                                            <span className="ape-label-chip__dot" />
                                            <span>{label}</span>
                                        </label>
                                    ))}
                                </div>

                                {labels.length > 0 && (
                                    <div className="ape-label-preview-wrap">
                                        <span className="ape-note__caption">
                                            Preview:
                                        </span>
                                        {labels.map((l) => (
                                            <span
                                                key={l}
                                                className="ape-label-preview"
                                            >
                                                {l}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* ===== Sidebar ===== */}
                        <aside className="ape-aside">
                            <div className="ape-summary">
                                <h3 className="ape-summary__title">
                                    Product Summary
                                </h3>
                                <div className="ape-summary__row">
                                    <span>Name</span>
                                    <strong>{form.name || "—"}</strong>
                                </div>
                                <div className="ape-summary__row">
                                    <span>Category</span>
                                    <strong>{categoryQuery || "—"}</strong>
                                </div>
                                <div className="ape-summary__row">
                                    <span>Brand</span>
                                    <strong>
                                        {brands.find(
                                            (b) =>
                                                String(b.id) ===
                                                String(form.brand_id),
                                        )?.name || "—"}
                                    </strong>
                                </div>
                                <div className="ape-summary__row">
                                    <span>Images</span>
                                    <strong>{images.length}</strong>
                                </div>
                                <div className="ape-summary__row">
                                    <span>Variants</span>
                                    <strong>{validVariants.length}</strong>
                                </div>
                                <div className="ape-summary__row">
                                    <span>MOQ</span>
                                    <strong>{form.min_order_qty || 1}</strong>
                                </div>
                                <div className="ape-summary__row">
                                    <span>Labels</span>
                                    <strong>
                                        {labels.length > 0
                                            ? labels.length
                                            : "—"}
                                    </strong>
                                </div>
                            </div>

                            <div className="ape-summary">
                                <h3 className="ape-summary__title">
                                    Quick Actions
                                </h3>
                                <button
                                    type="button"
                                    className="ape-btn ape-btn--outline ape-btn--sm ape-btn--block"
                                    onClick={() => navigate("/admin/products")}
                                >
                                    View all products
                                </button>
                                <div style={{ height: 8 }} />
                                <button
                                    type="button"
                                    className="ape-btn ape-btn--outline ape-btn--sm ape-btn--block"
                                    onClick={() =>
                                        navigate("/admin/bulk-upload")
                                    }
                                >
                                    Bulk upload CSV
                                </button>
                            </div>
                        </aside>
                    </div>

                    {/* ===== Sticky save bar ===== */}
                    <div className="ape-savebar">
                        <div className="ape-savebar__status">
                            {canSubmit ? (
                                <>
                                    <span
                                        style={{
                                            width: 6,
                                            height: 6,
                                            borderRadius: "50%",
                                            background: "#2d8a4e",
                                            display: "inline-block",
                                        }}
                                    />
                                    <span>
                                        Ready to publish ·{" "}
                                        <strong>{validVariants.length}</strong>{" "}
                                        variant
                                        {validVariants.length !== 1
                                            ? "s"
                                            : ""}{" "}
                                        · <strong>{images.length}</strong> image
                                        {images.length !== 1 ? "s" : ""}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Icon name="alert" size={13} />
                                    <span>
                                        Name, category, image & variant required
                                    </span>
                                </>
                            )}
                        </div>
                        <div className="ape-savebar__actions">
                            <button
                                type="button"
                                className="ape-btn ape-btn--ghost ape-btn--sm"
                                onClick={() => navigate("/admin/products")}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="ape-btn ape-btn--primary ape-btn--sm"
                                disabled={saving || !canSubmit}
                                title={
                                    !canSubmit
                                        ? "Fill in all required fields"
                                        : "Create product"
                                }
                            >
                                {saving ? "Saving…" : "Create Product"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
