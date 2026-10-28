import { useEffect, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import Header from "./Header";
import "../styles/admin-layout.css";
import Icon from "./ui/Icon";
import ScrollProgress from "./ui/ScrollProgress";
import CommandPalette from "./ui/CommandPalette";

const NAV_SECTIONS = [
    {
        label: "Bulk Orders & Catalog",
        items: [
            { to: "/admin/dashboard", label: "Dashboard", icon: "dashboard" },
            { to: "/admin/orders", label: "Orders", icon: "orders" },
            { to: "/admin/products", label: "Products", icon: "box" },
            { to: "/admin/catalog", label: "Catalog", icon: "layers" },
            { to: "/admin/pricing", label: "Pricing", icon: "tag" },
            { to: "/admin/bulk-upload", label: "Bulk Upload", icon: "upload" },
        ],
    },
    {
        label: "Pricing & Accounts",
        items: [
            { to: "/admin/sellers", label: "Sellers", icon: "people" },
            { to: "/admin/groups", label: "Groups", icon: "grid" },
            { to: "/admin/reports", label: "Reports", icon: "chart" },
        ],
    },
    {
        label: "Communication",
        items: [
            { to: "/admin/broadcast", label: "Notify", icon: "megaphone" },
            { to: "/admin/chat", label: "Chat", icon: "message" },
        ],
    },
    {
        label: "Tenant Settings",
        items: [
            { to: "/admin/settings", label: "Settings", icon: "settings" },
            {
                to: "/admin/change-password",
                label: "Change Password",
                icon: "lock",
            },
        ],
    },
];

const FLAT_ITEMS = NAV_SECTIONS[0].items.slice(0, 4);

export default function AdminLayout({ children }) {
    const [collapsed, setCollapsed] = useState(() => {
        try {
            return localStorage.getItem("wholesale-admin-nav") === "collapsed";
        } catch {
            return false;
        }
    });
    useEffect(() => {
        try {
            localStorage.setItem(
                "wholesale-admin-nav",
                collapsed ? "collapsed" : "expanded",
            );
        } catch {
            /* storage may be unavailable */
        }
    }, [collapsed]);
    const [menuOpen, setMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    useEffect(() => {
        setMenuOpen(false);
    }, [location.pathname]);
    useEffect(() => {
        if (!menuOpen) return;
        const original = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onEscape = (event) => {
            if (event.key === "Escape") setMenuOpen(false);
        };
        document.addEventListener("keydown", onEscape);
        return () => {
            document.body.style.overflow = original;
            document.removeEventListener("keydown", onEscape);
        };
    }, [menuOpen]);

    return (
        <div
            className={`admin-layout ${
                collapsed ? "admin-layout--collapsed" : ""
            }`}
        >
            <a className="arc-skip-link" href="#main-content">
                Skip to content
            </a>
            <ScrollProgress />
            <Header />
            {/* <div className="enterprise-admin-utility">
                <div className="enterprise-admin-identity">
                    <Icon name="shield" size={17} />
                    <span>Secure operations</span>
                    <small>INR · ₹</small>
                </div>
                <CommandPalette label="Search admin pages" />
                <span className="enterprise-admin-tenant">
                    Current tenant workspace
                </span>
            </div>
            <div className="admin-layout__mobile-topbar">
                <span>
                    <Icon name="grid" size={17} /> Admin workspace
                </span>
                <button
                    type="button"
                    aria-expanded={menuOpen}
                    aria-controls="admin-mobile-menu"
                    onClick={() => setMenuOpen(true)}
                >
                    <Icon name="menu" size={20} /> Menu
                </button>
            </div> */}
            {menuOpen && (
                <div
                    className="admin-mobile-overlay"
                    onClick={() => setMenuOpen(false)}
                >
                    <nav
                        id="admin-mobile-menu"
                        className="admin-mobile-drawer"
                        aria-label="Admin navigation"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="admin-mobile-drawer__heading">
                            <strong>Admin workspace</strong>
                            <button
                                type="button"
                                aria-label="Close menu"
                                onClick={() => setMenuOpen(false)}
                            >
                                ✕
                            </button>
                        </div>
                        {NAV_SECTIONS.map((section) => (
                            <div
                                key={section.label}
                                className="admin-mobile-drawer__section"
                            >
                                <p>{section.label}</p>
                                {section.items.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        onClick={() => setMenuOpen(false)}
                                        className={({ isActive }) =>
                                            `admin-mobile-drawer__item ${isActive ? "is-active" : ""}`
                                        }
                                    >
                                        <Icon name={item.icon} size={18} />
                                        {item.label}
                                    </NavLink>
                                ))}
                            </div>
                        ))}
                    </nav>
                </div>
            )}
            <div className="admin-layout__body">
                <nav className="admin-layout__sidebar">
                    <div className="admin-layout__sidebar-header">
                        <p className="admin-layout__sidebar-eyebrow">
                            <span>OPERATIONS / ADMIN</span>
                        </p>
                        <button
                            type="button"
                            className="admin-layout__toggle-btn"
                            aria-label={
                                collapsed
                                    ? "Expand navigation"
                                    : "Collapse navigation"
                            }
                            aria-expanded={!collapsed}
                            onClick={() => setCollapsed((c) => !c)}
                        >
                            <span className="admin-layout__toggle-tooltip">
                                {collapsed ? "Expand" : "Collapse"}
                            </span>
                            {collapsed ? "»" : "«"}
                        </button>
                    </div>

                    {NAV_SECTIONS.map((section) => (
                        <div
                            key={section.label}
                            className="admin-layout__nav-section"
                        >
                            <p className="admin-layout__nav-section-label">
                                {section.label}
                            </p>
                            {section.items.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    className={({ isActive }) =>
                                        `admin-layout__nav-item ${
                                            isActive
                                                ? "admin-layout__nav-item--active"
                                                : ""
                                        }`
                                    }
                                >
                                    <span className="admin-layout__tooltip">
                                        {item.label}
                                    </span>
                                    <span className="admin-layout__nav-icon">
                                        <Icon name={item.icon} size={19} />
                                    </span>
                                    <span className="admin-layout__nav-label">
                                        {item.label}
                                    </span>
                                </NavLink>
                            ))}
                        </div>
                    ))}
                    <div className="admin-layout__sidebar-footer">
                        <Icon name="shield" size={17} />
                        <span>Secure operations workspace</span>
                    </div>
                </nav>

                <main
                    key={location.pathname}
                    id="main-content"
                    className="admin-layout__content experience-route-enter"
                >
                    {children}
                </main>
            </div>

            {/* Mobile bottom nav */}
            <nav className="admin-layout__mobile-nav">
                {FLAT_ITEMS.map((item) => {
                    const isActive = location.pathname.startsWith(item.to);
                    return (
                        <button
                            key={item.to}
                            type="button"
                            className={`admin-layout__mobile-item ${
                                isActive
                                    ? "admin-layout__mobile-item--active"
                                    : ""
                            }`}
                            onClick={() => navigate(item.to)}
                        >
                            <span className="admin-layout__mobile-icon">
                                <Icon name={item.icon} size={20} />
                            </span>
                            <span className="admin-layout__mobile-tooltip">
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
