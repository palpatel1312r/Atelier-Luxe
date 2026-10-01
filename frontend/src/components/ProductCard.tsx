import { Product } from '../types';
import { useWishlist } from '../context/WishlistContext';
import { resolveImageUrl, PLACEHOLDER } from '../lib/images';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export default function ProductCard({ product, onSelect }: ProductCardProps) {
  const { toggle, has } = useWishlist();
  const isWishlisted = has(product.id);

  return (
    <div className="group text-left w-full relative">
      <button onClick={() => onSelect(product)} className="w-full text-left">
        <div className="relative overflow-hidden rounded-lg bg-stone-100 aspect-[3/4] mb-4">
          <img
            src={resolveImageUrl(product.image)}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            onError={(e) => {
              (e.target as HTMLImageElement).src = PLACEHOLDER;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
            <span className="inline-block bg-white/90 backdrop-blur-sm text-stone-800 text-sm px-4 py-2 rounded-full tracking-wide">
              View Details
            </span>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs tracking-wider text-amber-800 uppercase">
            {product.category}
          </p>
          <h3 className="text-stone-800 font-medium text-base sm:text-lg group-hover:text-amber-900 transition-colors">
            {product.name}
          </h3>
          <p className="text-stone-500 text-sm">${product.price}</p>
        </div>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          toggle(product);
        }}
        aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        className="absolute top-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-colors shadow-sm"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-5 w-5 transition-colors ${isWishlisted ? 'text-red-500 fill-red-500' : 'text-stone-600'}`}
          fill={isWishlisted ? 'currentColor' : 'none'}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      </button>
    </div>
  );
}