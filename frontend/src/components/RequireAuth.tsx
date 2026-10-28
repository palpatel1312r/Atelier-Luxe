import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-stone-500">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-stone-500">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.is_admin) {
    return (
      <div className="max-w-md mx-auto py-24 text-center">
        <h1 className="text-2xl text-stone-800 mb-3">Access Denied</h1>
        <p className="text-stone-500 mb-6">This area is for administrators only.</p>
        <a
          href="/"
          className="inline-block bg-stone-800 text-white px-6 py-3 text-sm tracking-[0.15em] uppercase hover:bg-amber-900 transition-colors"
        >
          Back to Store
        </a>
      </div>
    );
  }

  return <>{children}</>;
}