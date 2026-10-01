import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

interface Stats {
  products: number;
  orders: number;
  users: number;
  unreadMessages: number;
  revenue: number;
}

interface AdminDashboardProps {
  onNavigate: (tab: 'dashboard' | 'products' | 'orders' | 'messages') => void;
}

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Stats>('/api/admin/stats')
      .then(setStats)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!stats) return <div className="p-8 text-stone-500">Loading dashboard...</div>;

  const cards = [
    { label: 'Products', value: stats.products, action: () => onNavigate('products'), color: 'bg-amber-50 text-amber-800' },
    { label: 'Orders', value: stats.orders, action: () => onNavigate('orders'), color: 'bg-blue-50 text-blue-800' },
    { label: 'Customers', value: stats.users, action: () => onNavigate('dashboard'), color: 'bg-green-50 text-green-800' },
    { label: 'Unread Messages', value: stats.unreadMessages, action: () => onNavigate('messages'), color: 'bg-red-50 text-red-800' }
  ];

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm tracking-wider text-amber-800 uppercase mb-1">Admin</p>
        <h1 className="text-3xl font-light text-stone-800">Dashboard</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <button
            key={c.label}
            onClick={c.action}
            className={`text-left p-6 rounded-lg border border-stone-200 hover:border-stone-400 transition-colors ${c.color}`}
          >
            <p className="text-xs tracking-wider uppercase mb-2 opacity-80">{c.label}</p>
            <p className="text-3xl font-light">{c.value}</p>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-stone-200 p-6">
        <p className="text-sm tracking-wider text-stone-500 uppercase mb-1">Total Revenue</p>
        <p className="text-4xl font-light text-stone-800">${Number(stats.revenue ?? 0).toFixed(2)}</p>
      </div>
    </div>
  );
}