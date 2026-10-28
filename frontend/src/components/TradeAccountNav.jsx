import { NavLink } from "react-router-dom";
import Icon from "./ui/Icon";

/** Real route navigation for repeat purchasing and account management. */
const items = [
    { to: "/orders", label: "My orders", icon: "orders" },
    { to: "/wishlist", label: "My Wishlist", icon: "heart" },
    { to: "/profile", label: "Business profile", icon: "user" },
];
export default function TradeAccountNav() {
  return <nav aria-label="My account" className="arc-account-nav">
    <span className="arc-account-nav__label">MY WORKSPACE <Icon name="chevron" size={13}/></span>
    {items.map(item => <NavLink key={item.to} end to={item.to} className={({isActive}) => `arc-account-nav__link ${isActive ? "is-active" : ""}`}><Icon name={item.icon} size={16}/>{item.label}</NavLink>)}
  </nav>;
}
