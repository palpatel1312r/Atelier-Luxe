import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import Loader from "../Loader";
import { useToast } from "../../context/ToastContext";
import { formatPrice } from "../../lib/format";

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    code: "",
    type: "percent",
    value: "",
    min_order: "0",
    max_uses: "100",
  });
  const toast = useToast();

  const load = () =>
    apiFetch<any[]>("/api/admin/coupons")
      .then(setCoupons)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/api/admin/coupons", {
        method: "POST",
        body: JSON.stringify({
          code: form.code,
          type: form.type,
          value: Number(form.value),
          min_order: Number(form.min_order),
          max_uses: Number(form.max_uses),
        }),
      });
      setForm({
        code: "",
        type: "percent",
        value: "",
        min_order: "0",
        max_uses: "100",
      });
      load();
      toast.success("Coupon created");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete coupon?")) return;
    try {
      await apiFetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <h1 className="text-xl font-light text-stone-800 mb-6">Coupons</h1>

      <form
        onSubmit={create}
        className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8"
      >
        <input
          placeholder="CODE"
          value={form.code}
          onChange={(e) =>
            setForm({ ...form, code: e.target.value.toUpperCase() })
          }
          className="border border-stone-200 rounded px-3 py-2 text-sm"
          required
        />
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          className="border border-stone-200 rounded px-3 py-2 text-sm"
        >
          <option value="percent">Percent</option>
          <option value="fixed">Fixed ₹</option>
        </select>
        <input
          type="number"
          placeholder="Value"
          value={form.value}
          onChange={(e) => setForm({ ...form, value: e.target.value })}
          className="border border-stone-200 rounded px-3 py-2 text-sm"
          required
        />
        <input
          type="number"
          placeholder="Min order"
          value={form.min_order}
          onChange={(e) => setForm({ ...form, min_order: e.target.value })}
          className="border border-stone-200 rounded px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="bg-stone-800 text-white rounded text-sm hover:bg-amber-900"
        >
          Add
        </button>
      </form>

      <div className="border border-stone-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wider text-stone-500">
            <tr>
              <th className="p-3">Code</th>
              <th className="p-3">Type</th>
              <th className="p-3">Value</th>
              <th className="p-3">Used</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-t border-stone-100">
                <td className="p-3 font-medium">{c.code}</td>
                <td className="p-3">{c.type}</td>
                <td className="p-3">
                  {c.type === "percent" ? `${c.value}%` : `$${c.value}`}
                </td>
                <td className="p-3">
                  {c.used_count}/{c.max_uses || "∞"}
                </td>
                <td className="p-3">
                  <button
                    onClick={() => remove(c.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-stone-400">
                  No coupons
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
