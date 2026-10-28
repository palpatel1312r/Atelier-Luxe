import TradeAccountNav from "../components/TradeAccountNav";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import ProductCard from "../components/ProductCard";
import api from "../api/client";
import { useWishlistCount } from "../hooks/useWishlistCount";
import Icon from "../components/ui/Icon";
import "../styles/wishlist.css";

/* ---------- cache helpers (unchanged) ---------- */
const CACHE_KEYS = { WISHLIST: "wishlist_data" };
const CACHE_EXPIRY = 5 * 60 * 1000;

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

export default function Wishlist() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [removingId, setRemovingId] = useState(null);
    const [error, setError] = useState("");
    const { refresh } = useWishlistCount();

    const fetchWishlist = async () => {
        setLoading(true);
        setError("");
        try {
            const { data } = await api.get("/wishlist");
            const list = data.data || [];
            setItems(list);
            setCachedData(CACHE_KEYS.WISHLIST, list);
        } catch (err) {
            console.error("Error loading wishlist:", err);
            setError("Could not load your wishlist. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWishlist();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const remove = async (item, e) => {
        e.preventDefault();
        e.stopPropagation();

        setRemovingId(item.id);
        setError("");
        try {
            const params = {};
            if (item.variant_id != null) params.variant_id = item.variant_id;

            await api.delete(`/wishlist/${item.product_id}`, { params });

            setItems((prev) => prev.filter((i) => i.id !== item.id));
            refresh();
        } catch (err) {
            console.error("Error removing from wishlist:", err);
            setError("Could not remove this item. Please try again.");
        } finally {
            setRemovingId(null);
        }
    };

    const getVariantLabel = (item) => {
        if (item.variant_label) return item.variant_label;

        if (!item.variant_id || !item.product?.variants) return null;

        const variant = item.product.variants.find(
            (v) => String(v.id) === String(item.variant_id),
        );

        if (!variant) return null;

        return (
            variant.attributes?.Size ||
            variant.attributes?.size ||
            variant.name ||
            variant.sku ||
            null
        );
    };

    const visibleItems = useMemo(
        () => items.filter((item) => item.product),
        [items],
    );

    const count = visibleItems.length;

    return (
        <Layout>
            <TradeAccountNav />
            <div className="wishlist-page">
                {/* ---------- Header ---------- */}
                <header className="wishlist-head">
                    <div className="wishlist-head__left">
                        <p className="wishlist-head__eyebrow">Saved items</p>
                        <h1 className="wishlist-head__title">My Wishlist</h1>
                        <p className="wishlist-head__sub">
                            {loading
                                ? "Loading your saved products…"
                                : count === 0
                                  ? "Items you save will appear here."
                                  : `You have ${count} item${count === 1 ? "" : "s"} saved for later.`}
                        </p>
                    </div>
                    {count > 0 && (
                        <span className="wishlist-head__count">
                            <Icon name="heart" size={16} />
                            {count}
                        </span>
                    )}
                </header>

                {/* ---------- Error ---------- */}
                {error && (
                    <div className="wishlist-alert" role="alert">
                        <Icon name="alert" size={16} />
                        <span>{error}</span>
                    </div>
                )}

                {/* ---------- Loading ---------- */}
                {loading ? (
                    <div className="wishlist-grid wishlist-grid--skeleton">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div
                                key={i}
                                className="wishlist-skeleton"
                                style={{ animationDelay: `${i * 60}ms` }}
                            >
                                <div className="wishlist-skeleton__image" />
                                <div className="wishlist-skeleton__line" />
                                <div className="wishlist-skeleton__line wishlist-skeleton__line--short" />
                                <div className="wishlist-skeleton__btn" />
                            </div>
                        ))}
                    </div>
                ) : count === 0 ? (
                    /* ---------- Empty ---------- */
                    <div className="wishlist-empty">
                        <div className="wishlist-empty__icon">
                            <Icon name="heart" size={32} />
                        </div>
                        <h2>Your wishlist is empty</h2>
                        <p>
                            Browse products and tap the heart to save them for
                            later.
                        </p>
                        <button
                            type="button"
                            className="wishlist-empty__cta"
                            onClick={() => navigate("/products")}
                        >
                            Browse products
                            <Icon name="arrow-right" size={16} />
                        </button>
                    </div>
                ) : (
                    /* ---------- Grid ---------- */
                    <ul className="wishlist-grid">
                        {visibleItems.map((item, index) => {
                            const removing = removingId === item.id;
                            return (
                                <li
                                    key={item.id}
                                    className={`wishlist-item ${
                                        removing ? "is-removing" : ""
                                    }`}
                                    style={{
                                        animationDelay: `${Math.min(
                                            index * 40,
                                            400,
                                        )}ms`,
                                    }}
                                >
                                    <div className="wishlist-item__card">
                                        <ProductCard
                                            product={item.product}
                                            size={getVariantLabel(item)}
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        className="wishlist-item__remove"
                                        onClick={(e) => remove(item, e)}
                                        disabled={removing}
                                        aria-label={`Remove ${item.product?.name ?? "item"} from wishlist`}
                                    >
                                        {removing ? (
                                            <>
                                                <span className="wishlist-item__spin" />
                                                Removing…
                                            </>
                                        ) : (
                                            <>
                                                <Icon name="trash" size={14} />
                                                Remove
                                            </>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </Layout>
    );
}
