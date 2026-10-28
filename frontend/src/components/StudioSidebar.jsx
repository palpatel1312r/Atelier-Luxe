import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import Icon from "./ui/Icon";
import { useAuth } from "../context/AuthContext";

const sections = [
  {
    label: "CATALOG",
    links: [
      ["/dashboard", "Overview", "dashboard"],
      ["/products", "Marketplace", "grid"],
      ["/wishlist", "Saved products", "heart"],
    ],
  },
  {
    label: "BULK ORDERS",
    links: [
      ["/fast-order", "Fast order pad", "orders"],
      ["/cart", "Order basket", "bag"],
      ["/orders", "Order history", "orders"],
    ],
  },
  {
    label: "ACCOUNT",
    links: [
      ["/chat", "Messages", "message"],
      ["/profile", "Business profile", "people"],
      ["/contact", "Support", "shield"],
    ],
  },
];

export default function StudioSidebar({ collapsed = false, onCollapse }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const openButtonRef = useRef(null);
  const drawerRef = useRef(null);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const previousFocus = document.activeElement;
    drawerRef.current?.querySelector('.enterprise-sidebar__close')?.focus();
    const key = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
      if (e.key !== "Tab" || !drawerRef.current) return;
      const focusables = [...drawerRef.current.querySelectorAll('button:not([disabled]),a[href]')]
        .filter(el => el.getClientRects().length > 0);
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", key);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [mobileOpen]);

  return (
    <>
      <button
        className="enterprise-mobile-menu"
        ref={openButtonRef}
        type="button"
        aria-expanded={mobileOpen}
        aria-controls="trade-sidebar"
        aria-haspopup="true"
        onClick={() => setMobileOpen(true)}
      >
        <Icon name="menu" size={19} /> Menu
      </button>

      {mobileOpen && (
        <button
          type="button"
          className="enterprise-mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        id="trade-sidebar"
        ref={drawerRef}
        className={`studio-sidebar enterprise-sidebar ${collapsed ? "is-collapsed" : ""} ${mobileOpen ? "is-mobile-open" : ""}`}
        aria-label="Buyer workspace navigation"
      >
        <span className="studio-sidebar__ambient studio-sidebar__ambient--one" aria-hidden />
        <span className="studio-sidebar__ambient studio-sidebar__ambient--two" aria-hidden />
        <div className="studio-sidebar__scroll">
          <div className="studio-sidebar__identity">
            <span className="studio-sidebar__identity-icon">
              <Icon name="layers" size={19} />
            </span>
            <div className="studio-sidebar__identity-text">
              <strong>B2B Wholesale</strong>
              <small className="studio-sidebar__workspace-label">BUYER WORKSPACE</small>
            </div>
            <button
              className="enterprise-sidebar__collapse"
              type="button"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              onClick={onCollapse}
            >
              <Icon name="chevron" size={16} />
            </button>
            <button
              className="enterprise-sidebar__close"
              type="button"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
            >
              ✕
            </button>
          </div>

          {sections.map((section, sIdx) => (
            <nav
              className="studio-sidebar__group"
              aria-label={section.label}
              key={section.label}
              style={{ "--nav-delay": `${sIdx * 40}ms` }}
            >
              <p>{section.label}</p>
              {section.links.map(([to, label, icon], i) => (
                <NavLink
                  to={to}
                  key={to}
                  title={label}
                  style={{ "--link-delay": `${sIdx * 40 + i * 28}ms` }}
                  className={({ isActive }) =>
                    `studio-sidebar__link ${
                      isActive || pathname.startsWith(to + "/") ? "is-active" : ""
                    }`
                  }
                >
                  <span className="studio-sidebar__link-icon">
                    <Icon name={icon} size={18} />
                  </span>
                  <span className="studio-sidebar__link-label">{label}</span>
                  <span className="studio-sidebar__link-indicator" aria-hidden />
                </NavLink>
              ))}
            </nav>
          ))}

          {/* <div className="studio-sidebar__support">
            <span className="studio-sidebar__support-spark" aria-hidden>✦</span>
            <small>QUICK PROCUREMENT</small>
            <strong>Order in seconds.</strong>
            <p>Use SKUs and quantities to build a bulk order without browsing.</p>
            <NavLink to="/fast-order" className="studio-sidebar__support-cta">
              Open fast order <Icon name="arrow" size={15} />
            </NavLink>
          </div> */}
        </div>

        <div className="studio-sidebar__person">
          <div className="studio-sidebar__avatar">
            {(user?.name || "B").slice(0, 1).toUpperCase()}
            <span className="studio-sidebar__presence" aria-label="Online" />
          </div>
          <div className="studio-sidebar__person-meta">
            <strong>{user?.company_name || user?.name || "Your business"}</strong>
            <small>Buyer workspace · INR</small>
          </div>
        </div>
      </aside>
    </>
  );
}
