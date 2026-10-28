import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { formatPrice, formatDate } from "../lib/format";
import ConfirmDialog from "./ConfirmDialog";

interface OrderEvent {
  id: number;
  order_id: number;
  status: string;
  note: string;
  created_by: number | null;
  created_at: string;
}

interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  items: Array<{
    product_id: number;
    name: string;
    size?: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  status: string;
  tracking_number: string | null;
  created_at: string;
}

const STATUS_STEPS = ["placed", "paid", "shipped", "delivered"] as const;

const STATUS_LABELS: Record<string, string> = {
  placed: "Order placed",
  pending: "Awaiting payment",
  paid: "Payment confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { addMany } = useCart();

  const [order, setOrder] = useState<Order | null>(null);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    if (!id) return;
    const orderId = Number(id);
    setLoading(true);
    Promise.all([
      api.getOrder(orderId),
      api.getOrderEvents(orderId).catch(() => []),
    ])
      .then(([o, ev]) => {
        setOrder(o as Order);
        setEvents((ev as OrderEvent[]) || []);
      })
      .catch((e: any) => toast.error(e.message || "Failed to load order"))
      .finally(() => setLoading(false));
  }, [id, toast]);

  const reloadEvents = async (orderId: number) => {
    try {
      const ev = await api.getOrderEvents(orderId);
      setEvents(ev as OrderEvent[]);
    } catch {
      /* silent */
    }
  };

  const handleCancel = async () => {
    if (!order) return;
    setCancelling(true);
    try {
      const updated = (await api.cancelOrder(order.id)) as Order;
      setOrder(updated);
      setConfirmCancel(false);
      toast.success("Order cancelled.");
      await reloadEvents(order.id);
    } catch (e: any) {
      toast.error(e.message || "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  const handleReorder = async () => {
    if (!order?.items?.length) return;
    setReordering(true);
    try {
      const entries = await Promise.all(
        order.items.map(async (it) => {
          const product = await api.getProduct(it.product_id);
          return {
            product,
            size: it.size || "M",
            quantity: it.quantity || 1,
          };
        }),
      );
      addMany(entries);
      toast.success("Items added to cart.");
      navigate("/cart");
    } catch {
      toast.error("Could not re-add items to cart.");
    } finally {
      setReordering(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-stone-500">
        Loading…
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-stone-500">
        Order not found.
      </div>
    );
  }

  const canCancel = ["pending", "paid"].includes(order.status);
  const isCancelled = order.status === "cancelled";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-light text-stone-800">
            Order {order.order_number}
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Placed on {formatDate(order.created_at)}
          </p>
        </div>
        <div className="flex gap-2">
          {canCancel && (
            <button
              onClick={() => setConfirmCancel(true)}
              className="text-sm px-4 py-2 border border-stone-300 rounded hover:border-red-500 hover:text-red-600 transition-colors"
            >
              Cancel order
            </button>
          )}
          <button
            onClick={handleReorder}
            disabled={reordering}
            className="text-sm px-4 py-2 bg-stone-800 text-white rounded hover:bg-amber-900 transition-colors disabled:opacity-60"
          >
            {reordering ? "Adding…" : "Reorder"}
          </button>
        </div>
      </div>

      <div className="mb-8 p-5 bg-stone-50 rounded-lg border border-stone-200">
        <p className="text-xs tracking-wider uppercase text-stone-500 mb-1">
          Status
        </p>
        <p className="text-lg text-stone-800">
          {STATUS_LABELS[order.status] || order.status}
        </p>
        {order.tracking_number && (
          <a
            href={`https://t.17track.net/en#nums=${encodeURIComponent(
              order.tracking_number,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 text-sm text-amber-800 underline"
          >
            Track shipment ({order.tracking_number})
          </a>
        )}
      </div>

      {!isCancelled && (
        <section className="mb-10">
          <h2 className="text-sm tracking-wider uppercase text-stone-500 mb-4">
            Timeline
          </h2>
          <ol className="space-y-3">
            {STATUS_STEPS.map((step) => {
              const has = events.find((e) => e.status === step);
              const currentIdx = STATUS_STEPS.indexOf(order.status as any);
              const stepIdx = STATUS_STEPS.indexOf(step);
              const reached =
                !!has || (currentIdx >= 0 && stepIdx <= currentIdx);
              return (
                <li key={step} className="flex items-start gap-3">
                  <span
                    className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 ${
                      reached ? "bg-amber-800" : "bg-stone-300"
                    }`}
                  />
                  <div>
                    <p
                      className={`text-sm ${
                        reached ? "text-stone-800" : "text-stone-400"
                      }`}
                    >
                      {STATUS_LABELS[step]}
                    </p>
                    {has && (
                      <p className="text-xs text-stone-500">
                        {formatDate(has.created_at)} · {has.note}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {isCancelled && (
        <section className="mb-10 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">
            This order was cancelled. If you paid online, your refund will
            appear within 3–5 business days.
          </p>
        </section>
      )}

      <section className="mb-10">
        <h2 className="text-sm tracking-wider uppercase text-stone-500 mb-4">
          Items
        </h2>
        <ul className="divide-y divide-stone-100 border border-stone-200 rounded-lg">
          {order.items.map((it, i) => (
            <li
              key={`${it.product_id}-${i}`}
              className="flex justify-between px-4 py-3 text-sm"
            >
              <span className="text-stone-700">
                {it.name} × {it.quantity}
                {it.size && (
                  <span className="block text-xs text-stone-400">
                    Size {it.size}
                  </span>
                )}
              </span>
              <span className="text-stone-800">
                {formatPrice((it.price || 0) * (it.quantity || 1))}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10 p-5 bg-stone-50 rounded-lg border border-stone-200 text-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-stone-600">Subtotal</span>
          <span>{formatPrice(order.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-600">Shipping</span>
          <span>
            {order.shipping === 0 ? "Free" : formatPrice(order.shipping)}
          </span>
        </div>
        {order.discount > 0 && (
          <div className="flex justify-between text-green-700">
            <span>Discount</span>
            <span>−{formatPrice(order.discount)}</span>
          </div>
        )}
        <div className="flex justify-between pt-2 border-t border-stone-200 text-stone-800 text-base">
          <span>Total</span>
          <span>{formatPrice(order.total)}</span>
        </div>
      </section>

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel this order?"
        message="This can't be undone. If you paid online, a refund will be issued within 3–5 business days."
        confirmLabel={cancelling ? "Cancelling…" : "Cancel order"}
        variant="danger"
        onConfirm={handleCancel}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  );
}
