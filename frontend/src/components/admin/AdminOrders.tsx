import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

interface OrderItem {
  product_id: number;
  name: string;
  qty: number;
  price: number;
}

interface Order {
  id: number;
  created_at: string;
  status: string;
  total: number;
  customer_name: string;
  customer_email: string;
  shipping_address: string;
  items: OrderItem[] | null;
}

const STATUSES = ['pending', 'processing', 'shipped', 'completed', 'cancelled'];

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    apiFetch<Order[]>('/api/admin/orders')
      .then(setOrders)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const updateStatus = async (id: number, status: string) => {
    try {
      await apiFetch(`/api/admin/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm tracking-wider text-amber-800 uppercase mb-1">Admin</p>
        <h1 className="text-3xl font-light text-stone-800">Orders</h1>
      </div>

      {loading && <p className="text-stone-500">Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="space-y-3">
          {orders.map((order) => {
            const items = Array.isArray(order.items) ? order.items : [];
            const total = Number(order.total ?? 0);

            return (
              <div key={order.id} className="bg-white rounded-lg border border-stone-200">
                <button
                  onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div>
                    <p className="text-stone-800 font-medium">Order #{order.id}</p>
                    <p className="text-sm text-stone-500">
                      {order.customer_name} · {order.customer_email}
                    </p>
                    <p className="text-xs text-stone-400 mt-1">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-stone-800 font-medium">${total.toFixed(2)}</span>
                    <span
                      className={`text-xs uppercase tracking-wider px-3 py-1 rounded-full ${
                        order.status === 'completed' ? 'bg-green-100 text-green-800' :
                        order.status === 'shipped'   ? 'bg-blue-100 text-blue-800' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </button>

                {expanded === order.id && (
                  <div className="border-t border-stone-100 p-4 bg-stone-50">
                    <h4 className="text-xs tracking-wider uppercase text-stone-500 mb-3">
                      Items
                    </h4>
                    {items.length === 0 ? (
                      <p className="text-sm text-stone-500">No items.</p>
                    ) : (
                      <ul className="space-y-2 mb-4">
                        {items.map((it, idx) => (
                          <li key={idx} className="flex justify-between text-sm">
                            <span className="text-stone-700">
                              {it.name} × {it.qty}
                            </span>
                            <span className="text-stone-800">
                              ${(Number(it.price) * it.qty).toFixed(2)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {order.shipping_address && (
                      <div className="mb-4">
                        <h4 className="text-xs tracking-wider uppercase text-stone-500 mb-2">
                          Shipping
                        </h4>
                        <p className="text-sm text-stone-700 whitespace-pre-line">
                          {order.shipping_address}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <label className="text-xs uppercase tracking-wider text-stone-500">
                        Change status:
                      </label>
                      <select
                        value={order.status}
                        onChange={(e) => updateStatus(order.id, e.target.value)}
                        className="px-3 py-2 border border-stone-200 rounded text-sm"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {orders.length === 0 && (
            <p className="text-center text-stone-500 py-12">No orders yet.</p>
          )}
        </div>
      )}
    </div>
  );
}