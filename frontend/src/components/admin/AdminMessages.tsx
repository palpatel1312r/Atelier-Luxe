import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import ConfirmDialog from '../ConfirmDialog';

interface Message {
  id: number;
  name: string;
  email: string;
  message: string;
  read: boolean;
  created_at: string;
}

export default function AdminMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Message | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch<Message[]>('/api/admin/messages')
      .then(setMessages)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const markRead = async (id: number) => {
    try {
      await apiFetch(`/api/admin/messages/${id}/read`, { method: 'PATCH' });
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
    } catch {
      /* silent — non-critical */
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/admin/messages/${pendingDelete.id}`, { method: 'DELETE' });
      setMessages((prev) => prev.filter((m) => m.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm tracking-wider text-amber-800 uppercase mb-1">Admin</p>
        <h1 className="text-3xl font-light text-stone-800">Contact Messages</h1>
      </div>

      {loading && <p className="text-stone-500">Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`bg-white rounded-lg border p-4 ${
                m.read ? 'border-stone-200' : 'border-amber-300 bg-amber-50/30'
              }`}
            >
              <button
                onClick={() => {
                  setExpanded(expanded === m.id ? null : m.id);
                  if (!m.read) markRead(m.id);
                }}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-stone-800 font-medium">{m.name}</p>
                    <p className="text-sm text-stone-500">{m.email}</p>
                  </div>
                  <p className="text-xs text-stone-400">
                    {new Date(m.created_at).toLocaleString()}
                  </p>
                </div>
              </button>

              {expanded === m.id && (
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <p className="text-sm text-stone-700 whitespace-pre-wrap">{m.message}</p>
                  <div className="mt-4 flex gap-4 text-sm">
                    <a
                      href={`mailto:${m.email}`}
                      className="text-amber-800 hover:underline"
                    >
                      Reply via email
                    </a>
                    <button
                      onClick={() => setPendingDelete(m)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {messages.length === 0 && (
            <p className="text-center text-stone-500 py-12">No messages yet.</p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this message?"
        message={
          pendingDelete
            ? `The message from ${pendingDelete.name} (${pendingDelete.email}) will be permanently deleted. This cannot be undone.`
            : ''
        }
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}