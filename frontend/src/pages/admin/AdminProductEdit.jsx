import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import api from "../../api/client";
import RichTextEditor from "../../components/RichTextEditor.jsx";
import Icon from "../../components/ui/Icon";
import "../../styles/admin-common.css";
import "../../styles/admin-product-edit.css";

export default function AdminProductEdit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("success");
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [variants, setVariants] = useState([]);
    const [attributes, setAttributes] = useState([{ name: "", value: "" }]);
    const [categoryQuery, setCategoryQuery] = useState("");
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [groups, setGroups] = useState([]);
    const [groupPrices, setGroupPrices] = useState({});
    const [selectedLabel, setSelectedLabel] = useState("");
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

    const showMessage = (text, type = "success") => {
        setMessage(text);
        setMessageType(type);
        setTimeout(() => setMessage(""), 4000);
    };

    const load = () =>
        api.get(`/admin/products/${id}`).then(({ data }) => {
            const p = data.data;

            if (p.images) {
                p.images = p.images.map((img, index) => {
                    let src = img.image_path || img.url || "";
                    if (
                        src &&
                        !src.startsWith("http") &&
                        !src.startsWith("blob:")
                    ) {
                        const clean = src
                            .replace(/^\/+/, "")
                            .replace(/^storage\//, "");
                        src = `${API_URL}/storage/${clean}`;
                    }
                    return {
                        ...img,
                        id: img.id || `img-${index}`,
                        image_path: src,
                    };
                });
            }

            setProduct(p);
            setSelectedLabel(
                p.labels && p.labels.length > 0 ? p.labels[0] : "",
            );

            setVariants(
                (p.variants || []).map((v) => ({
                    id: v.id,
                    sku: v.sku || "",
                    barcode: v.barcode || "",
                    mrp: v.mrp || 0,
                    stock_quantity: v.available_stock || v.stock_quantity || 0,
                    pack_size: v.pack_size || "",
                })),
            );

            const attrs = [];
            if (p.attributes) {
                Object.entries(p.attributes).forEach(([name, values]) => {
                    (Array.isArray(values) ? values : [values]).forEach(
                        (val) => {
                            attrs.push({ name, value: val });
                        },
                    );
                });
            }
            setAttributes(attrs.length ? attrs : [{ name: "", value: "" }]);

            const existing = p.group_prices || p.groupPrices || [];
            const map = {};
            existing.forEach((gp) => {
                const gid = gp.group_id ?? gp.groupId ?? gp.group?.id;
                const vid = gp.variant_id ?? gp.variantId ?? null;
                if (gid == null) return;
                const key =
                    vid != null
                        ? `${String(gid)}_${String(vid)}`
                        : `${String(gid)}_null`;
                map[key] = gp.price;
            });
            setGroupPrices(map);
        });

    useEffect(() => {
        load();
        api.get("/admin/categories").then(({ data }) =>
            setCategories(data.data),
        );
        api.get("/admin/brands").then(({ data }) => setBrands(data.data));
        api.get("/admin/groups").then(({ data }) => setGroups(data.data));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        if (product?.category_id && categories.length) {
            const cat = categories.find((c) => c.id == product.category_id);
            if (cat) setCategoryQuery(cat.name);
        }
    }, [product?.category_id, categories]);

    const filteredCategories = categories
        .filter((c) =>
            c.name.toLowerCase().includes(categoryQuery.toLowerCase()),
        )
        .sort((a, b) => a.name.localeCompare(b.name));

    const addVariant = () =>
        setVariants([
            ...variants,
            {
                id: null,
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

    const removeVariant = async (i) => {
        const variant = variants[i];
        if (variant.id) {
            if (
                !window.confirm(
                    `Delete variant "${variant.sku}"? This cannot be undone.`,
                )
            )
                return;
            try {
                await api.delete(
                    `/admin/products/${id}/variants/${variant.id}`,
                );
                load();
                return;
            } catch (err) {
                alert(
                    "Could not delete variant: " +
                        (err.response?.data?.message || ""),
                );
                return;
            }
        }
        setVariants(variants.filter((_, idx) => idx !== i));
    };

    const addAttribute = () =>
        setAttributes([...attributes, { name: "", value: "" }]);

    const updateAttribute = (i, key, val) =>
        setAttributes(
            attributes.map((a, idx) => (idx === i ? { ...a, [key]: val } : a)),
        );

    const removeAttribute = (i) =>
        setAttributes(attributes.filter((_, idx) => idx !== i));

    const handleLabelSelect = (label) => {
        setSelectedLabel((prev) => (prev === label ? "" : label));
    };

    const handleDescriptionChange = (value) => {
        setProduct((prev) => ({ ...prev, description: value }));
    };

    const saveBasics = async (e) => {
        e.preventDefault();
        if (!product.images || product.images.length === 0) {
            showMessage("Please upload at least one product image.", "error");
            return;
        }

        try {
            const variantsToSend = variants
                .filter((v) => v.sku)
                .map((v) => ({
                    id: v.id || null,
                    sku: v.sku,
                    barcode: v.barcode || null,
                    mrp: parseFloat(v.mrp) || 0,
                    stock_quantity: parseInt(v.stock_quantity, 10) || 0,
                    pack_size: v.pack_size || null,
                }));

            const groupPricesToSend = [];
            groups.forEach((g) => {
                variants
                    .filter((v) => v.sku)
                    .forEach((v, idx) => {
                        const key = v.id
                            ? `${String(g.id)}_${String(v.id)}`
                            : `${String(g.id)}_new-${idx}`;
                        const price = groupPrices[key];
                        if (
                            price === "" ||
                            price === undefined ||
                            price === null
                        )
                            return;
                        groupPricesToSend.push({
                            group_id: g.id,
                            variant_id: v.id || null,
                            price: Number(price),
                        });
                    });
            });

            if (
                groupPricesToSend.length === 0 &&
                Object.keys(groupPrices).length > 0
            ) {
                showMessage(
                    "Group prices could not be prepared. Please try again.",
                    "error",
                );
                return;
            }

            await api.put(`/admin/products/${id}`, {
                name: product.name,
                category_id: product.category_id,
                brand_id: product.brand_id || null,
                description: product.description,
                is_active: product.is_active,
                is_new_arrival: selectedLabel === "New",
                labels: selectedLabel ? [selectedLabel] : [],
                variants: variantsToSend,
                attributes: attributes
                    .filter((a) => a.name && a.value)
                    .map((a) => ({ name: a.name, value: a.value })),
                min_order_qty: product.moq || product.min_order_qty || 1,
                low_stock_threshold: product.low_stock_threshold || 10,
                group_prices: groupPricesToSend,
            });

            showMessage("Product updated successfully!", "success");
            setTimeout(() => navigate("/admin/products"), 900);
        } catch (err) {
            showMessage(
                err.response?.data?.message || "Could not save.",
                "error",
            );
        }
    };

    const uploadImage = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("folder", "products");
            const { data: uploadRes } = await api.post("/uploads", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            await api.post(`/admin/products/${id}/images`, {
                image_path: uploadRes.path,
                is_primary: product.images?.length === 0,
            });
            load();
        } catch (err) {
            alert(err.response?.data?.message || "Upload failed.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const removeImage = async (imageId) => {
        if (!window.confirm("Remove this image?")) return;
        try {
            await api.delete(`/admin/products/${id}/images/${imageId}`);
            load();
        } catch (err) {
            alert(err.response?.data?.message || "Could not remove image.");
        }
    };

    if (!product) {
        return (
            <AdminLayout>
                <div className="admin-product-edit">
                    <div className="ape-loading">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="ape-skeleton" />
                        ))}
                    </div>
                </div>
            </AdminLayout>
        );
    }

    const hasImages = product.images && product.images.length > 0;
    const validVariantsCount = variants.filter((v) => v.sku).length;

    const LABELS = [
        "New",
        "Hot",
        "Trending",
        "Limited Stock",
        "Offer",
        "Best Seller",
    ];

    return (
        <AdminLayout>
            <div className="admin-product-edit">
                {/* ===== Header ===== */}
                <header className="ape-head">
                    <div>
                        <p className="ape-head__eyebrow">
                            Catalog / Products / Edit
                        </p>
                        <h1 className="ape-head__title">{product.name}</h1>
                        <p className="ape-head__sub">
                            Update product details, variants, images, and
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

                {message && (
                    <div
                        className={`ape-alert ape-alert--${
                            messageType === "success" ? "success" : "error"
                        }`}
                        role="alert"
                    >
                        <Icon
                            name={messageType === "success" ? "check" : "alert"}
                            size={16}
                        />
                        <span>{message}</span>
                    </div>
                )}

                <form onSubmit={saveBasics} noValidate>
                    <div className="ape-layout">
                        {/* ===== Main column ===== */}
                        <div className="ape-main">
                            {/* --- Basic details --- */}
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
                                                Name, category, brand, and
                                                status.
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
                                            value={product.name}
                                            onChange={(e) =>
                                                setProduct({
                                                    ...product,
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
                                                setProduct({
                                                    ...product,
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
                                                                    product.category_id ===
                                                                    c.id
                                                                        ? "ape-combobox__option--selected"
                                                                        : ""
                                                                }`}
                                                                onMouseDown={() => {
                                                                    setProduct({
                                                                        ...product,
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
                                            value={product.brand_id || ""}
                                            onChange={(e) =>
                                                setProduct({
                                                    ...product,
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
                                            value={
                                                product.moq ??
                                                product.min_order_qty ??
                                                1
                                            }
                                            onChange={(e) =>
                                                setProduct({
                                                    ...product,
                                                    moq:
                                                        parseInt(
                                                            e.target.value,
                                                            10,
                                                        ) || 1,
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
                                            value={
                                                product.low_stock_threshold ||
                                                10
                                            }
                                            onChange={(e) =>
                                                setProduct({
                                                    ...product,
                                                    low_stock_threshold:
                                                        parseInt(
                                                            e.target.value,
                                                            10,
                                                        ) || 0,
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="ape-field">
                                        <label className="ape-field__label">
                                            Status
                                        </label>
                                        <select
                                            className="ape-select"
                                            value={
                                                product.is_active
                                                    ? "active"
                                                    : "inactive"
                                            }
                                            onChange={(e) =>
                                                setProduct({
                                                    ...product,
                                                    is_active:
                                                        e.target.value ===
                                                        "active",
                                                })
                                            }
                                        >
                                            <option value="active">
                                                Active
                                            </option>
                                            <option value="inactive">
                                                Inactive
                                            </option>
                                        </select>
                                    </div>

                                    <div className="ape-field ape-field--full">
                                        <label className="ape-field__label">
                                            Description
                                        </label>
                                        <RichTextEditor
                                            value={product.description || ""}
                                            onChange={handleDescriptionChange}
                                            placeholder="Write product description…"
                                        />
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
                                                At least one image is required.
                                                First image is the primary.
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
                                            ? `${product.images.length} uploaded`
                                            : "Required"}
                                    </span>
                                </div>

                                {!hasImages && (
                                    <div className="ape-inline-warning">
                                        <Icon name="alert" size={15} />
                                        <span>
                                            Upload at least one image before
                                            saving.
                                        </span>
                                    </div>
                                )}

                                <div className="ape-images">
                                    {product.images?.map((img, idx) => (
                                        <div
                                            key={img.id}
                                            className="ape-image-tile"
                                        >
                                            <img
                                                src={img.image_path}
                                                alt=""
                                                onError={(e) => {
                                                    e.currentTarget.src =
                                                        "https://via.placeholder.com/200?text=No+Image";
                                                }}
                                            />
                                            {idx === 0 && (
                                                <span className="ape-image-tile__primary">
                                                    Primary
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                className="ape-image-tile__remove"
                                                onClick={() =>
                                                    removeImage(img.id)
                                                }
                                                aria-label="Remove image"
                                                title="Remove image"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}

                                    <label
                                        className={`ape-image-upload ${
                                            uploading
                                                ? "ape-image-upload--loading"
                                                : ""
                                        }`}
                                    >
                                        <span className="ape-image-upload__icon">
                                            {uploading ? "…" : "+"}
                                        </span>
                                        <span>
                                            {uploading
                                                ? "Uploading…"
                                                : "Upload image"}
                                        </span>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            accept="image/*"
                                            onChange={uploadImage}
                                            disabled={uploading}
                                        />
                                    </label>
                                </div>
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
                                                SKU, MRP, stock and pack size
                                                for each variant.
                                            </p>
                                        </div>
                                    </div>
                                    <span className="ape-card__badge">
                                        {validVariantsCount} valid
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
                                                Set special pricing per dealer
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
                                ) : validVariantsCount === 0 ? (
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
                                                    {variants
                                                        .filter((v) => v.sku)
                                                        .map((v, idx) => (
                                                            <th
                                                                key={
                                                                    v.id ||
                                                                    `new-${idx}`
                                                                }
                                                            >
                                                                {v.sku}
                                                            </th>
                                                        ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {groups.map((g) => (
                                                    <tr key={g.id}>
                                                        <td>{g.name}</td>
                                                        {variants
                                                            .filter(
                                                                (v) => v.sku,
                                                            )
                                                            .map((v, idx) => {
                                                                const key = v.id
                                                                    ? `${String(g.id)}_${String(v.id)}`
                                                                    : `${String(g.id)}_new-${idx}`;
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
                                                            })}
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
                                    {LABELS.map((label) => (
                                        <label
                                            key={label}
                                            className="ape-label-chip"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={
                                                    selectedLabel === label
                                                }
                                                onChange={() =>
                                                    handleLabelSelect(label)
                                                }
                                            />
                                            <span className="ape-label-chip__dot" />
                                            <span>{label}</span>
                                        </label>
                                    ))}
                                </div>
                            </section>
                        </div>

                        {/* ===== Sidebar ===== */}
                        <aside className="ape-aside">
                            <div className="ape-summary">
                                <h3 className="ape-summary__title">
                                    Product Summary
                                </h3>
                                <div className="ape-summary__row">
                                    <span>Status</span>
                                    <span
                                        className={`ape-summary__status ape-summary__status--${
                                            product.is_active
                                                ? "active"
                                                : "inactive"
                                        }`}
                                    >
                                        {product.is_active
                                            ? "Active"
                                            : "Inactive"}
                                    </span>
                                </div>
                                <div className="ape-summary__row">
                                    <span>Category</span>
                                    <strong>{categoryQuery || "—"}</strong>
                                </div>
                                <div className="ape-summary__row">
                                    <span>Brand</span>
                                    <strong>
                                        {brands.find(
                                            (b) => b.id === product.brand_id,
                                        )?.name || "—"}
                                    </strong>
                                </div>
                                <div className="ape-summary__row">
                                    <span>Images</span>
                                    <strong>
                                        {product.images?.length || 0}
                                    </strong>
                                </div>
                                <div className="ape-summary__row">
                                    <span>Variants</span>
                                    <strong>{validVariantsCount}</strong>
                                </div>
                                <div className="ape-summary__row">
                                    <span>MOQ</span>
                                    <strong>
                                        {product.moq ??
                                            product.min_order_qty ??
                                            1}
                                    </strong>
                                </div>
                                <div className="ape-summary__row">
                                    <span>Label</span>
                                    <strong>{selectedLabel || "—"}</strong>
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
                                        navigate(
                                            `/admin/products/${id}/pricing`,
                                        )
                                    }
                                >
                                    Manage pricing
                                </button>
                            </div>
                        </aside>
                    </div>

                    {/* ===== Sticky save bar ===== */}
                    <div className="ape-savebar">
                        <div className="ape-savebar__status">
                            {hasImages ? (
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
                                        <strong>{validVariantsCount}</strong>{" "}
                                        variant
                                        {validVariantsCount !== 1
                                            ? "s"
                                            : ""} ·{" "}
                                        <strong>
                                            {product.images?.length || 0}
                                        </strong>{" "}
                                        image
                                        {(product.images?.length || 0) !== 1
                                            ? "s"
                                            : ""}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Icon name="alert" size={13} />
                                    <span>Image required before saving</span>
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
                                disabled={!hasImages}
                                title={
                                    !hasImages
                                        ? "Please upload at least one image first"
                                        : "Save changes"
                                }
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
