import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import Loader from '../Loader';
import { useToast } from '../../context/ToastContext';

export default function AdminReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = () =>
    apiFetch<any[]>('/api/admin/reviews')
      .then(setReviews)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const toggle = async (id: number, approved: boolean) => {
    try {
      await apiFetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ approved }),
      });
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this review?')) return;
    try {
      await apiFetch(`/api/admin/reviews/${id}`, { method: 'DELETE' });
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <h1 className="text-xl font-light text-stone-800 mb-6">Reviews</h1>
      <div className="border border-stone-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wider text-stone-500">
            <tr>
              <th className="p-3">Product</th>
              <th className="p-3">User</th>
              <th className="p-3">Rating</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((r) => (
              <tr key={r.id} className="border-t border-stone-100">
                <td className="p-3">{r.product_name || r.product_id}</td>
                <td className="p-3">{r.user_name}</td>
                <td className="p-3">{r.rating}/5</td>
                <td className="p-3">{r.approved ? 'Approved' : 'Hidden'}</td>
                <td className="p-3 space-x-2">
                  <button
                    onClick={() => toggle(r.id, !r.approved)}
                    className="text-amber-900 hover:underline"
                  >
                    {r.approved ? 'Hide' : 'Approve'}
                  </button>
                  <button onClick={() => remove(r.id)} className="text-red-600 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {reviews.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-stone-400">
                  No reviews yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
