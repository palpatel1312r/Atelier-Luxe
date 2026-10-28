import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../api/client";
import { useWishlistCount } from "../hooks/useWishlistCount";
import { useCartCount } from "../hooks/useCartCount";
import "../styles/product-detail.css";
import Icon from "../components/ui/Icon";
import Skeleton from "../components/ui/Skeleton";
import WishlistButton from "../components/WishlistButton";
import ProductGallery from "../components/ProductGallery";
import TierPricing from "../components/ui/TierPricing";
import ProductCard from "../components/ProductCard";

// ===== CACHE HELPERS =====
const CACHE_KEYS = {
    PRODUCT: "product_detail_",
    PRICE: "product_price_",
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
            JSON.stringify({ data, timestamp: Date.now() }),
        );
    } catch {
        // Ignore storage errors
    }
};

const getPriceCacheKey = (productId, variantId, quantity) => {
    return `${CACHE_KEYS.PRICE}${productId}_${variantId || "none"}_${quantity}`;
};

const getGalleryImages = (product, variant) => {
    const productImages = Array.isArray(product?.images) ? product.images : [];

    if (!variant) return productImages;

    const variantImages = Array.isArray(variant.images)
        ? variant.images.filter((image) => image?.image_path)
        : [];

    if (variantImages.length > 0) return variantImages;

    // Cached responses from older API versions may only contain one image URL.
    if (variant.image_url) {
        return [
            {
                image_path: variant.image_url,
                variant_id: variant.id,
                is_primary: true,
            },
        ];
    }

    const taggedImages = productImages.filter(
        (image) =>
            image?.variant_id != null &&
            String(image.variant_id) === String(variant.id),
    );
    if (taggedImages.length > 0) return taggedImages;

    const sharedImages = productImages.filter(
        (image) => image?.variant_id == null,
    );

    return sharedImages.length > 0 ? sharedImages : productImages;
};

