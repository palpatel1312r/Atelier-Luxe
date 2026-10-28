import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import Loader from '../Loader';
import { useToast } from '../../context/ToastContext';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = () =>
    apiFetch<any[]>('/api/users')
      .then(setUsers)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const toggleAdmin = async (id: number, is_admin: boolean) => {
    try {
      await apiFetch(`/api/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_admin }),
      });
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this user?')) return;
    try {
      await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <h1 className="text-xl font-light text-stone-800 mb-6">Users</h1>
      <div className="border border-stone-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wider text-stone-500">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-stone-100">
                <td className="p-3">{u.name}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.is_admin ? 'Admin' : 'Customer'}</td>
                <td className="p-3 space-x-2">
                  <button
                    onClick={() => toggleAdmin(u.id, !u.is_admin)}
                    className="text-amber-900 hover:underline"
                  >
                    {u.is_admin ? 'Revoke admin' : 'Make admin'}
                  </button>
                  <button onClick={() => remove(u.id)} className="text-red-600 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
