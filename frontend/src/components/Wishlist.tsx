import { useWishlist } from '../context/WishlistContext';
import ProductCard from './ProductCard';
import { Product } from '../types';

interface WishlistProps {
  onSelect: (product: Product) => void;
  onContinueShopping: () => void;
}

export default function Wishlist({ onSelect, onContinueShopping }: WishlistProps) {
  const { items, clear } = useWishlist();

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
        <div className="max-w-md mx-auto">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-stone-300 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <h2 className="text-2xl font-light text-stone-800 mb-3">Your wishlist is empty</h2>
          <p className="text-stone-500 mb-8">
            Save your favorite pieces to revisit them later.
          </p>
          <button
            onClick={onContinueShopping}
            className="bg-stone-800 text-white px-8 py-3 text-sm tracking-[0.15em] uppercase hover:bg-amber-900 transition-colors"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl sm:text-3xl font-light text-stone-800 tracking-wide">
          Wishlist
        </h1>
        <button
          onClick={clear}
          className="text-sm text-stone-500 hover:text-red-600 transition-colors"
        >
          Clear all
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}