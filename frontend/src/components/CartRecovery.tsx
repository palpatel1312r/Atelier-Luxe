import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import Loader from "./Loader";

export default function CartRecovery() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { clearCart, addItem } = useCart();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api
      .getRecoveredCart(token)
      .then(async (res) => {
        const cart = res.cart;

        // If the current user doesn't match, tell them to log in
        if (!user || user.id !== cart.user_id) {
          toast.info("Please log in to restore your cart.");
          navigate("/login", {
            state: { from: `/cart/recover/${token}` },
            replace: true,
          });
          return;
        }

        // Rehydrate: clear current cart, add each item back
        clearCart();
        for (const it of cart.items || []) {
          try {
            const product = await api.getProduct(it.product_id);
            addItem(product, it.size || "M", it.quantity || 1);
          } catch {
            // Product may have been deleted; skip silently
          }
        }
        toast.success("Cart restored. Happy shopping!");
        navigate("/cart", { replace: true });
      })
      .catch((e) => setError(e.message || "Could not restore your cart"))
      .finally(() => setLoading(false));
  }, [token, user, navigate, toast, clearCart, addItem]);

  if (loading) return <Loader label="Restoring your cart…" />;

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-light text-stone-800 mb-3">
        Couldn't restore your cart
      </h1>
      <p className="text-stone-500 mb-6">{error || "This link is invalid."}</p>
      <Link
        to="/"
        className="inline-block px-6 py-3 text-sm tracking-wider uppercase bg-stone-800 text-white rounded hover:bg-amber-900 transition-colors"
      >
        Back to shop
      </Link>
    </div>
  );
}
