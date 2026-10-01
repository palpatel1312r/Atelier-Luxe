// src/context/WishlistContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import { Product } from '../types';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';

const STORAGE_KEY = 'atelier_wishlist';

interface WishlistContextValue {
  items: Product[];
  toggle: (product: Product) => Promise<void>;
  has: (productId: number) => boolean;
  remove: (productId: number) => Promise<void>;
  clear: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

/** Normalize API rows → Product[] */
function toProducts(rows: any[]): Product[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => (row?.product ? row.product : row))
    .filter((p) => p && p.id != null);
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [localItems, setLocalItems] = useState<Product[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [serverItems, setServerItems] = useState<Product[]>([]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localItems));
  }, [localItems]);

  const loadServer = useCallback(async () => {
    if (!user) {
      setServerItems([]);
      return;
    }
    try {
      // Merge guest items once
      if (localItems.length > 0) {
        try {
          await api.post('/wishlist/merge', {
            productIds: localItems.map((p) => p.id),
          });
        } catch {
          // merge optional — ignore if route missing
        }
        setLocalItems([]);
        localStorage.removeItem(STORAGE_KEY);
      }

      const rows = await api.getWishlist();
      setServerItems(toProducts(rows));
    } catch (err) {
      console.error('Wishlist load failed:', err);
      setServerItems([]);
    }
  }, [user]); // intentionally not localItems — avoid loop

  useEffect(() => {
    loadServer();
  }, [loadServer]);

  const items = user ? serverItems : localItems;

  const has = (productId: number) =>
    items.some((p) => Number(p.id) === Number(productId));

  const toggle = async (product: Product) => {
    const id = Number(product.id);
    const exists = has(id);

    if (!user) {
      setLocalItems((prev) =>
        exists
          ? prev.filter((p) => Number(p.id) !== id)
          : [...prev, product]
      );
      return;
    }

    // Optimistic update
    setServerItems((prev) =>
      exists
        ? prev.filter((p) => Number(p.id) !== id)
        : [...prev, product]
    );

    try {
      if (exists) {
        await api.removeWishlist(id); // DELETE /wishlist/{id}
      } else {
        await api.addWishlist(id); // POST /wishlist  { product_id }
      }
    } catch (err: any) {
      // Revert
      setServerItems((prev) =>
        exists
          ? [...prev, product]
          : prev.filter((p) => Number(p.id) !== id)
      );
      console.error(err);
      alert(err.message || 'Could not update wishlist. Are you logged in?');
    }
  };

  const remove = async (productId: number) => {
    const id = Number(productId);
    if (!user) {
      setLocalItems((prev) => prev.filter((p) => Number(p.id) !== id));
      return;
    }
    setServerItems((prev) => prev.filter((p) => Number(p.id) !== id));
    try {
      await api.removeWishlist(id);
    } catch (err) {
      console.error(err);
      await loadServer();
    }
  };

  const clear = async () => {
    if (!user) {
      setLocalItems([]);
      return;
    }
    const snapshot = [...serverItems];
    setServerItems([]);
    try {
      await Promise.all(snapshot.map((p) => api.removeWishlist(Number(p.id))));
    } catch (err) {
      console.error(err);
      await loadServer();
    }
  };

  return (
    <WishlistContext.Provider value={{ items, toggle, has, remove, clear }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used inside <WishlistProvider>');
  return ctx;
}