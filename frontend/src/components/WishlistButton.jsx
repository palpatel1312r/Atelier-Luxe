import { useEffect, useState } from "react";
import api from "../api/client";
import { useWishlistCount } from "../hooks/useWishlistCount";
import "../styles/wishlist.css";

export default function WishlistButton({
    productId,
    variantId,
    className = "",
}) {
    const [inWishlist, setInWishlist] = useState(false);
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const { refresh: refreshWishlistCount } = useWishlistCount();

    // ✅ Check current wishlist status when product/variant changes
    useEffect(() => {
        let cancelled = false;
        setInitializing(true);

        const check = async () => {
            try {
                const { data } = await api.get("/wishlist/check", {
                    params: {
                        product_id: productId,
                        variant_id: variantId || undefined,
                    },
                });
                if (!cancelled) {
                    setInWishlist(!!data?.data?.in_wishlist);
                }
            } catch {
                if (!cancelled) setInWishlist(false);
            } finally {
                if (!cancelled) setInitializing(false);
            }
        };

        if (productId) check();
        return () => {
            cancelled = true;
        };
    }, [productId, variantId]);

    const toggle = async () => {
        if (loading || initializing) return;
        setLoading(true);

        // Optimistic update
        const wasIn = inWishlist;
        setInWishlist(!wasIn);

        try {
            if (wasIn) {
                // Remove
                await api.delete(`/wishlist/${productId}`, {
                    params: {
                        variant_id: variantId || undefined,
                    },
                });
            } else {
                // Add
                await api.post("/wishlist", {
                    product_id: productId,
                    variant_id: variantId || null,
                });
            }
            refreshWishlistCount();
        } catch (err) {
            // Revert on failure
            setInWishlist(wasIn);
            console.error(
                "Wishlist toggle failed:",
                err?.response?.data || err,
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            type="button"
            className={`wishlist-btn ${inWishlist ? "wishlist-btn--active" : ""} ${className}`}
            onClick={toggle}
            disabled={loading || initializing}
            aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={inWishlist}
        >
            <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill={inWishlist ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
        </button>
    );
}
