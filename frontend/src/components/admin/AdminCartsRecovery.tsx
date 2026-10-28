import { useState } from "react";
import { apiFetch } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { formatPrice } from "../../lib/format";

export default function AdminCartsRecovery() {
  const toast = useToast();
  const [preview, setPreview] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const loadPreview = async () => {
    try {
      const data = await apiFetch<any>("/api/admin/carts/abandoned-preview");
      setPreview(data);
    } catch (e: any) {
      toast.error(e.message || "Failed to load preview");
    }
  };

  const runRecovery = async () => {
    if (
      !confirm(
        "Send recovery emails to all eligible carts? This will email real customers.",
      )
    )
      return;
    setRunning(true);
    try {
      const data = await apiFetch<any>("/api/admin/carts/run-recovery", {
        method: "POST",
      });
      setLastResult(data);
      toast.success(`Sent ${data.sent} email(s).`);
      loadPreview();
    } catch (e: any) {
      toast.error(e.message || "Failed to run recovery");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm tracking-wider text-amber-800 uppercase mb-1">
          Admin
        </p>
        <h1 className="text-3xl font-light text-stone-800">
          Abandoned Cart Recovery
        </h1>
        <p className="text-sm text-stone-500 mt-2 max-w-2xl">
          Carts are eligible for a reminder once they've been idle for 4+ hours.
          Reminders are sent automatically every hour by the background job. You
          can preview and manually trigger below.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={loadPreview}
          className="border border-stone-300 text-stone-700 px-5 py-2.5 text-sm tracking-wider uppercase rounded hover:border-amber-800 hover:text-amber-900 transition-colors"
        >
          Load eligible carts
        </button>
        <button
          onClick={runRecovery}
          disabled={running}
          className="bg-stone-800 text-white px-5 py-2.5 text-sm tracking-wider uppercase rounded hover:bg-amber-900 transition-colors disabled:bg-stone-400"
        >
          {running ? "Sending…" : "Send recovery emails now"}
        </button>
      </div>

      {preview && (
        <section className="bg-white rounded-lg border border-stone-200 p-5 mb-6">
          <h2 className="text-sm tracking-wider uppercase text-stone-500 mb-3">
            Eligible now — {preview.scanned} cart
            {preview.scanned === 1 ? "" : "s"}
          </h2>
          {preview.preview.length === 0 ? (
            <p className="text-sm text-stone-500">No eligible carts.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-stone-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left p-2">Cart ID</th>
                  <th className="text-left p-2">User</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-right p-2">Items</th>
                  <th className="text-right p-2">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {preview.preview.map((row: any) => (
                  <tr key={row.cart_id} className="border-t border-stone-100">
                    <td className="p-2 text-stone-800">#{row.cart_id}</td>
                    <td className="p-2 text-stone-700">#{row.user_id}</td>
                    <td className="p-2 text-stone-500 truncate max-w-[220px]">
                      {row.email}
                    </td>
                    <td className="p-2 text-right text-stone-700">
                      {row.item_count}
                    </td>
                    <td className="p-2 text-right text-stone-800">
                      {formatPrice(row.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {lastResult && (
        <section className="bg-white rounded-lg border border-stone-200 p-5">
          <h2 className="text-sm tracking-wider uppercase text-stone-500 mb-3">
            Last run
          </h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs uppercase tracking-wider text-stone-500">
                Scanned
              </p>
              <p className="text-2xl font-light text-stone-800">
                {lastResult.scanned}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-stone-500">
                Sent
              </p>
              <p className="text-2xl font-light text-green-700">
                {lastResult.sent}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-stone-500">
                Failed
              </p>
              <p className="text-2xl font-light text-red-600">
                {lastResult.failed}
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
