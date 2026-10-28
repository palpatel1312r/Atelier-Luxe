import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
} from "react";
import api from "../api/client";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

export function CartProvider({ children }) {
    const { user } = useAuth();
    const [count, setCount] = useState(0);

    const refresh = useCallback(() => {
        if (!user || user.role?.name !== "dealer") {
            setCount(0);
            return;
        }

        api.get("/cart")
            .then(({ data }) => {
                const items = data.data?.items || [];
                const totalQty = items.reduce(
                    (sum, item) => sum + (item.quantity || 0),
                    0,
                );
                setCount(totalQty);
            })
            .catch(() => setCount(0));
    }, [user?.id, user?.role?.name]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return (
        <CartContext.Provider value={{ count, refresh }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCartCount() {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error("useCartCount must be used within a CartProvider");
    }
    return context;
}
