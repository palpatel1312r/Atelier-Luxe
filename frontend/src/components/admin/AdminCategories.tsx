import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import ConfirmDialog from '../ConfirmDialog';
import { useToast } from '../../context/ToastContext';

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  active: boolean;
  products_count?: number;
}

const empty = { name: '', description: '', sort_order: 0, active: true };

export default function AdminCategories() {
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch<Category[]>('/api/admin/categories')
      .then(setCategories)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const resetForm = () => {
    setEditing(null);
    setForm({ ...empty });
  };

  const startEdit = (cat: Category) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      description: cat.description ?? '',
      sort_order: cat.sort_order,
      active: cat.active,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/api/admin/categories/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
        toast.success(`"${form.name}" updated.`);
      } else {
        await apiFetch('/api/admin/categories', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        toast.success(`"${form.name}" created.`);
      }
      resetForm();
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/admin/categories/${pendingDelete.id}`, { method: 'DELETE' });
      toast.success(`"${pendingDelete.name}" deleted.`);
      setPendingDelete(null);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800';

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm tracking-wider text-amber-800 uppercase mb-1">Admin</p>
        <h1 className="text-3xl font-light text-stone-800">Categories</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-1 bg-white border border-stone-200 rounded-lg p-6 space-y-4 self-start"
        >
          <h2 className="text-lg text-stone-800 font-medium">
            {editing ? 'Edit Category' : 'New Category'}
          </h2>

          <div>
            <label className="block text-sm text-stone-700 mb-1">Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-stone-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-stone-700 mb-1">Sort order</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-stone-700 mb-1">Active</label>
              <select
                value={form.active ? 'yes' : 'no'}
                onChange={(e) => setForm({ ...form, active: e.target.value === 'yes' })}
                className={inputClass}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-stone-800 text-white px-6 py-3 text-sm tracking-[0.15em] uppercase hover:bg-amber-900 transition-colors disabled:bg-stone-400"
            >
              {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
            </button>
            {editing && (
              <button
                type="button"
                onClick={resetForm}
                className="text-stone-600 px-6 py-3 text-sm tracking-[0.15em] uppercase hover:text-stone-900"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* LIST */}
        <div className="lg:col-span-2">
          {loading && <p className="text-stone-500">Loading…</p>}
          {error && <p className="text-red-600">{error}</p>}

          {!loading && !error && (
            <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-stone-600 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left p-4">Name</th>
                    <th className="text-left p-4">Slug</th>
                    <th className="text-left p-4">Sort</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-right p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id} className="border-t border-stone-100">
                      <td className="p-4 text-stone-800 font-medium">{c.name}</td>
                      <td className="p-4 text-stone-500 font-mono text-xs">{c.slug}</td>
                      <td className="p-4 text-stone-500">{c.sort_order}</td>
                      <td className="p-4">
                        <span
                          className={`text-xs uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            c.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-stone-100 text-stone-500'
                          }`}
                        >
                          {c.active ? 'Active' : 'Hidden'}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-3">
                        <button
                          onClick={() => startEdit(c)}
                          className="text-amber-800 hover:underline text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setPendingDelete(c)}
                          className="text-red-600 hover:underline text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {categories.length === 0 && (
                <p className="p-8 text-center text-stone-500">No categories yet.</p>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this category?"
        message={
          pendingDelete
            ? `"${pendingDelete.name}" will be permanently deleted. Products in this category must be reassigned first.`
            : ''
        }
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}