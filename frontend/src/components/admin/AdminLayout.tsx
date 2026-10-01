import { NavLink, Outlet, useNavigate } from 'react-router-dom';

export type AdminTab =
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'orders'
  | 'messages';

const TABS: { to: string; label: string; match?: string[] }[] = [
  { to: '/admin',            label: 'Dashboard',  match: ['/admin'] },
  { to: '/admin/products',   label: 'Products',   match: ['/admin/products', '/admin/products/new', '/admin/products/:id/edit'] },
  { to: '/admin/categories', label: 'Categories', match: ['/admin/categories', '/admin/categories/new', '/admin/categories/:id/edit'] },
  { to: '/admin/orders',     label: 'Orders',     match: ['/admin/orders', '/admin/orders/:id'] },
  { to: '/admin/messages',   label: 'Messages',   match: ['/admin/messages'] },
];

export default function AdminLayout() {
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-6">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/admin'}
              className={({ isActive }) =>
                `text-sm tracking-wider uppercase pb-1 border-b-2 transition-colors ${
                  isActive
                    ? 'border-amber-800 text-amber-800'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
        <button
          onClick={() => navigate('/')}
          className="text-sm tracking-wider uppercase text-stone-500 hover:text-amber-800"
        >
          ← Back to store
        </button>
      </div>

      <Outlet />
    </div>
  );
}