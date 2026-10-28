// src/context/WishlistContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { Product } from "../types";
import { useAuth } from "./AuthContext";
import { api } from "../lib/api";

const STORAGE_KEY = "atelier_wishlist";

interface WishlistContextValue {
  items: Product[];
  toggle: (product: Product) => Promise<void>;
  has: (productId: number) => boolean;
  remove: (productId: number) => Promise<void>;
  clear: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(
  undefined,
);

/** Normalize API rows → Product[] */
function toProducts(rows: any[]): Product[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => (row?.product ? row.product : row))
    .filter((p) => p && p.id != null);
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // Only hydrate local wishlist when logged in. Guests see nothing.
  const [localItems, setLocalItems] = useState<Product[]>(() => {
    if (!user) return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [serverItems, setServerItems] = useState<Product[]>([]);

  // Persist local items only while logged in; remove key when logged out.
  useEffect(() => {
    try {
      if (user && localItems.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(localItems));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }, [localItems, user]);

  // Wipe wishlist state on logout — regardless of how logout was triggered.
  useEffect(() => {
    if (!user) {
      setServerItems([]);
      setLocalItems([]);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  }, [user]);

  const loadServer = useCallback(async () => {
    if (!user) {
      setServerItems([]);
      return;
    }
    try {
      // Merge guest items once (if any survived the login transition)
      if (localItems.length > 0) {
        try {
          await api.mergeWishlist(localItems.map((p) => p.id));
        } catch {
          // merge optional — ignore if route missing
        }
        setLocalItems([]);
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {}
      }

      const rows = await api.getWishlist();
      setServerItems(toProducts(rows));
    } catch (err) {
      console.error("Wishlist load failed:", err);
      setServerItems([]);
    }
  }, [user]); // intentionally not localItems — avoid loop

  useEffect(() => {
    loadServer();
  }, [loadServer]);

  // Only logged-in users have a wishlist
  const items = user ? serverItems : [];

  const has = (productId: number) =>
    items.some((p) => Number(p.id) === Number(productId));

  const toggle = async (product: Product) => {
    if (!user) return; // callers should prompt login before reaching here

    const id = Number(product.id);
    const exists = has(id);

    // Optimistic update
    setServerItems((prev) =>
      exists ? prev.filter((p) => Number(p.id) !== id) : [...prev, product],
    );

    try {
      if (exists) {
        await api.removeWishlist(id);
      } else {
        await api.addWishlist(id);
      }
    } catch (err: any) {
      // Revert
      setServerItems((prev) =>
        exists ? [...prev, product] : prev.filter((p) => Number(p.id) !== id),
      );
      console.error(err);
      throw err;
    }
  };

  const remove = async (productId: number) => {
    if (!user) return;
    const id = Number(productId);
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
      setServerItems([]);
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
  if (!ctx)
    throw new Error("useWishlist must be used inside <WishlistProvider>");
  return ctx;
}
