import PurchaseProgress from "../components/PurchaseProgress";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../api/client";
import "../styles/cart.css";
import { useCartCount } from "../hooks/useCartCount";
import Icon from "../components/ui/Icon";

/* ---------- cache helpers ---------- */
const CACHE_KEYS = { CART: "cart_data" };
const CACHE_EXPIRY = 2 * 60 * 1000;

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
        /* ignore */
    }
};

const formatCurrency = (value) =>
    `\u20B9${Number(value ?? 0).toLocaleString("en-IN")}`;

export default function Cart() {
    const [items, setItems] = useState([]);
    const [grandTotal, setGrandTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [removingId, setRemovingId] = useState(null);
    const [quantityInput, setQuantityInput] = useState({});
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const { refresh: refreshCartCount } = useCartCount();

    const fetchCart = useCallback(async () => {
        try {
            const { data } = await api.get("/cart");
            setItems(data.data.items);
            setGrandTotal(data.data.grand_total);
            setCachedData(CACHE_KEYS.CART, {
                items: data.data.items,
                grand_total: data.data.grand_total,
            });
        } catch (err) {
            console.error("Error loading cart:", err);
            setError("Could not load your cart. Please refresh.");
        } finally {
            setLoading(false);
        }
    }, []);

    const load = useCallback(() => {
        setError("");
        setLoading(true);
        const cached = getCachedData(CACHE_KEYS.CART);
        if (cached) {
            setItems(cached.items ?? []);
            setGrandTotal(cached.grand_total ?? 0);
            setLoading(false);
            fetchCart();
            return;
        }
        fetchCart();
    }, [fetchCart]);

    useEffect(() => {
        load();
        refreshCartCount();
    }, [load, refreshCartCount]);

    const updateQty = async (itemId, quantity) => {
        if (quantity < 1) return;
        setUpdatingId(itemId);
        setError("");
        try {
            await api.patch(`/cart/items/${itemId}`, { quantity });
            setQuantityInput((prev) => {
                const next = { ...prev };
                delete next[itemId];
                return next;
            });
            localStorage.removeItem(CACHE_KEYS.CART);
            await fetchCart();
            refreshCartCount();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Could not update quantity. Please try again.",
            );
            setQuantityInput((prev) => {
                const next = { ...prev };
                delete next[itemId];
                return next;
            });
        } finally {
            setUpdatingId(null);
        }
    };

    const removeItem = async (itemId) => {
        setRemovingId(itemId);
        setError("");
        try {
            await api.delete(`/cart/items/${itemId}`);
            localStorage.removeItem(CACHE_KEYS.CART);
            setItems((prev) => prev.filter((i) => i.id !== itemId));
            await fetchCart();
            refreshCartCount();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Could not remove item. Please try again.",
            );
        } finally {
            setRemovingId(null);
        }
    };

    const goToProduct = (productId) => navigate(`/products/${productId}`);

    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

    /* ---------- Loading (skeleton) ---------- */
    if (loading && items.length === 0) {
        return (
            <Layout>
                <div className="cart-page cart-page--loading">
                    <div className="cart-skeleton-head" />
                    <div className="cart-skeleton-line" />
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="cart-skeleton-row">
                            <div className="cart-skeleton-thumb" />
                            <div className="cart-skeleton-body">
                                <div className="cart-skeleton-line cart-skeleton-line--wide" />
                                <div className="cart-skeleton-line" />
                                <div className="cart-skeleton-line cart-skeleton-line--short" />
                            </div>
                        </div>
                    ))}
                </div>
            </Layout>
        );
    }

    /* ---------- Empty ---------- */
    if (items.length === 0) {
        return (
            <Layout>
                <div className="cart-page cart-page--empty">
                    <div className="cart-empty__icon">
                        <Icon name="bag" size={30} />
                    </div>
                    <h2>Your cart is empty</h2>
                    <p>Browse products and add items to place an order.</p>
                    <button
                        type="button"
                        className="cart-cta"
                        onClick={() => navigate("/products")}
                    >
                        Browse products
                        <Icon name="arrow" size={16} />
                    </button>
                </div>
            </Layout>
        );
    }

    /* ---------- Main ---------- */
    return (
        <Layout>
            <PurchaseProgress stage="cart" />
            <div className="cart-page">
                {/* Header */}
                {/* <header className="cart-head">
                    <div className="cart-head__left">
                        <p className="cart-head__eyebrow">CHECKOUT / 01</p>
                        <h1 className="cart-head__title">Everything in your bag.</h1>
                        <p className="cart-head__sub">
                            {itemCount} item{itemCount === 1 ? "" : "s"} in your
                            basket
                        </p>
                        <div className="cart-head__assurance">
                            <span><Icon name="check" size={13} /> Live trade pricing</span>
                            <span><Icon name="shield" size={13} /> Secure checkout</span>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="cart-head__link"
                        onClick={() => navigate("/products")}
                    >
                        <Icon name="arrow" className="cart-icon--back" size={16} />
                        Keep exploring
                    </button>
                </header> */}

                {/* Stepper */}
                <ol className="cart-steps">
                    <li className="is-current">
                        <span className="cart-steps__dot">1</span>
                        <span className="cart-steps__label">Review basket</span>
                    </li>
                    <li>
                        <span className="cart-steps__dot">2</span>
                        <span className="cart-steps__label">
                            Delivery &amp; payment
                        </span>
                    </li>
                    <li>
                        <span className="cart-steps__dot">3</span>
                        <span className="cart-steps__label">Place order</span>
                    </li>
                </ol>

                {/* Error */}
                {error && (
                    <div className="cart-alert" role="alert">
                        <Icon name="shield" size={16} />
                        <span>{error}</span>
                    </div>
                )}

                <div className="cart-grid">
                    {/* Items column */}
                    <div className="cart-main">
                        <ul className="cart-list">
                            {items.map((item) => {
                                const isUpdating = updatingId === item.id;
                                const isRemoving = removingId === item.id;
                                const qtyValue =
                                    quantityInput[item.id] !== undefined
                                        ? quantityInput[item.id]
                                        : item.quantity;

                                return (
                                    <li
                                        key={item.id}
                                        className={`cart-row ${
                                            isRemoving ? "is-removing" : ""
                                        }`}
                                    >
                                        {/* Image */}
                                        <button
                                            type="button"
                                            className="cart-row__thumb"
                                            onClick={() =>
                                                goToProduct(item.product_id)
                                            }
                                            aria-label={`View ${item.product_name}`}
                                        >
                                            {item.image_url ? (
                                                <img
                                                    src={item.image_url}
                                                    alt={item.product_name}
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <span className="cart-row__noimage">
                                                    <Icon
                                                        name="box"
                                                        size={22}
                                                    />
                                                </span>
                                            )}
                                        </button>

                                        {/* Details */}
                                        <div className="cart-row__body">
                                            <button
                                                type="button"
                                                className="cart-row__name"
                                                onClick={() =>
                                                    goToProduct(item.product_id)
                                                }
                                            >
                                                {item.product_name}
                                            </button>
                                            {item.sku && (
                                                <p className="cart-row__sku">
                                                    SKU: {item.sku}
                                                </p>
                                            )}
                                            {item.slab_applied && (
                                                <span className="cart-row__badge">
                                                    <Icon
                                                        name="tag"
                                                        size={11}
                                                    />
                                                    Bulk price applied
                                                </span>
                                            )}

                                            {/* Controls */}
                                            <div className="cart-row__controls">
                                                <div
                                                    className="cart-qty"
                                                    aria-label="Quantity"
                                                >
                                                    <button
                                                        type="button"
                                                        aria-label="Decrease quantity"
                                                        disabled={isUpdating}
                                                        onClick={() =>
                                                            updateQty(
                                                                item.id,
                                                                item.quantity -
                                                                    1,
                                                            )
                                                        }
                                                    >
                                                        &minus;
                                                    </button>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={qtyValue}
                                                        onChange={(e) =>
                                                            setQuantityInput(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    [item.id]:
                                                                        e.target
                                                                            .value,
                                                                }),
                                                            )
                                                        }
                                                        onKeyDown={(e) => {
                                                            if (
                                                                e.key ===
                                                                "Enter"
                                                            ) {
                                                                e.preventDefault();
                                                                const val =
                                                                    parseInt(
                                                                        e.target
                                                                            .value,
                                                                        10,
                                                                    );
                                                                if (
                                                                    val > 0 &&
                                                                    val !==
                                                                        item.quantity
                                                                )
                                                                    updateQty(
                                                                        item.id,
                                                                        val,
                                                                    );
                                                            }
                                                        }}
                                                        onBlur={(e) => {
                                                            const val =
                                                                parseInt(
                                                                    e.target
                                                                        .value,
                                                                    10,
                                                                );
                                                            if (
                                                                val > 0 &&
                                                                val !==
                                                                    item.quantity
                                                            ) {
                                                                updateQty(
                                                                    item.id,
                                                                    val,
                                                                );
                                                            } else {
                                                                setQuantityInput(
                                                                    (prev) => {
                                                                        const next =
                                                                            {
                                                                                ...prev,
                                                                            };
                                                                        delete next[
                                                                            item
                                                                                .id
                                                                        ];
                                                                        return next;
                                                                    },
                                                                );
                                                            }
                                                        }}
                                                        disabled={isUpdating}
                                                        className="cart-qty__input"
                                                    />
                                                    <button
                                                        type="button"
                                                        aria-label="Increase quantity"
                                                        disabled={isUpdating}
                                                        onClick={() =>
                                                            updateQty(
                                                                item.id,
                                                                item.quantity +
                                                                    1,
                                                            )
                                                        }
                                                    >
                                                        +
                                                    </button>
                                                </div>

                                                <div className="cart-row__price">
                                                    <span className="cart-row__unit">
                                                        {formatCurrency(
                                                            item.unit_price,
                                                        )}{" "}
                                                        &times; {item.quantity}
                                                    </span>
                                                    <span className="cart-row__total">
                                                        {formatCurrency(
                                                            item.total_price,
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Remove */}
                                        <button
                                            type="button"
                                            className="cart-row__remove"
                                            aria-label={`Remove ${item.product_name} from cart`}
                                            onClick={() => removeItem(item.id)}
                                            disabled={isRemoving}
                                        >
                                            {isRemoving ? (
                                                <span className="cart-row__spin" />
                                            ) : (
                                                <Icon name="plus" className="cart-icon--close" size={15} />
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    {/* Summary sidebar */}
                    <aside className="cart-aside">
                        <div className="cart-summary">
                            <h2 className="cart-summary__title">
                                Order summary
                            </h2>

                            <div className="cart-summary__row">
                                <span>Items</span>
                                <span className="cart-summary__mono">
                                    {items.length}
                                </span>
                            </div>
                            <div className="cart-summary__row">
                                <span>Total quantity</span>
                                <span className="cart-summary__mono">
                                    {itemCount}
                                </span>
                            </div>
                            <div className="cart-summary__row">
                                <span>Shipping</span>
                                <span className="cart-summary__muted">
                                    Calculated at checkout
                                </span>
                            </div>

                            <div className="cart-summary__total">
                                <span>Grand total</span>
                                <span>{formatCurrency(grandTotal)}</span>
                            </div>

                            <div className="cart-summary__delivery">
                                <span><Icon name="truck" size={18} /></span>
                                <div><strong>Delivery calculated next</strong><small>Confirm your address at checkout</small></div>
                            </div>

                            <button
                                type="button"
                                className="cart-summary__cta"
                                onClick={() => navigate("/checkout")}
                            >
                                <Icon name="lock" size={15} />
                                Proceed to checkout
                                <Icon name="arrow" size={15} />
                            </button>

                            <p className="cart-summary__secure">
                                <Icon name="shield" size={12} />
                                Secure trade checkout
                            </p>
                        </div>
                    </aside>
                </div>

                {/* Sticky mobile CTA */}
                <div className="cart-mobile-cta">
                    <div className="cart-mobile-cta__total">
                        <span>Grand total</span>
                        <strong>{formatCurrency(grandTotal)}</strong>
                    </div>
                    <button
                        type="button"
                        className="cart-mobile-cta__btn"
                        onClick={() => navigate("/checkout")}
                    >
                        Checkout
                        <Icon name="arrow" size={15} />
                    </button>
                </div>
            </div>
        </Layout>
    );
}
