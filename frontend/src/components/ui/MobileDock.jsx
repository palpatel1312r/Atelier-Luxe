import { NavLink, useLocation } from "react-router-dom";
import Icon from "./Icon";
import { useCartCount } from "../../hooks/useCartCount";

const items = [
    { to: "/dashboard", text: "Home", icon: "dashboard" },
    { to: "/products", text: "Shop", icon: "grid" },
    { to: "/orders", text: "Orders", icon: "orders" },
    { to: "/cart", text: "Basket", icon: "cart" },
];

/** Thumb-friendly primary navigation, visible on small buyer screens only. */
export default function MobileDock() {
    const { count } = useCartCount();
    const location = useLocation();
    // Checkout and product details already have their own fixed purchase actions.
    if (location.pathname === "/checkout" || /^\/products\/[^/]+$/.test(location.pathname)) return null;
    return <nav className="experience-mobile-dock" aria-label="Mobile storefront navigation">
        {items.map((item) => <NavLink key={item.to} to={item.to}
            end={item.to === "/dashboard"}
            className={({ isActive }) => `experience-mobile-dock__link ${isActive ? "is-active" : ""}`}>
            <span className="experience-mobile-dock__icon"><Icon name={item.icon} size={20}/>
                {item.to === "/cart" && Number(count) > 0 && <span className="experience-mobile-dock__badge">{count > 99 ? "99+" : count}</span>}
            </span><span>{item.text}</span>
        </NavLink>)}
    </nav>;
}
