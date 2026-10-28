import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import api from "../../api/client";
import Icon from "../../components/ui/Icon";
import AdminDataTableControls from "../../components/ui/AdminDataTableControls";
import "../../styles/admin-common.css";
import "../../styles/admin-sellers.css";

/* ========== GroupSelect ========== */
function GroupSelect({ seller, groups, onChange, loading }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const triggerRef = useRef(null);
    const dropdownRef = useRef(null);
    const [menuPosition, setMenuPosition] = useState(null);
    const currentGroup = seller.group?.name || "No Group";

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                ref.current &&
                !ref.current.contains(e.target) &&
                !dropdownRef.current?.contains(e.target)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (loading) setOpen(false);
    }, [loading]);

    useEffect(() => {
        if (!open) {
            setMenuPosition(null);
            return undefined;
        }

        const positionMenu = () => {
            const rect = triggerRef.current?.getBoundingClientRect();
            if (!rect) return;

            const viewportPadding = 8;
            const width = Math.min(
                rect.width,
                window.innerWidth - viewportPadding * 2,
            );
            const left = Math.max(
                viewportPadding,
                Math.min(rect.left, window.innerWidth - width - viewportPadding),
            );
            const desiredHeight = Math.min(320, (groups.length + 1) * 40 + 8);
            const spaceBelow = window.innerHeight - rect.bottom - 8;
            const spaceAbove = rect.top - 8;
            const openAbove =
                spaceBelow < desiredHeight && spaceAbove > spaceBelow;
            const availableHeight = openAbove ? spaceAbove : spaceBelow;
            const maxHeight = Math.max(
                80,
                Math.min(320, availableHeight - viewportPadding),
            );
            const top = openAbove
                ? Math.max(viewportPadding, rect.top - Math.min(desiredHeight, maxHeight) - 4)
                : rect.bottom + 4;

            setMenuPosition({ top, left, width, maxHeight });
        };

        positionMenu();
        window.addEventListener("resize", positionMenu);
        window.addEventListener("scroll", positionMenu, true);
        return () => {
            window.removeEventListener("resize", positionMenu);
            window.removeEventListener("scroll", positionMenu, true);
        };
    }, [open, groups.length]);

    const filtered = groups
        .filter((g) => g.id !== seller.group?.id)
        .sort((a, b) => a.name.localeCompare(b.name));

    const handleSelect = (groupId) => {
        if (loading) return;
        onChange(groupId);
        setOpen(false);
    };

    return (
        <div className="group-select" ref={ref}>
            <button
                ref={triggerRef}
                type="button"
                disabled={loading}
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => !loading && setOpen((s) => !s)}
                className={`group-select__trigger ${open ? "is-open" : ""}`}
            >
                <span>{loading ? "Updating…" : currentGroup}</span>
                <span className="group-select__arrow">
                    {loading ? "⋯" : "▼"}
                </span>
            </button>

            {open && !loading && (
                menuPosition &&
                createPortal(
                    <div
                        ref={dropdownRef}
                        className="group-select__dropdown"
                        role="listbox"
                        aria-label={`Choose a group for ${seller.name}`}
                        style={{
                            top: menuPosition.top,
                            left: menuPosition.left,
                            width: menuPosition.width,
                            maxHeight: menuPosition.maxHeight,
                        }}
                    >
                        <div
                            className={`group-select__option ${
                                !seller.group?.id ? "is-selected" : ""
                            }`}
                            role="option"
                            aria-selected={!seller.group?.id}
                            onMouseDown={() => handleSelect(null)}
                        >
                            No Group
                        </div>

                        {filtered.length === 0 ? (
                            <div className="group-select__empty">
                                No other groups
                            </div>
                        ) : (
                            filtered.map((g) => (
                                <div
                                    key={g.id}
                                    className="group-select__option"
                                    role="option"
                                    aria-selected={g.id === seller.group?.id}
                                    onMouseDown={() => handleSelect(g.id)}
                                >
                                    {g.name}
                                </div>
                            ))
                        )}
                    </div>,
                    document.body,
                )
            )}
        </div>
    );
}

