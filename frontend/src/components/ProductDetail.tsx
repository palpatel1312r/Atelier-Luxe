import { useEffect, useRef, useState, useCallback } from "react";
import { Product } from "../types";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { PLACEHOLDER, resolveImageUrl } from "../lib/images";
import {
  priceForSize,
  originalPriceForSize,
  hasSale,
  savingsAmount,
} from "../lib/pricing";
import { formatPrice, formatDate } from "../lib/format";
import ReviewsSection from "./ReviewsSection";
import RelatedProducts from "./RelatedProducts";
import RecentlyViewed from "./RecentlyViewed";
import { recordView } from "../lib/recentlyViewed";

interface ProductDetailProps {
  product: Product;
  onAddToCart: (product: Product, size: string) => void;
  onBuyNow: (product: Product, size: string) => void;
  onBack: () => void;
  onProductSelect: (product: Product) => void;
}

export default function ProductDetail({
  product,
  onAddToCart,
  onBuyNow,
  onBack,
  onProductSelect,
}: ProductDetailProps) {
  const { user } = useAuth();
  const toast = useToast();
  const { has, add, remove } = useWishlist();

  const sizes = Array.isArray(product.sizes) ? product.sizes : [];
  const [selectedSize, setSelectedSize] = useState(sizes[0] ?? "");

  // Pricing — declared AFTER selectedSize
  const payPrice = priceForSize(product, selectedSize);
  const originalPrice = originalPriceForSize(product, selectedSize);
  const onSale = hasSale(product);
  const savings = savingsAmount(product);

  // Merge main image + gallery images, deduplicated, filter out empties
  const gallery: string[] = Array.from(
    new Set(
      [product.image, ...(product.images ?? [])].filter(
        (p): p is string => typeof p === "string" && p.length > 0,
      ),
    ),
  );

  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    setActiveImage(0);
  }, [product.id]);

  useEffect(() => {
    if (activeImage >= gallery.length) setActiveImage(0);
  }, [gallery.length, activeImage]);

  useEffect(() => {
    if (product?.id) recordView(product.id);
  }, [product.id]);

  const total = gallery.length;
  const current = gallery[activeImage] ?? "";

  const goPrev = useCallback(() => {
    setActiveImage((i) => (i <= 0 ? total - 1 : i - 1));
  }, [total]);

  const goNext = useCallback(() => {
    setActiveImage((i) => (i >= total - 1 ? 0 : i + 1));
  }, [total]);

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: KeyboardEvent) => {
      if (lightboxOpen) return;
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, [goPrev, goNext, lightboxOpen]);

  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) {
      if (dx > 0) goPrev();
      else goNext();
    }
    touchStartX.current = null;
  };

  const inWishlist = user ? has(product.id) : false;

  const handleWishlist = async () => {
    if (!user) {
      toast.info("Please log in to use the wishlist.");
      return;
    }
    try {
      if (inWishlist) {
        await remove(product.id);
        toast.success("Removed from wishlist.");
      } else {
        await add(product.id);
        toast.success("Added to wishlist.");
      }
    } catch (err: any) {
      toast.error(err.message || "Wishlist error.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <button
        onClick={onBack}
        className="text-sm tracking-wider text-stone-500 hover:text-amber-800 uppercase mb-8"
      >
        ← Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
        {/* ---------- IMAGE GALLERY ---------- */}
        <div ref={containerRef} tabIndex={0} className="outline-none">
          <div
            className="relative aspect-[4/5] bg-stone-100 rounded-lg overflow-hidden mb-4 group select-none"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={current ? resolveImageUrl(current) : PLACEHOLDER}
              alt={product.name}
              onClick={() => current && setLightboxOpen(true)}
              className="w-full h-full object-cover cursor-zoom-in transition-opacity duration-300"
              onError={(e) => {
                (e.target as HTMLImageElement).src = PLACEHOLDER;
              }}
            />

            {onSale && (
              <span className="absolute top-3 left-3 bg-red-600 text-white text-xs tracking-wider uppercase px-3 py-1.5 rounded-full">
                Sale −{product.discount_pct}%
              </span>
            )}

            {total > 1 && (
              <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-stone-700 text-xs px-2.5 py-1 rounded-full tracking-wider">
                {activeImage + 1} / {total}
              </span>
            )}

            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Previous image"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm text-stone-700 shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-white transition-opacity flex items-center justify-center"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Next image"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm text-stone-700 shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-white transition-opacity flex items-center justify-center"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </>
            )}
          </div>

          {total > 1 && (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {gallery.map((img, i) => (
                <button
                  key={`${img}-${i}`}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`aspect-[4/5] rounded overflow-hidden border-2 transition-colors ${
                    i === activeImage
                      ? "border-amber-800"
                      : "border-transparent hover:border-stone-300"
                  }`}
                >
                  <img
                    src={resolveImageUrl(img)}
                    alt={`${product.name} ${i + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = PLACEHOLDER;
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ---------- INFO ---------- */}
        <div>
          {product.category && (
            <p className="text-xs tracking-[0.3em] text-amber-800 uppercase mb-2">
              {product.category}
            </p>
          )}
          <h1 className="text-3xl sm:text-4xl font-light text-stone-800 mb-4">
            {product.name}
          </h1>

          {/* Price block with sale */}
          <div className="flex items-baseline gap-3 mb-6 flex-wrap">
            <span className="text-2xl text-stone-800">
              {formatPrice(payPrice)}
            </span>
            {onSale && (
              <>
                <span className="text-stone-400 line-through text-lg">
                  {formatPrice(originalPrice)}
                </span>
                <span className="text-[11px] uppercase tracking-wider bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
                  Save {formatPrice(savings)} ({product.discount_pct}%)
                </span>
              </>
            )}
          </div>

          {onSale && product.sale_ends_at && (
            <p className="text-xs text-amber-800 mb-6">
              Sale ends {formatDate(product.sale_ends_at)}
            </p>
          )}

          {product.description && (
            <p className="text-stone-600 leading-relaxed mb-6">
              {product.description}
            </p>
          )}

          {Array.isArray(product.details) && product.details.length > 0 && (
            <ul className="mb-6 space-y-1 text-sm text-stone-500">
              {product.details.map((d, i) => (
                <li key={i}>• {d}</li>
              ))}
            </ul>
          )}

          {sizes.length > 0 && (
            <div className="mb-6">
              <p className="text-sm tracking-wider text-stone-700 uppercase mb-3">
                Size
              </p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => {
                  const sizePrice = priceForSize(product, s);
                  const isOverride = (product.size_prices || {})[s] != null;
                  return (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      className={`px-4 py-2 text-sm border rounded transition-colors flex flex-col items-center ${
                        selectedSize === s
                          ? "bg-stone-800 text-white border-stone-800"
                          : "bg-white text-stone-700 border-stone-300 hover:border-amber-800"
                      }`}
                    >
                      <span>{s}</span>
                      {isOverride && (
                        <span
                          className={`text-[10px] mt-0.5 ${
                            selectedSize === s
                              ? "text-white/70"
                              : "text-stone-500"
                          }`}
                        >
                          {formatPrice(sizePrice)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => onAddToCart(product, selectedSize)}
              className="flex-1 bg-stone-800 text-white px-6 py-3 text-sm tracking-[0.15em] uppercase hover:bg-amber-900 transition-colors"
            >
              Add to Cart
            </button>
            <button
              onClick={() => onBuyNow(product, selectedSize)}
              className="flex-1 border border-stone-800 text-stone-800 px-6 py-3 text-sm tracking-[0.15em] uppercase hover:bg-stone-800 hover:text-white transition-colors"
            >
              Buy Now
            </button>
            <button
              onClick={handleWishlist}
              className={`px-6 py-3 text-sm tracking-[0.15em] uppercase border transition-colors ${
                inWishlist
                  ? "bg-red-50 border-red-300 text-red-600"
                  : "border-stone-300 text-stone-600 hover:border-amber-800"
              }`}
              aria-label="Wishlist"
            >
              {inWishlist ? "♥" : "♡"}
            </button>
          </div>
        </div>
      </div>

      <ReviewsSection productId={product.id} />
      <RelatedProducts productId={product.id} onSelect={onProductSelect} />
      <RecentlyViewed excludeId={product.id} onSelect={onProductSelect} />

      {lightboxOpen && current && (
        <Lightbox
          images={gallery}
          index={activeImage}
          onIndexChange={setActiveImage}
          onClose={() => setLightboxOpen(false)}
          alt={product.name}
        />
      )}
    </div>
  );
}

/* ============================================================
   LIGHTBOX
   ============================================================ */
interface LightboxProps {
  images: string[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  alt: string;
}

function Lightbox({
  images,
  index,
  onIndexChange,
  onClose,
  alt,
}: LightboxProps) {
  const total = images.length;

  const prev = useCallback(
    () => onIndexChange(index <= 0 ? total - 1 : index - 1),
    [index, total, onIndexChange],
  );
  const next = useCallback(
    () => onIndexChange(index >= total - 1 ? 0 : index + 1),
    [index, total, onIndexChange],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, prev, next]);

  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) {
      if (dx > 0) prev();
      else next();
    }
    touchStartX.current = null;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[300] bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close"
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {total > 1 && (
        <span className="absolute top-5 left-5 text-white/80 text-sm tracking-wider">
          {index + 1} / {total}
        </span>
      )}

      {total > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          aria-label="Previous image"
          className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      )}

      <img
        src={resolveImageUrl(images[index])}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="max-w-[92vw] max-h-[88vh] object-contain rounded-lg select-none"
        onError={(e) => {
          (e.target as HTMLImageElement).src = PLACEHOLDER;
        }}
      />

      {total > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          aria-label="Next image"
          className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
