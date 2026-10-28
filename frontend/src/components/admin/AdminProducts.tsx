import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../lib/api";
import ConfirmDialog from "../ConfirmDialog";
import { useToast } from "../../context/ToastContext";
import { PLACEHOLDER, resolveImageUrl } from "../../lib/images";
import { minPrice, maxPrice } from "../../lib/pricing";
import { formatPrice } from "../../lib/format";

interface AdminProduct {
  id: number;
  name: string;
  price: number;
  image: string;
  images?: string[];
  color: string;
  category: string;
  sizes: string[];
  size_prices?: Record<string, number>; // 👈 new
  is_active: boolean;
}

export default function AdminProducts() {
  const navigate = useNavigate();
  const toast = useToast();

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pendingDelete, setPendingDelete] = useState<AdminProduct | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch<AdminProduct[]>("/api/admin/products")
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const toggleActive = async (p: AdminProduct) => {
    const next = !p.is_active;
    setProducts((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, is_active: next } : x)),
    );
    try {
      await apiFetch(`/api/admin/products/${p.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: next }),
      });
      toast.success(`"${p.name}" ${next ? "activated" : "deactivated"}.`);
    } catch (err: any) {
      // revert on failure
      setProducts((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, is_active: !next } : x)),
      );
      toast.error(err.message || "Failed to update status.");
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/admin/products/${pendingDelete.id}`, {
        method: "DELETE",
      });
      toast.success(`"${pendingDelete.name}" deleted.`);
      setPendingDelete(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete product.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="text-sm tracking-wider text-amber-800 uppercase mb-1">
            Admin
          </p>
          <h1 className="text-3xl font-light text-stone-800">Products</h1>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => navigate("/admin/products/import-export")}
            className="text-stone-700 border border-stone-300 px-5 py-3 text-sm tracking-[0.15em] uppercase hover:border-amber-800 hover:text-amber-900 transition-colors"
          >
            Import / Export
          </button>
          <button
            onClick={() => navigate("/admin/products/new")}
            className="bg-stone-800 text-white px-6 py-3 text-sm tracking-[0.15em] uppercase hover:bg-amber-900 transition-colors"
          >
            + Add Product
          </button>
        </div>
      </div>

      {loading && <p className="text-stone-500">Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left p-4">Image</th>
                <th className="text-left p-4">Name</th>
                <th className="text-left p-4">Category</th>
                <th className="text-left p-4">Price</th>
                <th className="text-left p-4">Sizes</th>
                <th className="text-center p-4">Active</th>
                <th className="text-right p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-stone-100">
                  <td className="p-4">
                    <img
                      src={resolveImageUrl(p.image)}
                      alt={p.name}
                      className="w-12 h-16 object-cover rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = PLACEHOLDER;
                      }}
                    />
                  </td>
                  <td className="p-4 text-stone-800 font-medium">{p.name}</td>
                  <td className="p-4 text-stone-500">{p.category}</td>
                  <td className="p-4 text-stone-800">
                    {minPrice(p as any) === maxPrice(p as any)
                      ? formatPrice(p.price)
                      : `${formatPrice(minPrice(p as any))} – ${formatPrice(maxPrice(p as any))}`}
                    {(p as any).is_on_sale && (
                      <span className="ml-2 text-[10px] uppercase tracking-wider bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full">
                        SALE −{(p as any).discount_pct}%
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-stone-500 text-xs">
                    {Array.isArray(p.sizes) ? p.sizes.join(", ") : "—"}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => toggleActive(p)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        p.is_active ? "bg-green-500" : "bg-stone-300"
                      }`}
                      aria-label={p.is_active ? "Deactivate" : "Activate"}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          p.is_active ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="p-4 text-right space-x-3">
                    <button
                      onClick={() => navigate(`/admin/products/${p.id}/edit`)}
                      className="text-amber-800 hover:underline text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setPendingDelete(p)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && (
            <p className="p-8 text-center text-stone-500">No products yet.</p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this product?"
        message={
          pendingDelete
            ? `"${pendingDelete.name}" will be permanently deleted, along with its sizes and any references. This cannot be undone.`
            : ""
        }
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
