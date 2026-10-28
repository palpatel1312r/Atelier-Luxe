import { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWishlistCount } from "../hooks/useWishlistCount";
import { useCartCount } from "../hooks/useCartCount";
import api from "../api/client";
import "../styles/header.css";
import Icon from "./ui/Icon";
import ThemeSwitcher from "./ui/ThemeSwitcher";
import ProductSearch from "./ProductSearch";

const CACHE_KEYS = {
    LOGO: "app_logo",
    CATEGORIES: "app_categories",
};

const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
const getCachedData = (key) => {
    try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp > CACHE_EXPIRY) {
            localStorage.removeItem(key);
            return null;
        }
        return data;
    } catch {
        return null;
    }
};

const setCachedData = (key, data) => {
    try {
        localStorage.setItem(
            key,
            JSON.stringify({
                data,
                timestamp: Date.now(),
            }),
        );
    } catch {}
};

export default function Header({ searchQuery = "", onSearchChange, onProductSearch }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [showProfile, setShowProfile] = useState(false);
    const [showNotifs, setShowNotifs] = useState(false);
    const { count: wishlistCount } = useWishlistCount();
    const { count: cartCount } = useCartCount();
    const [logo, setLogo] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const notifRef = useRef(null);
    const profileRef = useRef(null);
    const isAdmin =
        user?.role?.name === "super_admin" || user?.role?.name === "saas_admin";

    const dashboardLink = isAdmin ? "/admin/dashboard" : "/dashboard";
    const notificationsLink = isAdmin
        ? "/admin/notifications"
        : "/notifications";

    useEffect(() => {
        const cachedLogo = getCachedData(CACHE_KEYS.LOGO);
        if (cachedLogo) {
            setLogo(cachedLogo);
            fetchLogo();
            return;
        }
        fetchLogo();

        async function fetchLogo() {
            try {
                const { data } = await api.get("/settings/logo");
                setLogo(data.logo);
                setCachedData(CACHE_KEYS.LOGO, data.logo);
            } catch {}
        }
    }, []);

    useEffect(() => {
        if (!user || isAdmin) return;

        const loadNotifications = () => {
            api.get("/notifications", { params: { per_page: 10 } })
                .then(({ data }) => {
                    setNotifications(data.data || []);
                    setUnreadCount(data.unread_count ?? data.meta?.unread ?? 0);
                })
                .catch(() => {
                    setNotifications([]);
                    setUnreadCount(0);
                });
        };

        loadNotifications();
        const interval = setInterval(loadNotifications, 60000);
        return () => clearInterval(interval);
    }, [user, isAdmin]);

    // ---------- Click outside to close ----------
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setShowNotifs(false);
            }
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setShowProfile(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ---------- Mark single as read ----------
    const markRead = async (id) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (err) {
            console.error("Failed to mark as read:", err);
        }
    };

    // ---------- Mark ALL as read ----------
    const markAllRead = async () => {
        try {
            await api.patch("/notifications/read-all");
            setNotifications((prev) =>
                prev.map((n) => ({ ...n, is_read: true })),
            );
            setUnreadCount(0);
        } catch (err) {
            console.error("Failed to mark all as read:", err);
        }
    };

    // ---------- Clear ALL notifications ----------
    const clearAll = async () => {
        if (!window.confirm("Clear all notifications?")) return;
        try {
            await api.delete("/notifications");
            setNotifications([]);
            setUnreadCount(0);
        } catch (err) {
            console.error("Failed to clear notifications:", err);
        }
    };

    // ---------- Click notification → redirect ----------
    const handleNotificationClick = async (n) => {
        if (!n.is_read) await markRead(n.id);
        setShowNotifs(false);

        let productId = null;
        let orderId = null;

        if (typeof n.data === "string") {
            try {
                const parsed = JSON.parse(n.data);
                productId =
                    parsed?.product_id || parsed?.productId || parsed?.id;
                orderId = parsed?.order_id || parsed?.orderId;
            } catch (e) {}
        } else if (typeof n.data === "object" && n.data !== null) {
            productId = n.data?.product_id || n.data?.productId || n.data?.id;
            orderId = n.data?.order_id || n.data?.orderId;
        }

        if (!productId) {
            productId =
                n.product_id || n.productId || n.resource_id || n.target_id;
        }

        const type = n.type || n.notification_type || n.category;
        const title = n.title || "";
        const message = n.message || "";

        if (
            productId &&
            (type === "new_product" ||
                type === "product_created" ||
                type === "product_added" ||
                title?.toLowerCase().includes("new product") ||
                message?.toLowerCase().includes("product"))
        ) {
            navigate(`/products/${productId}`);
            return;
        }

        if (
            orderId &&
            (type === "order_update" ||
                type === "order_status" ||
                title?.toLowerCase().includes("order"))
        ) {
            navigate(`/orders/${orderId}`);
            return;
        }

        if (n.link) {
            navigate(n.link);
            return;
        }

        navigate(notificationsLink);
    };

    // ---------- RENDER ----------
    return (
        <header className="app-header">
            <Link
                to={dashboardLink}
                className="app-header__logo"
                aria-label="Wholesale home"
            >
                {logo ? (
                    <img
                        src={logo}
                        alt="Logo"
                        style={{ height: 32, objectFit: "contain" }}
                    />
                ) : (
                    <span className="app-header__brand-icon">B</span>
                )}
            </Link>
            <nav
                className="app-header__desktop-nav"
                aria-label="Primary navigation"
            >
                {(isAdmin
                    ? [
                          ["/admin/dashboard", "Overview"],
                          ["/admin/orders", "Orders"],
                          ["/admin/products", "Inventory"],
                      ]
                    : [
                          ["/dashboard", "Dashboard"],
                          ["/products", "All Product"],
                          ["/orders", "My orders"],
                      ]
                ).map(([to, label]) => (
                    <Link
                        key={to}
                        to={to}
                        className={`app-header__nav-link ${location.pathname === to || location.pathname.startsWith(to + "/") ? "is-active" : ""}`}
                    >
                        {label}
                    </Link>
                ))}
            </nav>

            {!isAdmin && !location.pathname.startsWith("/admin/products") && (
                <ProductSearch
                    value={searchQuery}
                    onChange={onSearchChange}
                    onSearch={onProductSearch}
                />
            )}

            <div className="app-header__actions">
                <ThemeSwitcher />
                {/* Notifications */}
                {!isAdmin && (
                    <div className="app-header__icon-wrap">
                        <button
                            className="app-header__icon-btn"
                            onClick={() => {
                                setShowNotifs((s) => !s);
                                setShowProfile(false);
                            }}
                            aria-label="Notifications"
                        >
                            <Icon name="bell" size={19} />
                            {unreadCount > 0 && (
                                <span className="app-header__badge">
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                            )}
                        </button>

                        {showNotifs && (
                            <div
                                className="app-header__dropdown app-header__dropdown--notifications"
                                ref={notifRef}
                            >
                                <div className="app-header__dropdown-header">
                                    <span>Notifications</span>
                                    <div className="app-header__notif-actions">
                                        {unreadCount > 0 && (
                                            <button
                                                className="app-header__notif-action-btn"
                                                onClick={markAllRead}
                                            >
                                                Mark all read
                                            </button>
                                        )}
                                        {notifications.length > 0 && (
                                            <button
                                                className="app-header__notif-action-btn app-header__notif-action-btn--danger"
                                                onClick={clearAll}
                                            >
                                                Clear all
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {notifications.length === 0 ? (
                                    <p className="app-header__empty">
                                        No notifications
                                    </p>
                                ) : (
                                    <div className="app-header__notif-list">
                                        {notifications.map((n) => (
                                            <div
                                                key={n.id}
                                                className={`app-header__notif ${
                                                    !n.is_read
                                                        ? "app-header__notif--unread"
                                                        : ""
                                                }`}
                                                onClick={() =>
                                                    handleNotificationClick(n)
                                                }
                                            >
                                                <strong className="app-header__notif-title">
                                                    {n.title}
                                                </strong>
                                                <p className="app-header__notif-message">
                                                    {n.message}
                                                </p>
                                                {n.created_at && (
                                                    <span className="app-header__notif-time">
                                                        {new Date(
                                                            n.created_at,
                                                        ).toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="app-header__dropdown-footer">
                                    <Link
                                        to={notificationsLink}
                                        onClick={() => setShowNotifs(false)}
                                    >
                                        View All Notifications →
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Wishlist - desktop only */}
                {user?.role?.name === "dealer" && (
                    <Link
                        to="/wishlist"
                        className="app-header__icon-btn app-header__wishlist-btn"
                        aria-label="Wishlist"
                    >
                        <Icon name="heart" size={19} />
                        {wishlistCount > 0 && (
                            <span className="app-header__badge">
                                {wishlistCount}
                            </span>
                        )}
                    </Link>
                )}

                {/* Cart - Show ONLY on Desktop */}
                {user?.role?.name === "dealer" && (
                    <Link
                        to="/cart"
                        className="app-header__icon-btn app-header__cart-btn"
                        aria-label="Cart"
                    >
                        <Icon name="cart" size={19} />
                        {cartCount > 0 && (
                            <span className="app-header__badge">
                                {cartCount > 99 ? "99+" : cartCount}
                            </span>
                        )}
                    </Link>
                )}
                {/* Profile */}
                <div className="app-header__icon-wrap">
                    <button
                        className="app-header__icon-btn"
                        onClick={() => {
                            setShowProfile((s) => !s);
                            setShowNotifs(false);
                        }}
                        aria-label="Profile"
                    >
                        <Icon name="user" size={19} />
                    </button>

                    {showProfile && (
                        <div
                            className="app-header__dropdown app-header__dropdown--profile"
                            ref={profileRef}
                        >
                            <p className="app-header__user-name">
                                {user?.name}
                            </p>

                            {user?.role?.name === "dealer" && (
                                <>
                                    <Link
                                        to="/orders"
                                        className="app-header__dropdown-link"
                                        onClick={() => setShowProfile(false)}
                                    >
                                        My Orders
                                    </Link>
                                    <Link
                                        to="/chat"
                                        className="app-header__dropdown-link"
                                        onClick={() => setShowProfile(false)}
                                    >
                                        Chat with Admin
                                    </Link>
                                    <Link
                                        to="/profile"
                                        className="app-header__dropdown-link"
                                        onClick={() => setShowProfile(false)}
                                    >
                                        Profile Settings
                                    </Link>
                                </>
                            )}

                            {isAdmin && (
                                <>
                                    <Link
                                        to="/admin/settings"
                                        className="app-header__dropdown-link"
                                        onClick={() => setShowProfile(false)}
                                    >
                                        Settings
                                    </Link>
                                    <Link
                                        to="/admin/change-password"
                                        className="app-header__dropdown-link"
                                        onClick={() => setShowProfile(false)}
                                    >
                                        Change Password
                                    </Link>
                                </>
                            )}

                            <button
                                className="app-header__logout-btn"
                                onClick={logout}
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
