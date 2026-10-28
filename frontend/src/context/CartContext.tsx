import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { CartItem, Product } from "../types";
import { useAuth } from "./AuthContext";
import { priceForSize } from "../lib/pricing";
import { api } from "../lib/api";

const CART_KEY = "atelier_cart";

interface CartContextValue {
  items: CartItem[];
  buyNowItem: CartItem | null;
  itemCount: number;
  subtotal: number;
  addItem: (product: Product, size: string, quantity?: number) => void;
  addMany: (
    entries: Array<{ product: Product; size: string; quantity: number }>,
  ) => void;
  removeItem: (productId: number, size: string) => void;
  updateQuantity: (productId: number, size: string, quantity: number) => void;
  clearCart: () => void;
  setBuyNow: (item: CartItem | null) => void;
  checkoutItems: CartItem[];
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [items, setItems] = useState<CartItem[]>(() =>
    user ? loadCart() : [],
  );
  const [buyNowItem, setBuyNowItem] = useState<CartItem | null>(null);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setBuyNowItem(null);
      try {
        localStorage.removeItem(CART_KEY);
      } catch {}
    }
  }, [user]);

  // Week 8 — sync to backend for abandoned-cart recovery
  useEffect(() => {
    if (!user) return;
    const t = window.setTimeout(() => {
      api
        .syncCart(
          items.map((i) => ({
            product_id: i.product.id,
            name: i.product.name,
            price: i.product.price,
            quantity: i.quantity,
            size: i.selectedSize,
            image: i.product.image,
          })),
        )
        .catch(() => {
          /* silent — sync is best-effort */
        });
    }, 800); // debounce 800ms
    return () => window.clearTimeout(t);
  }, [items, user]);

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(CART_KEY, JSON.stringify(items));
      } else {
        localStorage.removeItem(CART_KEY);
      }
    } catch {}
  }, [items, user]);

  const addItem = useCallback(
    (product: Product, size: string, quantity = 1) => {
      setItems((prev) => {
        const idx = prev.findIndex(
          (i) => i.product.id === product.id && i.selectedSize === size,
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            quantity: next[idx].quantity + quantity,
          };
          return next;
        }
        return [...prev, { product, quantity, selectedSize: size }];
      });
    },
    [],
  );

  const addMany = useCallback(
    (entries: Array<{ product: Product; size: string; quantity: number }>) => {
      setItems((prev) => {
        const next = [...prev];
        for (const { product, size, quantity } of entries) {
          const idx = next.findIndex(
            (it) => it.product.id === product.id && it.selectedSize === size,
          );
          if (idx >= 0) {
            next[idx] = {
              ...next[idx],
              quantity: next[idx].quantity + quantity,
            };
          } else {
            next.push({ product, quantity, selectedSize: size });
          }
        }
        return next;
      });
    },
    [],
  );

  const removeItem = useCallback((productId: number, size: string) => {
    setItems((prev) =>
      prev.filter(
        (i) => !(i.product.id === productId && i.selectedSize === size),
      ),
    );
  }, []);

  const updateQuantity = useCallback(
    (productId: number, size: string, quantity: number) => {
      if (quantity <= 0) {
        setItems((prev) =>
          prev.filter(
            (i) => !(i.product.id === productId && i.selectedSize === size),
          ),
        );
        return;
      }
      setItems((prev) =>
        prev.map((i) =>
          i.product.id === productId && i.selectedSize === size
            ? { ...i, quantity }
            : i,
        ),
      );
    },
    [],
  );

  const clearCart = useCallback(() => {
    setItems([]);
    setBuyNowItem(null);
    try {
      localStorage.removeItem(CART_KEY);
    } catch {}
  }, []);

  const setBuyNow = useCallback((item: CartItem | null) => {
    setBuyNowItem(item);
  }, []);

  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce(
    (s, i) => s + priceForSize(i.product, i.selectedSize) * i.quantity,
    0,
  );
  const checkoutItems = buyNowItem ? [buyNowItem] : items;

  return (
    <CartContext.Provider
      value={{
        items,
        buyNowItem,
        itemCount,
        subtotal,
        addItem,
        addMany,
        removeItem,
        updateQuantity,
        clearCart,
        setBuyNow,
        checkoutItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
