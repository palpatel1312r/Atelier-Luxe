import { useLocation, Link } from "react-router-dom";
import { formatPrice } from "../lib/format";

interface ConfirmationProps {
  onContinueShopping: () => void;
}

export default function Confirmation({
  onContinueShopping,
}: ConfirmationProps) {
  const location = useLocation();
  const order = (location.state as any)?.order;
  const orderNumber =
    order?.order_number || `ATL-${Math.floor(Math.random() * 90000 + 10000)}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
      <div className="max-w-lg mx-auto">
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-8">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10 text-amber-800"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl sm:text-3xl font-light text-stone-800 mb-4">
          Thank You for Your Order
        </h1>
        <p className="text-stone-600 leading-relaxed mb-3">
          Your order has been placed successfully. We&apos;re preparing your
          garments with care.
        </p>
        <p className="text-stone-500 text-sm mb-2">
          Order{" "}
          <span className="font-medium text-stone-800">{orderNumber}</span>
        </p>
        {order?.total != null && (
          <p className="text-stone-500 text-sm mb-8">
            Total: {formatPrice(order.total)}
          </p>
        )}
        {!order?.total && <div className="mb-8" />}
        <div className="bg-stone-50 rounded-lg p-6 border border-stone-200 mb-8 text-left">
          <h3 className="text-sm tracking-wider uppercase text-stone-700 font-medium mb-3">
            What&apos;s Next
          </h3>
          <ul className="space-y-2 text-sm text-stone-600">
            <li className="flex items-center gap-2">
              <span className="text-amber-800">1.</span> Order confirmation
              logged (check server console for email)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-amber-800">2.</span> Garments carefully
              prepared and inspected
            </li>
            <li className="flex items-center gap-2">
              <span className="text-amber-800">3.</span> Shipped within 2-3
              business days
            </li>
            <li className="flex items-center gap-2">
              <span className="text-amber-800">4.</span> Track status under My
              Orders
            </li>
          </ul>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onContinueShopping}
            className="bg-stone-800 text-white px-8 py-3.5 text-sm tracking-[0.15em] uppercase hover:bg-amber-900 transition-colors"
          >
            Continue Shopping
          </button>
          <Link
            to="/orders"
            className="border border-stone-300 text-stone-700 px-8 py-3.5 text-sm tracking-[0.15em] uppercase hover:border-amber-800 hover:text-amber-900 transition-colors"
          >
            My Orders
          </Link>
        </div>
      </div>
    </div>
  );
}