/* ========== OrderHistoryModal ========== */
function OrderHistoryModal({ seller, onClose }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedOrderId, setExpandedOrderId] = useState(null);

    useEffect(() => {
        setLoading(true);
        api.get("/admin/orders", {
            params: { user_id: seller.id, per_page: 50 },
        })
            .then(({ data }) => setOrders(data.data || []))
            .finally(() => setLoading(false));
    }, [seller.id]);

    // Close on ESC + lock body scroll while modal is open
    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [onClose]);

    const toggleItems = (orderId) => {
        setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
    };

    const modal = (
        <div className="sellers-modal-overlay" onClick={onClose}>
            <div className="sellers-modal" onClick={(e) => e.stopPropagation()}>
                <div className="sellers-modal__header">
                    <div>
                        <h3 className="sellers-modal__title">
                            Order History — {seller.name}
                        </h3>
                        <p className="sellers-modal__subtitle">
                            Last 1 year · {orders.length} order
                            {orders.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                    <button
                        className="sellers-modal__close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                <div className="sellers-modal__body">
                    {loading ? (
                        <div className="sellers-skeleton">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="sellers-skeleton__row"
                                />
                            ))}
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="sellers-empty">
                            <div className="sellers-empty__icon">
                                <Icon name="layers" size={26} />
                            </div>
                            <h3>No orders found</h3>
                            <p>
                                This seller hasn't placed any orders in the last
                                year.
                            </p>
                        </div>
                    ) : (
                        <div className="sellers-table-scroll">
                            <table className="sellers-table">
                                <thead>
                                    <tr>
                                        <th>Order #</th>
                                        <th>Grand Total</th>
                                        <th>Payment</th>
                                        <th>Status</th>
                                        <th>Notes</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((o) => (
                                        <Fragment key={o.id}>
                                            <tr>
                                                <td>
                                                    <strong>
                                                        {o.order_number}
                                                    </strong>
                                                </td>
                                                <td>₹{o.grand_total}</td>
                                                <td>
                                                    <div>
                                                        {o.payment_method ||
                                                            "—"}
                                                    </div>
                                                    <small
                                                        style={{
                                                            color: "var(--ink-soft)",
                                                            fontFamily:
                                                                "var(--font-mono)",
                                                            fontSize: 11,
                                                        }}
                                                    >
                                                        {o.payment_status || ""}
                                                    </small>
                                                </td>
                                                <td>
                                                    <span className="seller-badge seller-badge--neutral">
                                                        {o.order_status}
                                                    </span>
                                                </td>
                                                <td>{o.notes || "—"}</td>
                                                <td>
                                                    <button
                                                        className="sellers-btn sellers-btn--outline sellers-btn--sm"
                                                        onClick={() =>
                                                            toggleItems(o.id)
                                                        }
                                                    >
                                                        {expandedOrderId ===
                                                        o.id
                                                            ? "Hide Items"
                                                            : "Show Items"}
                                                    </button>
                                                </td>
                                            </tr>
                                            {expandedOrderId === o.id && (
                                                <tr className="order-items-row">
                                                    <td colSpan={6}>
                                                        <div className="order-items-inner">
                                                            <table className="sellers-table">
                                                                <thead>
                                                                    <tr>
                                                                        <th>
                                                                            Product
                                                                        </th>
                                                                        <th>
                                                                            Variant
                                                                        </th>
                                                                        <th>
                                                                            Qty
                                                                        </th>
                                                                        <th>
                                                                            Unit
                                                                            Price
                                                                        </th>
                                                                        <th>
                                                                            Total
                                                                        </th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {o.items?.map(
                                                                        (
                                                                            item,
                                                                        ) => (
                                                                            <tr
                                                                                key={
                                                                                    item.id
                                                                                }
                                                                            >
                                                                                <td>
                                                                                    {item
                                                                                        .product
                                                                                        ?.name ||
                                                                                        item.product_id}
                                                                                </td>
                                                                                <td>
                                                                                    {item.variant_id ||
                                                                                        "—"}
                                                                                </td>
                                                                                <td>
                                                                                    {
                                                                                        item.quantity
                                                                                    }
                                                                                </td>
                                                                                <td>
                                                                                    ₹
                                                                                    {
                                                                                        item.unit_price
                                                                                    }
                                                                                </td>
                                                                                <td>
                                                                                    ₹
                                                                                    {
                                                                                        item.total_price
                                                                                    }
                                                                                </td>
                                                                            </tr>
                                                                        ),
                                                                    )}
                                                                    <tr>
                                                                        <td
                                                                            colSpan={
                                                                                4
                                                                            }
                                                                            style={{
                                                                                textAlign:
                                                                                    "right",
                                                                                fontWeight: 600,
                                                                            }}
                                                                        >
                                                                            Grand
                                                                            Total:
                                                                        </td>
                                                                        <td
                                                                            style={{
                                                                                fontWeight: 700,
                                                                            }}
                                                                        >
                                                                            ₹
                                                                            {o.items
                                                                                ?.reduce(
                                                                                    (
                                                                                        sum,
                                                                                        i,
                                                                                    ) =>
                                                                                        sum +
                                                                                        Number(
                                                                                            i.total_price ||
                                                                                                0,
                                                                                        ),
                                                                                    0,
                                                                                )
                                                                                .toFixed(
                                                                                    2,
                                                                                )}
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    // Render via portal so it escapes page-level stacking contexts
    return createPortal(modal, document.body);
}
/* ========== Main Component ========== */
export default function AdminSellers() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = Boolean(id);

    const [sellers, setSellers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [meta, setMeta] = useState(null);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [sortBy, setSortBy] = useState("newest");
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(true);
    const [historySeller, setHistorySeller] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);

    const [form, setForm] = useState({
        name: "",
        email: "",
        phone: "",
        company_name: "",
        gst_number: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        group_id: "",
        credit_limit: "0",
        is_active: true,
    });
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");

    /* ---------- derived stats ---------- */
    const stats = useMemo(() => {
        const total = meta?.total ?? sellers.length;
        const active = sellers.filter(
            (s) => s.is_active && !s.is_blocked,
        ).length;
        const blocked = sellers.filter((s) => s.is_blocked).length;
        return { total, active, blocked };
    }, [sellers, meta]);

    /* ---------- load ---------- */
    const load = (pageNum = page, search = q) => {
        setLoading(true);
        api.get("/admin/sellers", {
            params: {
                page: pageNum,
                per_page: perPage,
                q: search || undefined,
                sort_by: sortBy,
            },
        })
            .then(({ data }) => {
                setSellers(data.data);
                setMeta(
                    data.meta || {
                        current_page: data.current_page || 1,
                        last_page: data.last_page || 1,
                        per_page: data.per_page || 10,
                        total: data.total || 0,
                    },
                );
            })
            .finally(() => setLoading(false));
    };

    useEffect(load, [page, perPage, sortBy]);
    useEffect(() => {
        api.get("/admin/groups").then(({ data }) => setGroups(data.data));
    }, []);

    useEffect(() => {
        if (id) {
            setLoading(true);
            api.get(`/admin/sellers/${id}`)
                .then(({ data }) => {
                    const s = data.data;
                    setForm({
                        name: s.name || "",
                        email: s.email || "",
                        phone: s.phone || "",
                        company_name: s.company_name || "",
                        gst_number: s.gst_number || "",
                        address: s.address || "",
                        city: s.city || "",
                        state: s.state || "",
                        pincode: s.pincode || "",
                        group_id: s.group_id || "",
                        credit_limit: s.credit_limit || "0",
                        is_active: s.is_active !== false,
                    });
                })
                .finally(() => setLoading(false));
        }
    }, [id]);

    const search = (e) => {
        e.preventDefault();
        setPage(1);
        load(1, q);
    };

    const clearMainSearch = () => {
        setQ("");
        setPage(1);
        load(1, "");
    };

    const moveGroup = async (sellerId, groupId) => {
        setUpdatingId(sellerId);
        try {
            await api.patch(`/admin/sellers/${sellerId}/group`, {
                group_id: groupId || null,
            });
            await load();
        } catch (err) {
            alert(err.response?.data?.message || "Could not change group.");
        } finally {
            setUpdatingId(null);
        }
    };

    const toggleBlock = async (sellerId) => {
        setUpdatingId(sellerId);
        try {
            await api.patch(`/admin/sellers/${sellerId}/block`);
            await load();
        } catch (err) {
            alert(err.response?.data?.message || "Could not block/unblock.");
        } finally {
            setUpdatingId(null);
        }
    };

    const toggleActive = async (sellerId) => {
        setUpdatingId(sellerId);
        try {
            await api.patch(`/admin/sellers/${sellerId}/activate`);
            await load();
        } catch (err) {
            alert(
                err.response?.data?.message || "Could not activate/deactivate.",
            );
        } finally {
            setUpdatingId(null);
        }
    };

    const update = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const toggleActiveCheckbox = () => {
        setForm({ ...form, is_active: !form.is_active });
    };

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setFormError("");

        try {
            if (isEditing) {
                await api.put(`/admin/sellers/${id}`, form);
                alert("Seller updated successfully!");
            } else {
                await api.post("/admin/sellers", form);
                alert("Seller created successfully!");
            }
            navigate("/admin/sellers");
        } catch (err) {
            setFormError(
                err.response?.data?.message || "Could not save seller.",
            );
        } finally {
            setSaving(false);
        }
    };

    /* ========== EDIT FORM ========== */
    if (isEditing) {
        return (
            <AdminLayout>
                <div className="admin-sellers-page">
                    <header className="sellers-head">
                        <p className="sellers-head__eyebrow">
                            Seller management
                        </p>
                        <h1 className="sellers-head__title">Edit seller</h1>
                        <p className="sellers-head__sub">
                            Update account details, pricing tier, and status.
                        </p>
                    </header>

                    <form
                        className="sellers-card"
                        onSubmit={submit}
                        style={{ maxWidth: 900 }}
                    >
                        <div className="sellers-card__head">
                            <div>
                                <h3 className="sellers-card__title">
                                    Seller details
                                </h3>
                                <p className="sellers-card__sub">
                                    Fields marked * are required.
                                </p>
                            </div>
                            <button
                                type="button"
                                className="sellers-btn sellers-btn--ghost sellers-btn--sm"
                                onClick={() => navigate("/admin/sellers")}
                            >
                                ← Back to list
                            </button>
                        </div>

                        <div className="admin-form-grid">
                            <div className="admin-form-row">
                                <label>Full Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={form.name}
                                    onChange={update}
                                    required
                                />
                            </div>
                            <div className="admin-form-row">
                                <label>Email *</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={update}
                                    required
                                />
                            </div>
                            <div className="admin-form-row">
                                <label>Phone *</label>
                                <input
                                    type="text"
                                    name="phone"
                                    value={form.phone}
                                    onChange={update}
                                    required
                                />
                            </div>
                            <div className="admin-form-row">
                                <label>Company Name</label>
                                <input
                                    type="text"
                                    name="company_name"
                                    value={form.company_name}
                                    onChange={update}
                                    maxLength={100}
                                />
                            </div>
                            <div className="admin-form-row">
                                <label>GST Number</label>
                                <input
                                    type="text"
                                    name="gst_number"
                                    maxLength={15}
                                    value={form.gst_number}
                                    onChange={update}
                                />
                            </div>
                            <div className="admin-form-row">
                                <label>Group</label>
                                <select
                                    name="group_id"
                                    value={form.group_id}
                                    onChange={update}
                                >
                                    <option value="">No Group</option>
                                    {groups.map((g) => (
                                        <option key={g.id} value={g.id}>
                                            {g.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="admin-form-row">
                                <label>Credit Limit</label>
                                <input
                                    type="number"
                                    name="credit_limit"
                                    value={form.credit_limit}
                                    onChange={update}
                                    min="0"
                                />
                            </div>
                            <div className="admin-form-row">
                                <label>Address</label>
                                <input
                                    type="text"
                                    name="address"
                                    maxLength={100}
                                    value={form.address}
                                    onChange={update}
                                />
                            </div>
                            <div className="admin-form-row">
                                <label>City</label>
                                <input
                                    type="text"
                                    name="city"
                                    maxLength={100}
                                    value={form.city}
                                    onChange={update}
                                />
                            </div>
                            <div className="admin-form-row">
                                <label>State</label>
                                <input
                                    type="text"
                                    name="state"
                                    value={form.state}
                                    onChange={update}
                                    placeholder="Type or select state"
                                    maxLength={100}
                                />
                            </div>
                            <div className="admin-form-row">
                                <label>Pincode</label>
                                <input
                                    type="text"
                                    name="pincode"
                                    maxLength={6}
                                    value={form.pincode}
                                    onChange={update}
                                />
                            </div>
                        </div>

                        <div
                            className="admin-form-row"
                            style={{ marginTop: 12 }}
                        >
                            <label
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    cursor: "pointer",
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={form.is_active}
                                    onChange={toggleActiveCheckbox}
                                />
                                Account Active
                            </label>
                        </div>

                        {formError && (
                            <div
                                className="sellers-alert sellers-alert--error"
                                role="alert"
                            >
                                <Icon name="alert" size={15} />
                                <span>{formError}</span>
                            </div>
                        )}

                        <div
                            style={{
                                display: "flex",
                                gap: 10,
                                marginTop: 20,
                                paddingTop: 16,
                                borderTop: "1px solid var(--rule)",
                                justifyContent: "flex-end",
                            }}
                        >
                            <button
                                className="sellers-btn sellers-btn--ghost"
                                type="button"
                                onClick={() => navigate("/admin/sellers")}
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <button
                                className="sellers-btn sellers-btn--primary"
                                type="submit"
                                disabled={saving}
                            >
                                {saving ? (
                                    <>
                                        <span className="sellers-btn__spin" />
                                        Saving…
                                    </>
                                ) : (
                                    "Update Seller"
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </AdminLayout>
        );
    }

    /* ========== LIST VIEW ========== */
    return (
        <AdminLayout>
            <div className="admin-sellers-page">
                {/* Head */}
                <header className="sellers-head">
                    <p className="sellers-head__eyebrow">Seller management</p>
                    <h1 className="sellers-head__title">Sellers / Dealers</h1>
                    <p className="sellers-head__sub">
                        Manage seller accounts, pricing tiers, and order history
                        across your B2B network.
                    </p>
                </header>

                {/* Stats strip */}
                {!loading && sellers.length > 0 && (
                    <div className="sellers-stats">
                        <div className="sellers-stats__item">
                            <span className="sellers-stats__label">
                                Total sellers
                            </span>
                            <span className="sellers-stats__value">
                                {stats.total}
                            </span>
                        </div>
                        <div className="sellers-stats__item">
                            <span className="sellers-stats__label">Active</span>
                            <span className="sellers-stats__value">
                                {stats.active}
                            </span>
                        </div>
                        <div className="sellers-stats__item">
                            <span className="sellers-stats__label">
                                Blocked
                            </span>
                            <span className="sellers-stats__value">
                                {stats.blocked}
                            </span>
                        </div>
                    </div>
                )}

                {/* Toolbar */}
                <form className="sellers-toolbar" onSubmit={search}>
                    <div className="sellers-search">
                        <input
                            type="text"
                            className="sellers-search__input"
                            placeholder="Search name, phone, GST, city, group..."
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                        {q.length > 0 && (
                            <button
                                type="button"
                                onClick={clearMainSearch}
                                className="sellers-search__clear"
                                aria-label="Clear search"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    <button
                        className="sellers-btn sellers-btn--outline sellers-btn--sm"
                        type="submit"
                        style={{ minHeight: 42 }}
                    >
                        <Icon name="search" size={14} />
                        Search
                    </button>
                    <button
                        className="sellers-btn sellers-btn--primary sellers-btn--sm"
                        type="button"
                        style={{ minHeight: 42, marginLeft: "auto" }}
                        onClick={() => navigate("/admin/sellers/new")}
                    >
                        <Icon name="plus" size={15} />
                        Add Seller
                    </button>
                </form>

                {/* Table */}
                <div className="sellers-table-wrap">
                    {loading ? (
                        <div className="sellers-skeleton">
                            {[0, 1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    className="sellers-skeleton__row"
                                />
                            ))}
                        </div>
                    ) : sellers.length === 0 ? (
                        <div className="sellers-empty">
                            <div className="sellers-empty__icon">
                                <Icon name="users" size={26} />
                            </div>
                            <h3>No sellers found</h3>
                            <p>
                                Try adjusting your search, or add your first
                                seller to get started.
                            </p>
                        </div>
                    ) : (
                        <div className="sellers-table-scroll sellers-directory-scroll">
                            <table className="sellers-table sellers-directory-table">
                                <thead>
                                    <tr>
                                        <th>Seller</th>
                                        <th>Phone</th>
                                        <th>GST</th>
                                        <th>City / State</th>
                                        <th>Credit Limit</th>
                                        <th>Group</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sellers.map((s) => (
                                        <tr
                                            key={s.id}
                                            className={
                                                updatingId === s.id
                                                    ? "is-updating"
                                                    : ""
                                            }
                                        >
                                            <td data-label="Seller">
                                                <div className="seller-cell">
                                                    <span className="seller-cell__avatar">
                                                        {s.name
                                                            ?.charAt(0)
                                                            ?.toUpperCase() ||
                                                            "?"}
                                                    </span>
                                                    <div className="seller-cell__info">
                                                        <span className="seller-cell__name">
                                                            {s.name}
                                                        </span>
                                                        {s.company_name && (
                                                            <span className="seller-cell__company">
                                                                {s.company_name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td data-label="Phone">{s.phone || "—"}</td>
                                            <td data-label="GST">{s.gst_number || "—"}</td>
                                            <td data-label="City / State">
                                                {s.city || "—"}
                                                {s.state ? `, ${s.state}` : ""}
                                            </td>
                                            <td data-label="Credit Limit">₹{s.credit_limit}</td>
                                            <td data-label="Group">
                                                <GroupSelect
                                                    seller={s}
                                                    groups={groups}
                                                    onChange={(groupId) =>
                                                        moveGroup(s.id, groupId)
                                                    }
                                                    loading={
                                                        updatingId === s.id
                                                    }
                                                />
                                            </td>
                                            <td data-label="Status">
                                                <span
                                                    className={`seller-badge seller-badge--${
                                                        s.is_blocked
                                                            ? "danger"
                                                            : s.is_active
                                                              ? "success"
                                                              : "neutral"
                                                    }`}
                                                >
                                                    {s.is_blocked
                                                        ? "Blocked"
                                                        : s.is_active
                                                          ? "Active"
                                                          : "Inactive"}
                                                </span>
                                            </td>
                                            <td data-label="Actions">
                                                <div className="seller-actions">
                                                    <button
                                                        className="sellers-btn sellers-btn--outline sellers-btn--sm"
                                                        onClick={() =>
                                                            navigate(
                                                                `/admin/sellers/${s.id}/edit`,
                                                            )
                                                        }
                                                        disabled={
                                                            updatingId === s.id
                                                        }
                                                        title="Edit seller"
                                                    >
                                                        <Icon
                                                            name="edit"
                                                            size={12}
                                                        />
                                                        Edit
                                                    </button>
                                                    <button
                                                        className={`sellers-btn sellers-btn--sm ${
                                                            s.is_active
                                                                ? "sellers-btn--outline"
                                                                : "sellers-btn--success"
                                                        }`}
                                                        onClick={() =>
                                                            toggleActive(s.id)
                                                        }
                                                        disabled={
                                                            updatingId === s.id
                                                        }
                                                        title={
                                                            s.is_active
                                                                ? "Deactivate account"
                                                                : "Activate account"
                                                        }
                                                    >
                                                        {s.is_active
                                                            ? "Off"
                                                            : "On"}
                                                    </button>
                                                    <button
                                                        className={`sellers-btn sellers-btn--sm ${
                                                            s.is_blocked
                                                                ? "sellers-btn--success"
                                                                : "sellers-btn--danger"
                                                        }`}
                                                        onClick={() =>
                                                            toggleBlock(s.id)
                                                        }
                                                        disabled={
                                                            updatingId === s.id
                                                        }
                                                        title={
                                                            s.is_blocked
                                                                ? "Unblock seller"
                                                                : "Block seller"
                                                        }
                                                    >
                                                        {s.is_blocked
                                                            ? "Unblock"
                                                            : "Block"}
                                                    </button>
                                                    <button
                                                        className="sellers-btn sellers-btn--outline sellers-btn--sm"
                                                        onClick={() =>
                                                            setHistorySeller(s)
                                                        }
                                                        disabled={
                                                            updatingId === s.id
                                                        }
                                                        title="View order history"
                                                    >
                                                        <Icon
                                                            name="layers"
                                                            size={12}
                                                        />
                                                        Order history
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                <AdminDataTableControls
                    sortBy={sortBy}
                    onSortChange={(value) => {
                        setSortBy(value);
                        setPage(1);
                    }}
                    sortOptions={[
                        { value: "newest", label: "Newest first" },
                        { value: "name_asc", label: "Name: A to Z" },
                        { value: "name_desc", label: "Name: Z to A" },
                        { value: "company_asc", label: "Company: A to Z" },
                        { value: "credit_desc", label: "Credit limit: high to low" },
                    ]}
                    pageSize={perPage}
                    pageSizes={[10, 20, 50, 100]}
                    onPageSizeChange={(value) => {
                        setPerPage(value);
                        setPage(1);
                    }}
                    page={page}
                    pageCount={meta?.last_page || 1}
                    total={meta?.total ?? sellers.length}
                    countLabel="seller"
                    onPageChange={setPage}
                />

                {/* Order History Modal */}
                {historySeller && (
                    <OrderHistoryModal
                        seller={historySeller}
                        onClose={() => setHistorySeller(null)}
                    />
                )}
            </div>
        </AdminLayout>
    );
}