export default function ProductDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [variant, setVariant] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [livePrice, setLivePrice] = useState(null);
    const [message, setMessage] = useState("");
    const [adding, setAdding] = useState(false);
    const [recentlyAdded, setRecentlyAdded] = useState(false);
    const [similar, setSimilar] = useState([]);
    const [similarLoading, setSimilarLoading] = useState(false);

    const { refresh: refreshCartCount } = useCartCount();
    // refreshWishlistCount is available if you need it later
    useWishlistCount();

    useEffect(() => {
        if (!recentlyAdded) return;
        const timeout = setTimeout(() => setRecentlyAdded(false), 1800);
        return () => clearTimeout(timeout);
    }, [recentlyAdded]);

    // ---------- Similar / suggested products ----------
    useEffect(() => {
        if (!product?.id) return;
        let cancelled = false;
        setSimilarLoading(true);
        const params = { per_page: 20 };
        if (product.category_id) params.category_id = product.category_id;
        else if (product.brand_id) params.brand_id = product.brand_id;

        const getProducts = async (query) => {
            const response = await api.get("/products", { params: query });
            const list =
                response.data?.data ||
                response.data?.products ||
                response.data ||
                [];
            return Array.isArray(list) ? list : [];
        };

        async function loadSuggestions() {
            try {
                const related = (await getProducts(params)).filter(
                    (item) => String(item.id) !== String(product.id),
                );
                const suggestions = [...related];

                if (suggestions.length < 6) {
                    try {
                        const catalog = await getProducts({
                            per_page: 20,
                            sort: "newest",
                        });
                        const existingIds = new Set(
                            suggestions.map((item) => String(item.id)),
                        );
                        for (const item of catalog) {
                            const itemId = String(item.id);
                            if (
                                itemId !== String(product.id) &&
                                !existingIds.has(itemId)
                            ) {
                                suggestions.push(item);
                                existingIds.add(itemId);
                                if (suggestions.length === 6) break;
                            }
                        }
                    } catch (error) {
                        if (!cancelled) {
                            console.error(
                                "Error loading additional product suggestions:",
                                error,
                            );
                        }
                    }
                }

                if (!cancelled) setSimilar(suggestions.slice(0, 6));
            } catch (error) {
                if (!cancelled) {
                    console.error("Error loading similar products:", error);
                    setSimilar([]);
                }
            } finally {
                if (!cancelled) setSimilarLoading(false);
            }
        }

        loadSuggestions();
        return () => {
            cancelled = true;
        };
    }, [product?.id, product?.category_id, product?.brand_id]);

    // ---------- Load product with cache ----------
    useEffect(() => {
        let cancelled = false;

        const cached = getCachedData(CACHE_KEYS.PRODUCT + id);
        if (cached) {
            setProduct(cached);
            setQuantity(cached.moq || 1);
            setVariant(cached.variants?.[0] ?? null);
        }

        fetchProduct();

        async function fetchProduct() {
            try {
                const { data } = await api.get(`/products/${id}`);
                if (cancelled) return;

                const prod = data.data;
                setProduct(prod);
                setQuantity(prod.moq || 1);
                setVariant(prod.variants?.[0] ?? null);

                setCachedData(CACHE_KEYS.PRODUCT + id, prod);
                localStorage.removeItem("dashboard_data");
            } catch (err) {
                console.error("Error loading product:", err);
            }
        }

        return () => {
            cancelled = true;
        };
    }, [id]);

    // ---------- Load live price with cache ----------
    useEffect(() => {
        if (!quantity || !product) return;

        const fetchPrice = async () => {
            const cacheKey = getPriceCacheKey(id, variant?.id, quantity);
            const cached = getCachedData(cacheKey);
            if (cached) {
                setLivePrice(cached);
                fetchLivePrice();
                return;
            }
            await fetchLivePrice();
        };

        const fetchLivePrice = async () => {
            try {
                const { data } = await api.get(`/products/${id}/price`, {
                    params: {
                        variant_id: variant?.id,
                        quantity,
                    },
                });
                setLivePrice(data);
                setCachedData(
                    getPriceCacheKey(id, variant?.id, quantity),
                    data,
                );
            } catch (err) {
                console.error("Error fetching price:", err);
            }
        };

        const t = setTimeout(fetchPrice, 250);
        return () => clearTimeout(t);
    }, [variant, quantity, id, product]);

    if (!product) {
        return (
            <Layout>
                <div className="product-detail__loading">
                    <Skeleton variant="detail" />
                </div>
            </Layout>
        );
    }

    const addToCart = async () => {
        if (!variant) {
            setMessage("Please select a size/variant before adding to cart.");
            return;
        }

        setAdding(true);
        setMessage("");
        try {
            const { data } = await api.post("/cart/items", {
                product_id: product.id,
                variant_id: variant?.id,
                quantity,
            });
            setMessage(data.warning || "Added to cart ✓");
            setRecentlyAdded(true);
            refreshCartCount();
        } catch (err) {
            setRecentlyAdded(false);
            setMessage(err.response?.data?.message || "Could not add to cart.");
        } finally {
            setAdding(false);
        }
    };

    const buyNow = async () => {
        if (!variant) {
            setMessage("Please select a size/variant before buying.");
            return;
        }

        setAdding(true);
        setMessage("");
        try {
            const { data } = await api.post("/cart/buy-now", {
                product_id: product.id,
                variant_id: variant.id,
                quantity,
            });

            navigate("/checkout", {
                state: { buyNow: data.data },
            });
        } catch (err) {
            setMessage(err.response?.data?.message || "Could not process.");
            setAdding(false);
        }
    };

    const notifyMe = async () => {
        if (!variant) {
            setMessage("Please select a size/variant to be notified for.");
            return;
        }

        await api.post("/notify-me", {
            product_id: product.id,
            variant_id: variant?.id,
        });
        setMessage("We'll notify you when it's back in stock.");
    };

    const price = livePrice?.price ?? product.your_price ?? null;
    const availableStock =
        variant?.available_stock ?? product.available_stock ?? 0;
    const isOutOfStock =
        product.stock_status === "out_of_stock" || availableStock <= 0;
    const isGroupPrice =
        product.price_source === "group_price" ||
        product.price_source === "group_price_global";
    const isDealerPrice = product.price_source === "dealer_specific";
    const isSlabPrice = product.price_source === "quantity_slab";
    const hasSpecialPrice = isGroupPrice || isDealerPrice || isSlabPrice;
    const galleryImages = getGalleryImages(product, variant);

    return (
        <Layout>
            <section className="product-detail__heading">
                <div>
                    <p className="section-overline">
                        OBJECT OF INTEREST / THE TRADE EDIT
                    </p>
                    <h2>
                        Find your fit. <span>Make it yours.</span>
                    </h2>
                    <p>
                        Explore the details, check stock and order at your own trade rate.
                    </p>
                </div>
                <Link className="product-detail__back" to="/products">
                    <Icon name="arrow" size={16} /> Back to catalog
                </Link>
            </section>

            <div className="product-detail__breadcrumb">
                <Link to="/dashboard">Overview</Link>
                <Icon name="chevron" size={14} />
                <Link to="/products">Product catalog</Link>
                <Icon name="chevron" size={14} />
                <span>{product.name}</span>
            </div>

            <div className="product-detail">
                {/* ===== Gallery ===== */}
                <div className="product-detail__gallery">
                    <ProductGallery
                        key={variant?.id ?? "product"}
                        images={galleryImages}
                        productName={product.name}
                    />
                </div>

                {/* ===== Info ===== */}
                <div className="product-detail__info">
                    <p className="product-detail__eyebrow">
                        <span className="commerce-dot" /> PRODUCT OVERVIEW
                    </p>
                    <h1 className="product-detail__name">{product.name}</h1>
                    <p className="product-detail__meta">
                        {product.brand} • {product.category}
                    </p>

                    <div className="product-detail__tags">
                        {product.labels?.map((l) => (
                            <span key={l} className="product-detail__tag">
                                {l}
                            </span>
                        ))}
                    </div>

                    <div
                        className="product-detail__facts"
                        aria-label="Key product information"
                    >
                        {product.sku && (
                            <div>
                                <span className="product-detail__facts-icon">
                                    <Icon name="box" size={16} />
                                </span>
                                <small>Product code</small>
                                <strong>{product.sku}</strong>
                            </div>
                        )}
                        <div>
                            <span className="product-detail__facts-icon">
                                <Icon name="layers" size={16} />
                            </span>
                            <small>Minimum order</small>
                            <strong>{product.moq ?? 1} units</strong>
                        </div>
                        <div>
                            <span className="product-detail__facts-icon">
                                <Icon name="check" size={16} />
                            </span>
                            <small>Availability</small>
                            <strong>
                                {isOutOfStock
                                    ? "Out of stock"
                                    : `${availableStock} available`}
                            </strong>
                        </div>
                    </div>

                    {/* Price block */}
                    <div className="product-detail__price-block">
                        {price != null ? (
                            <>
                                <span className="product-detail__price">
                                    ₹{price}
                                </span>
                                {product.mrp > price && (
                                    <span className="product-detail__mrp">
                                        ₹{product.mrp}
                                    </span>
                                )}
                                {hasSpecialPrice ? (
                                    <span className="product-detail__slab-badge">
                                        {isDealerPrice
                                            ? "Your special trade rate"
                                            : isGroupPrice
                                              ? "Your group rate"
                                              : "Volume pricing applied"}
                                    </span>
                                ) : (
                                    <span className="product-detail__slab-badge">
                                        Standard price
                                    </span>
                                )}
                            </>
                        ) : (
                            <span className="product-detail__no-price">
                                Contact admin for pricing
                            </span>
                        )}
                    </div>

                    <TierPricing slabs={product.quantity_slabs || []} quantity={quantity} onQuantityChange={setQuantity} />

                    {/* Variant selector */}
                    {product.variants?.length > 0 && (
                        <div className="product-detail__variant-row">
                            <label>Size / Variant</label>
                            <select
                                className="product-detail__variant-select"
                                value={variant?.id ?? ""}
                                onChange={(e) => {
                                    const selected = product.variants.find(
                                        (x) => String(x.id) === e.target.value,
                                    );
                                    setVariant(selected || null);
                                    if (message) setMessage("");
                                }}
                            >
                                {product.variants.map((v) => {
                                    const label =
                                        v.attributes?.Size ||
                                        v.attributes?.size ||
                                        v.name ||
                                        v.sku ||
                                        `Variant ${v.id}`;
                                    const stockText =
                                        v.available_stock != null
                                            ? ` (${v.available_stock} left)`
                                            : "";
                                    return (
                                        <option key={v.id} value={v.id}>
                                            {label}
                                            {stockText}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    )}

                    {/* Quantity */}
                    <div className="product-detail__qty-row">
                        <label>Quantity (MOQ: {product.moq})</label>
                        <div className="experience-quantity">
                            <button type="button" aria-label="Decrease quantity" disabled={quantity <= (product.moq || 1)}
                                onClick={() => setQuantity((current) => Math.max(product.moq || 1, current - 1))}>−</button>
                            <input
                                type="number" inputMode="numeric"
                                min={product.moq || 1}
                                value={quantity}
                                aria-label="Order quantity"
                                onChange={(e) => setQuantity(Math.max(product.moq || 1, Number(e.target.value) || product.moq || 1))}
                            />
                            <button type="button" aria-label="Increase quantity"
                                onClick={() => setQuantity((current) => current + 1)}>+</button>
                        </div>
                    </div>

                    {/* Stock */}
                    <p className="product-detail__stock">
                        {isOutOfStock
                            ? "Out of Stock"
                            : `${availableStock} units available`}
                    </p>

                    {/* Actions */}
                    <div className="product-detail__actions product-detail__actions--desktop">
                        {isOutOfStock ? (
                            <button
                                className="product-detail__btn product-detail__btn--secondary"
                                onClick={notifyMe}
                            >
                                Notify Me
                            </button>
                        ) : (
                            <>
                                <button
                                    className={`product-detail__btn product-detail__btn--brass ${recentlyAdded ? "experience-cart-added" : ""}`}
                                    onClick={addToCart}
                                    disabled={adding}
                                >
                                    <Icon name="cart" size={18} />
                                    {adding ? "Adding…" : recentlyAdded ? "Added ✓" : "Add to cart"}
                                </button>
                                <button
                                    className="product-detail__btn product-detail__btn--primary"
                                    onClick={buyNow}
                                    disabled={adding}
                                >
                                    <span
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "6px",
                                        }}
                                    >
                                        <svg
                                            width="24"
                                            height="25"
                                            viewBox="1 0 22 22"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                clipRule="evenodd"
                                                d="M3.927 3.28A.956.956 0 0 0 2.576 4.63l5.437 5.438-5.3 5.3a.956.956 0 1 0 1.352 1.351l5.43-5.43a1.727 1.727 0 0 0-.032-2.474L3.927 3.28Z"
                                                fill="#fff"
                                            />
                                            <path
                                                fillRule="evenodd"
                                                clipRule="evenodd"
                                                d="M11.631 3.28A.956.956 0 1 0 10.28 4.63l5.437 5.438-5.3 5.3a.956.956 0 1 0 1.352 1.351l5.43-5.43a1.727 1.727 0 0 0-.032-2.474L11.631 3.28Z"
                                                fill="#fff"
                                            />
                                        </svg>
                                        Buy Now
                                    </span>
                                </button>
                            </>
                        )}

                        <WishlistButton
                            productId={product.id}
                            variantId={variant?.id}
                        />
                    </div>

                    {message && (
                        <p
                            className={`product-detail__message ${
                                message.includes("select") ||
                                message.includes("Could not") ||
                                message.includes("Invalid")
                                    ? "product-detail__message--error"
                                    : "product-detail__message--success"
                            }`}
                        >
                            {message}
                        </p>
                    )}

                    <div
                        className="product-detail__confidence"
                        aria-label="Wholesale purchase information"
                    >
                        <div>
                            <span>
                                <Icon name="tag" size={19} />
                            </span>
                            <strong>Transparent trade prices</strong>
                            <small>
                                Pricing reflects your selected variant and
                                quantity.
                            </small>
                        </div>
                        <div>
                            <span>
                                <Icon name="shield" size={19} />
                            </span>
                            <strong>Built for business buyers</strong>
                            <small>
                                Review product details before placing an order.
                            </small>
                        </div>
                    </div>

                    {/* Description */}
                    {product.description && (
                        <div className="product-detail__description">
                            <h3>Description</h3>
                            <div
                                className="product-detail__description-content"
                                dangerouslySetInnerHTML={{
                                    __html: product.description,
                                }}
                            />
                        </div>
                    )}

                    {/* Attributes */}
                    {product.attributes &&
                        Object.keys(product.attributes).length > 0 && (
                            <div className="product-detail__attributes">
                                <h3>Specifications</h3>
                                {Object.entries(product.attributes).map(
                                    ([name, values]) => (
                                        <div
                                            key={name}
                                            className="product-detail__attr-row"
                                        >
                                            <span>{name}</span>
                                            <span>
                                                {Array.isArray(values)
                                                    ? values.join(", ")
                                                    : values}
                                            </span>
                                        </div>
                                    ),
                                )}
                            </div>
                        )}
                </div>
            </div>

            {/* Similar products / suggestions */}
            <section className="product-similar" aria-label="Similar products">
                <div className="product-similar__head">
                    <div>
                        <p className="section-overline" style={{ marginBottom: 6 }}>YOU MAY ALSO LIKE</p>
                        <h2>More products for your next order</h2>
                        <p>Related catalog selections to help you source more efficiently.</p>
                    </div>
                    <Link to="/products">View full catalog →</Link>
                </div>
                {similarLoading && (
                    <div className="product-similar__empty">Loading suggestions…</div>
                )}
                {!similarLoading && similar.length === 0 && (
                    <div className="product-similar__empty">
                        No similar products found right now.
                    </div>
                )}
                {!similarLoading && similar.length > 0 && (
                    <div className="product-similar__grid">
                        {similar.map((p, i) => (
                            <ProductCard key={p.id} product={p} revealIndex={i} />
                        ))}
                    </div>
                )}
            </section>

        </Layout>
    );
}
