import { CartItem } from '../types';
import { resolveImageUrl, PLACEHOLDER } from '../lib/images'; 
interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (productId: number, size: string, quantity: number) => void;
  onRemoveItem: (productId: number, size: string) => void;
  onCheckout: () => void;
  onContinueShopping: () => void;
}

export default function Cart({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  onContinueShopping
}: CartProps) {
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shipping = subtotal > 300 ? 0 : 15;
  const total = subtotal + shipping;

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
        <div className="max-w-md mx-auto">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 mx-auto text-stone-300 mb-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
          <h2 className="text-2xl font-light text-stone-800 mb-3">Your cart is empty</h2>
          <p className="text-stone-500 mb-8">
            Discover our curated collection of specialty garments.
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
      <h1 className="text-2xl sm:text-3xl font-light text-stone-800 mb-8 tracking-wide">
        Shopping Bag
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
        <div className="lg:col-span-2 space-y-6">
          {items.map((item) => (
            <div
              key={`${item.product.id}-${item.selectedSize}`}
              className="flex gap-4 sm:gap-6 p-4 sm:p-6 bg-white rounded-lg border border-stone-100 shadow-sm"
            >
              <div className="w-24 h-32 sm:w-32 sm:h-40 rounded-md overflow-hidden bg-stone-100 flex-shrink-0">
              <img
  src={resolveImageUrl(item.product.image)}
  alt={item.product.name}
  onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
  className="w-full h-full object-cover"
/>
              </div>
              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div>
                  <p className="text-xs tracking-wider text-amber-800 uppercase mb-1">
                    {item.product.category}
                  </p>
                  <h3 className="text-stone-800 font-medium text-base sm:text-lg truncate">
                    {item.product.name}
                  </h3>
                  <p className="text-stone-500 text-sm mt-1">
                    Size: {item.selectedSize} · {item.product.color}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center border border-stone-200 rounded">
                    <button
                      onClick={() =>
                        onUpdateQuantity(item.product.id, item.selectedSize, item.quantity - 1)
                      }
                      className="w-8 h-8 flex items-center justify-center text-stone-600 hover:text-amber-800 transition-colors"
                    >
                      −
                    </button>
                    <span className="w-8 h-8 flex items-center justify-center text-sm text-stone-800 border-x border-stone-200">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        onUpdateQuantity(item.product.id, item.selectedSize, item.quantity + 1)
                      }
                      className="w-8 h-8 flex items-center justify-center text-stone-600 hover:text-amber-800 transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-stone-800 font-medium">
                    ${item.product.price * item.quantity}
                    </span>
                    <button
                      onClick={() => onRemoveItem(item.product.id, item.selectedSize)}
                      className="text-stone-400 hover:text-red-600 transition-colors"
                      aria-label="Remove item"
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-stone-50 rounded-lg p-6 border border-stone-200 sticky top-24">
            <h3 className="text-sm tracking-wider uppercase text-stone-700 font-medium mb-6">
              Order Summary
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal</span>
                <span>{subtotal}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Shipping</span>
                <span>{shipping === 0 ? 'Complimentary' : `$${shipping}`}</span>
              </div>
              {shipping > 0 && (
                <p className="text-xs text-amber-800">Free shipping on orders over 300</p>
              )}
              <div className="pt-3 border-t border-stone-200">
                <div className="flex justify-between text-stone-800 font-medium text-base">
                  <span>Total</span>
                  <span>${total}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onCheckout}
              className="w-full mt-6 bg-stone-800 text-white py-3.5 text-sm tracking-[0.15em] uppercase hover:bg-amber-900 transition-colors"
            >
              Proceed to Checkout
            </button>
            <button
              onClick={onContinueShopping}
              className="w-full mt-3 text-stone-600 hover:text-amber-800 text-sm tracking-wide transition-colors py-2"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}