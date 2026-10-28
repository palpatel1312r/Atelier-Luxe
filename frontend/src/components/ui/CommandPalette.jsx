import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Icon from "./Icon";

/** Keyboard-first navigation. Does not manufacture purchase orders or change backend data. */
export default function CommandPalette({ label = "Search workspace" }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const input = useRef(null);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const admin = isAdmin();
  const options = admin ? [
    ["/admin/dashboard", "Overview", "Operations", "dashboard"],
    ["/admin/orders", "Orders", "Fulfillment", "orders"],
    ["/admin/products", "Inventory", "Stock and SKUs", "box"],
    ["/admin/pricing", "Tiered pricing", "Trade price rules", "tag"],
    ["/admin/bulk-upload", "Bulk upload", "Import products", "upload"],
    ["/admin/reports", "Reports", "Business insights", "chart"],
    ["/admin/settings", "Tenant settings", "Configuration", "settings"],
  ] : [
    ["/dashboard", "Overview", "Buying dashboard", "dashboard"],
    ["/products", "Browse catalog", "Browse available products", "grid"],
    ["/fast-order", "Fast order pad", "Add multiple SKUs to basket", "orders"],
    ["/cart", "Shopping basket", "Review quantities", "bag"],
    ["/orders", "My orders", "Track and repeat", "orders"],
    ["/wishlist", "Saved products", "Your shortlist", "heart"],
    ["/profile", "Business profile", "Account details", "people"],
  ];
  const matches = options.filter(x => `${x[1]} ${x[2]}`.toLowerCase().includes(term.toLowerCase()));
  useEffect(() => {
    const listener = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); setOpen(v => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, []);
  useEffect(() => {
    if (!open) { setTerm(""); return; }
    const saved = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => input.current?.focus());
    return () => { document.body.style.overflow = saved; };
  }, [open]);
  const choose = to => { setOpen(false); navigate(to); };
  return <>
    <button type="button" className="enterprise-search-trigger" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
      <Icon name="search" size={17}/><span>{label}</span><kbd>Ctrl K</kbd>
    </button>
    {open && <div className="enterprise-command-backdrop" onMouseDown={e => { if(e.target === e.currentTarget) setOpen(false); }}>
      <section className="enterprise-command" role="dialog" aria-modal="true" aria-label="Workspace command search">
        <div className="enterprise-command__input"><Icon name="search" size={21}/><input ref={input} value={term} onChange={e => setTerm(e.target.value)} placeholder="Search pages and actions…" aria-label="Search pages and actions" onKeyDown={e => { if(e.key === "Enter" && matches[0]) choose(matches[0][0]); }}/><button type="button" onClick={() => setOpen(false)} aria-label="Close command palette">Esc</button></div>
        <div className="enterprise-command__results" role="listbox" aria-label="Matching destinations">
          {matches.map(([path,name,description,icon]) => <button type="button" role="option" aria-selected="false" key={path} onClick={() => choose(path)}><Icon name={icon} size={19}/><span><strong>{name}</strong><small>{description}</small></span><Icon name="arrow" size={16}/></button>)}
          {matches.length === 0 && <div className="enterprise-command__none">No matching pages. Try another term.</div>}
        </div><p className="enterprise-command__hint">Enter to open first result · Esc to close</p>
      </section>
    </div>}
  </>;
}
