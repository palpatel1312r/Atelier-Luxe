import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
} from "react";
import api from "../api/client";
import { useAuth } from "./AuthContext";

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
    const { user } = useAuth();
    const [count, setCount] = useState(0);

    const refresh = useCallback(() => {
        if (!user || user.role?.name !== "dealer") {
            setCount(0);
            return;
        }

        api.get("/wishlist")
            .then(({ data }) => {
                setCount(data.data?.length || 0);
            })
            .catch(() => setCount(0));
    }, [user?.id, user?.role?.name]);
    useEffect(() => {
        refresh();
    }, [refresh]);

    return (
        <WishlistContext.Provider value={{ count, refresh }}>
            {children}
        </WishlistContext.Provider>
    );
}

export function useWishlistCount() {
    const context = useContext(WishlistContext);
    if (!context) {
        throw new Error(
            "useWishlistCount must be used within a WishlistProvider",
        );
    }
    return context;
}
