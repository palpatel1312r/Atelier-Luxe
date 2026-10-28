import { createContext, useContext, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const raw = localStorage.getItem("auth_user");
        return raw ? JSON.parse(raw) : null;
    });
    const [loading, setLoading] = useState(false);

    const login = (token, userData) => {
        localStorage.setItem("auth_token", token);
        localStorage.setItem("auth_user", JSON.stringify(userData));
        setUser(userData);
    };
    const logout = async () => {
        try {
            await api.post("/logout");
        } catch (error) {
            if (import.meta.env.DEV)
                console.debug("Logout API call failed:", error?.message);
        }
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        setUser(null);
        window.location.href = "/login";
    };

    const isAdmin = () =>
        ["super_admin", "saas_admin"].includes(user?.role?.name);
    const isDealer = () => user?.role?.name === "dealer";

    return (
        <AuthContext.Provider
            value={{
                user,
                login,
                logout,
                loading,
                setLoading,
                isAdmin,
                isDealer,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
