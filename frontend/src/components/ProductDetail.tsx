import { useState } from 'react';
import { Product } from '../types';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PLACEHOLDER, resolveImageUrl } from '../lib/images';

interface ProductDetailProps {
  product: Product;
  onAddToCart: (product: Product, size: string) => void;
  onBuyNow: (product: Product, size: string) => void;
  onBack: () => void;
}

export default function ProductDetail({
  product,
  onAddToCart,
  onBuyNow,
  onBack,
}: ProductDetailProps) {
  const { user } = useAuth();
  const toast = useToast();
  const { has, add, remove } = useWishlist();

  const sizes = Array.isArray(product.sizes) ? product.sizes : [];
  const [selectedSize, setSelectedSize] = useState(sizes[0] ?? '');

  // Merge main image + gallery images, deduplicated, filter out empties
  const gallery: string[] = Array.from(
    new Set(
      [product.image, ...(product.images ?? [])].filter(
        (p): p is string => typeof p === 'string' && p.length > 0
      )
    )
  );

  const [activeImage, setActiveImage] = useState(0);
  const current = gallery[activeImage] ?? '';

  const inWishlist = user ? has(product.id) : false;

  const handleWishlist = async () => {
    if (!user) {
      toast.info('Please log in to use the wishlist.');
      return;
    }
    try {
      if (inWishlist) {
        await remove(product.id);
        toast.success('Removed from wishlist.');
      } else {
        await add(product.id);
        toast.success('Added to wishlist.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Wishlist error.');
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
        <div>
          <div className="aspect-[4/5] bg-stone-100 rounded-lg overflow-hidden mb-4">
            <img
              src={current ? resolveImageUrl(current) : PLACEHOLDER}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = PLACEHOLDER;
              }}
            />
          </div>

          {gallery.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {gallery.map((img, i) => (
                <button
                  key={`${img}-${i}`}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`aspect-[4/5] rounded overflow-hidden border-2 transition-colors ${
                    i === activeImage
                      ? 'border-amber-800'
                      : 'border-transparent hover:border-stone-300'
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
          <p className="text-2xl text-stone-800 mb-6">
            ${Number(product.price ?? 0).toFixed(2)}
          </p>

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
                {sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    className={`px-4 py-2 text-sm border rounded transition-colors ${
                      selectedSize === s
                        ? 'bg-stone-800 text-white border-stone-800'
                        : 'bg-white text-stone-700 border-stone-300 hover:border-amber-800'
                    }`}
                  >
                    {s}
                  </button>
                ))}
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
                  ? 'bg-red-50 border-red-300 text-red-600'
                  : 'border-stone-300 text-stone-600 hover:border-amber-800'
              }`}
              aria-label="Wishlist"
            >
              {inWishlist ? '♥' : '♡'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}