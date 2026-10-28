import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, imageUrl } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useCart } from "../context/CartContext";
import { formatPrice, formatDate } from "../lib/format";
import Loader from "./Loader";

interface ShippingAddress {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
}

interface OrderItem {
  product_id?: number;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  image?: string;
}

interface Order {
  id: number;
  order_number: string;
  created_at: string;
  status: string;
  total: number;
  subtotal: number;
  shipping: number;
  discount: number;
  tracking_number?: string | null;
  items: OrderItem[];
  shipping_address: ShippingAddress | string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  paid: "bg-blue-50 text-blue-700 border-blue-200",
  shipped: "bg-indigo-50 text-indigo-700 border-indigo-200",
  delivered: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

function normalizeAddress(addr: Order["shipping_address"]): ShippingAddress {
  if (!addr) return {};
  if (typeof addr === "string") {
    try {
      return JSON.parse(addr);
    } catch {
      return { address: addr };
    }
  }
  return addr;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    STATUS_STYLES[status?.toLowerCase()] ||
    "bg-stone-100 text-stone-700 border-stone-200";
  return (
    <span
      className={`inline-block text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border ${cls}`}
    >
      {status}
    </span>
  );
}

export default function MyOrders() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { addMany } = useCart();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reorderingId, setReorderingId] = useState<number | null>(null);

  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    setError("");
    api
      .myOrders()
      .then((data) => setOrders(data as Order[]))
      .catch((e: any) => {
        const msg = e.message || "Failed to load orders";
        setError(msg);
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  }, [user, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReorder = async (orderId: number) => {
    setReorderingId(orderId);
    try {
      const full: any = await api.getOrder(orderId);
      const entries = await Promise.all(
        (full.items || []).map(async (it: any) => ({
          product: await api.getProduct(it.product_id),
          size: it.size || "M",
          quantity: it.quantity || 1,
        })),
      );
      addMany(entries);
      toast.success("Items added to cart.");
      navigate("/cart");
    } catch {
      toast.error("Could not reorder.");
    } finally {
      setReorderingId(null);
    }
  };

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-stone-600 mb-4">
          Please log in to view your orders.
        </p>
        <Link to="/login" className="text-amber-900 underline">
          Sign in
        </Link>
      </div>
    );
  }

  if (loading) return <Loader label="Loading your orders…" />;

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={load}
          className="px-5 py-2.5 text-sm tracking-wider uppercase bg-stone-800 text-white rounded hover:bg-amber-900 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-light tracking-wide text-stone-800">
            My Orders
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            {orders.length === 0
              ? "No orders yet"
              : `${orders.length} order${orders.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Link
          to="/"
          className="text-sm tracking-wider uppercase text-stone-600 hover:text-amber-800 transition-colors"
        >
          Continue Shopping
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 border border-stone-200 rounded-lg bg-white">
          <p className="text-stone-600 mb-4">
            You haven't placed any orders yet.
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-3 text-sm tracking-wider uppercase bg-amber-900 text-white rounded hover:bg-amber-800 transition-colors"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <ul className="space-y-5">
          {orders.map((o) => {
            const addr = normalizeAddress(o.shipping_address);
            return (
              <li
                key={o.id}
                className="border border-stone-200 rounded-lg bg-white overflow-hidden hover:border-stone-300 transition-colors"
              >
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-4 p-5 border-b border-stone-100">
                  <div>
                    <Link
                      to={`/orders/${o.id}`}
                      className="font-medium text-stone-800 hover:text-amber-800 transition-colors"
                    >
                      {o.order_number}
                    </Link>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {formatDate(o.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <StatusBadge status={o.status} />
                    <p className="text-base font-medium text-stone-800">
                      {formatPrice(o.total)}
                    </p>
                  </div>
                </div>

                {/* Items */}
                <ul className="divide-y divide-stone-100">
                  {(o.items || []).map((item, i) => (
                    <li key={i} className="flex items-center gap-4 p-4">
                      {item.image ? (
                        <img
                          src={imageUrl(item.image)}
                          alt={item.name}
                          className="w-14 h-14 rounded object-cover bg-stone-100 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded bg-stone-100 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-stone-800 truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {item.size ? `Size ${item.size} · ` : ""}
                          Qty {item.quantity}
                        </p>
                      </div>
                      <p className="text-sm text-stone-700 whitespace-nowrap">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </li>
                  ))}
                </ul>

                {/* Footer */}
                <div className="p-5 bg-stone-50 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1 text-stone-600">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatPrice(o.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span>
                        {o.shipping === 0 ? "Free" : formatPrice(o.shipping)}
                      </span>
                    </div>
                    {o.discount > 0 && (
                      <div className="flex justify-between text-green-700">
                        <span>Discount</span>
                        <span>−{formatPrice(o.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium text-stone-800 pt-1.5 border-t border-stone-200">
                      <span>Total</span>
                      <span>{formatPrice(o.total)}</span>
                    </div>
                  </div>

                  <div className="sm:text-right space-y-1">
                    {(addr.address || addr.city || addr.country) && (
                      <>
                        <p className="text-xs uppercase tracking-wider text-stone-400">
                          Shipping to
                        </p>
                        <p className="text-stone-700">
                          {addr.address}
                          {addr.address && (addr.city || addr.zip) ? ", " : ""}
                          {[addr.city, addr.state, addr.zip]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                        {addr.country && (
                          <p className="text-stone-500 text-xs">
                            {addr.country}
                          </p>
                        )}
                      </>
                    )}
                    {o.tracking_number && (
                      <p className="text-xs text-stone-500 pt-2">
                        Tracking:{" "}
                        <span className="text-stone-700">
                          {o.tracking_number}
                        </span>
                      </p>
                    )}
                    <div className="flex sm:justify-end gap-4 mt-2">
                      <button
                        onClick={() => handleReorder(o.id)}
                        disabled={reorderingId === o.id}
                        className="text-sm tracking-wider uppercase text-amber-800 hover:text-amber-900 transition-colors disabled:opacity-60"
                      >
                        {reorderingId === o.id ? "Adding…" : "Reorder"}
                      </button>
                      <Link
                        to={`/orders/${o.id}`}
                        className="text-sm tracking-wider uppercase text-amber-800 hover:text-amber-900 transition-colors"
                      >
                        View Details →
                      </Link>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
