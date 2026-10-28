import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import api from "../../api/client";
import Icon from "../../components/ui/Icon";
import "../../styles/admin-common.css";
import "../../styles/admin-groups.css";

export default function AdminGroups() {
    const [groups, setGroups] = useState([]);
    const [name, setName] = useState("");
    const [discount, setDiscount] = useState("");
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");
    const [creating, setCreating] = useState(false);

    const [editId, setEditId] = useState(null);
    const [editName, setEditName] = useState("");
    const [editDiscount, setEditDiscount] = useState("");
    const [savingEdit, setSavingEdit] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const [loading, setLoading] = useState(true);

    /* ---------- load ---------- */
    const load = async () => {
        try {
            const { data } = await api.get("/admin/groups");
            setGroups(data.data ?? []);
        } catch {
            setError("Could not load pricing groups.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    /* ---------- derived ---------- */
    const stats = useMemo(() => {
        const totalDealers = groups.reduce(
            (sum, g) => sum + (g.users_count ?? 0),
            0,
        );
        const avgDiscount =
            groups.length === 0
                ? 0
                : groups.reduce(
                      (sum, g) => sum + Number(g.discount_percentage ?? 0),
                      0,
                  ) / groups.length;
        return {
            count: groups.length,
            dealers: totalDealers,
            avgDiscount: avgDiscount.toFixed(1),
        };
    }, [groups]);

    const canCreate = name.trim().length > 0 && !creating;

    /* ---------- create ---------- */
    const create = async (e) => {
        e.preventDefault();
        if (!canCreate) return;

        setCreating(true);
        setError("");
        setSuccess("");
        try {
            await api.post("/admin/groups", {
                name: name.trim(),
                discount_percentage: discount || 0,
            });
            setName("");
            setDiscount("");
            setSuccess("Group created successfully.");
            setTimeout(() => setSuccess(""), 4000);
            await load();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Could not create group. Please try again.",
            );
        } finally {
            setCreating(false);
        }
    };

    /* ---------- edit ---------- */
    const startEdit = (g) => {
        setEditId(g.id);
        setEditName(g.name);
        setEditDiscount(g.discount_percentage ?? 0);
        setError("");
    };

    const cancelEdit = () => {
        setEditId(null);
        setEditName("");
        setEditDiscount("");
    };

    const saveEdit = async () => {
        if (!editName.trim()) {
            setError("Group name cannot be empty.");
            return;
        }
        setSavingEdit(true);
        setError("");
        try {
            await api.put(`/admin/groups/${editId}`, {
                name: editName.trim(),
                discount_percentage: editDiscount,
            });
            setSuccess("Group updated.");
            setTimeout(() => setSuccess(""), 4000);
            cancelEdit();
            await load();
        } catch (err) {
            setError(err.response?.data?.message || "Could not update group.");
        } finally {
            setSavingEdit(false);
        }
    };

    /* ---------- delete ---------- */
    const remove = async (g) => {
        if (
            !window.confirm(
                `Delete "${g.name}"? Dealers in this group will lose their pricing tier.`,
            )
        )
            return;

        setDeletingId(g.id);
        setError("");
        try {
            await api.delete(`/admin/groups/${g.id}`);
            setGroups((prev) => prev.filter((x) => x.id !== g.id));
            setSuccess("Group deleted.");
            setTimeout(() => setSuccess(""), 4000);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Could not delete group. It may still have dealers assigned.",
            );
        } finally {
            setDeletingId(null);
        }
    };

    /* ---------- render ---------- */
    return (
        <AdminLayout>
            <div className="admin-page__container">
                {/* Header */}
                <header className="settings-head">
                    <p className="settings-head__eyebrow">Pricing structure</p>
                    <h1 className="settings-head__title">Pricing groups</h1>
                    <p className="settings-head__sub">
                        Control which price tier each dealer sees. Group prices
                        override the default rate card.
                    </p>
                </header>

                {/* Stats strip */}
                {!loading && groups.length > 0 && (
                    <div className="groups-stats">
                        <div className="groups-stats__item">
                            <span className="groups-stats__label">Groups</span>
                            <span className="groups-stats__value">
                                {stats.count}
                            </span>
                        </div>
                        <div className="groups-stats__item">
                            <span className="groups-stats__label">
                                Dealers assigned
                            </span>
                            <span className="groups-stats__value">
                                {stats.dealers}
                            </span>
                        </div>
                        <div className="groups-stats__item">
                            <span className="groups-stats__label">
                                Avg. discount
                            </span>
                            <span className="groups-stats__value">
                                {stats.avgDiscount}%
                            </span>
                        </div>
                    </div>
                )}

                {/* Create card */}
                <form
                    className="admin-card admin-card--settings"
                    onSubmit={create}
                    noValidate
                >
                    <div className="admin-card__header">
                        <div>
                            <h3 className="admin-card__title">
                                Create a group
                            </h3>
                            <p className="admin-card__sub">
                                Name it after the discount tier you want (e.g.
                                Group A, VIP).
                            </p>
                        </div>
                    </div>

                    <div className="groups-create-grid">
                        <div className="broadcast-section">
                            <label
                                htmlFor="grp-name"
                                className="broadcast-section__label"
                            >
                                Name
                            </label>
                            <input
                                id="grp-name"
                                type="text"
                                className="broadcast-input"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Group A, VIP"
                                required
                                maxLength={40}
                            />
                        </div>

                        <div className="broadcast-section">
                            <label
                                htmlFor="grp-discount"
                                className="broadcast-section__label"
                            >
                                Default discount %
                                <span className="broadcast-section__count">
                                    optional
                                </span>
                            </label>
                            <div className="groups-discount-input">
                                <input
                                    id="grp-discount"
                                    type="number"
                                    className="broadcast-input"
                                    value={discount}
                                    onChange={(e) =>
                                        setDiscount(e.target.value)
                                    }
                                    placeholder="0"
                                    min={0}
                                    max={100}
                                    step="0.5"
                                />
                                <span className="groups-discount-input__suffix">
                                
                                </span>
                            </div>
                        </div>
                    </div>

                    {success && (
                        <div
                            className="settings-alert settings-alert--success"
                            role="status"
                        >
                            <Icon name="check" size={15} />
                            <span>{success}</span>
                        </div>
                    )}
                    {error && (
                        <div
                            className="settings-alert settings-alert--error"
                            role="alert"
                        >
                            <Icon name="alert" size={15} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="settings-logo__actions">
                        <button
                            type="submit"
                            className="admin-btn admin-btn--brass"
                            disabled={!canCreate}
                        >
                            {creating ? (
                                <>
                                    <span className="admin-btn__spin" />
                                    Creating…
                                </>
                            ) : (
                                <>
                                    <Icon name="plus" size={15} />
                                    Create group
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {/* Groups list */}
                <section className="groups-list-wrap">
                    <header className="groups-list-head">
                        <h2 className="groups-list-head__title">
                            Existing groups
                        </h2>
                        <span className="groups-list-head__count">
                            {groups.length}
                        </span>
                    </header>

                    {loading ? (
                        <div className="groups-skeleton">
                            {[0, 1, 2].map((i) => (
                                <div key={i} className="groups-skeleton__row" />
                            ))}
                        </div>
                    ) : groups.length === 0 ? (
                        <div className="groups-empty">
                            <div className="groups-empty__icon">
                                <Icon name="layers" size={26} />
                            </div>
                            <h3>No groups yet</h3>
                            <p>
                                Create your first group above to start assigning
                                pricing tiers to dealers.
                            </p>
                        </div>
                    ) : (
                        <ul className="groups-list">
                            {groups.map((g) => {
                                const editing = editId === g.id;
                                const deleting = deletingId === g.id;
                                return (
                                    <li
                                        key={g.id}
                                        className={`groups-row ${
                                            editing ? "groups-row--editing" : ""
                                        } ${
                                            deleting
                                                ? "groups-row--deleting"
                                                : ""
                                        }`}
                                    >
                                        {/* Name */}
                                        <div className="groups-row__cell groups-row__cell--name">
                                            {editing ? (
                                                <input
                                                    type="text"
                                                    className="groups-row__input"
                                                    value={editName}
                                                    onChange={(e) =>
                                                        setEditName(
                                                            e.target.value,
                                                        )
                                                    }
                                                    autoFocus
                                                    maxLength={40}
                                                />
                                            ) : (
                                                <>
                                                    <span className="groups-row__avatar">
                                                        {g.name
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </span>
                                                    <div className="groups-row__name-wrap">
                                                        <span className="groups-row__name">
                                                            {g.name}
                                                        </span>
                                                        {g.slug && (
                                                            <span className="groups-row__slug">
                                                                {g.slug}
                                                            </span>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Dealers */}
                                        <div className="groups-row__cell groups-row__cell--dealers">
                                            <span className="groups-row__cell-label">
                                                Dealers
                                            </span>
                                            <span className="groups-row__dealers">
                                                {g.users_count ?? 0}
                                            </span>
                                        </div>

                                        {/* Discount */}
                                        <div className="groups-row__cell groups-row__cell--discount">
                                            <span className="groups-row__cell-label">
                                                Discount
                                            </span>
                                            {editing ? (
                                                <div className="groups-row__discount-edit">
                                                    <input
                                                        type="number"
                                                        className="groups-row__input"
                                                        value={editDiscount}
                                                        onChange={(e) =>
                                                            setEditDiscount(
                                                                e.target.value,
                                                            )
                                                        }
                                                        min={0}
                                                        max={100}
                                                        step="0.5"
                                                    />
                                                    <span>%</span>
                                                </div>
                                            ) : (
                                                <span className="groups-row__discount">
                                                    {Number(
                                                        g.discount_percentage ??
                                                            0,
                                                    )}
                                                    %
                                                </span>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="groups-row__actions">
                                            {editing ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="admin-btn admin-btn--sm admin-btn--brass"
                                                        onClick={saveEdit}
                                                        disabled={savingEdit}
                                                    >
                                                        {savingEdit ? (
                                                            <span className="admin-btn__spin" />
                                                        ) : (
                                                            "Save"
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="admin-btn admin-btn--sm admin-btn--ghost"
                                                        onClick={cancelEdit}
                                                        disabled={savingEdit}
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="admin-btn admin-btn--sm admin-btn--outline"
                                                        onClick={() =>
                                                            startEdit(g)
                                                        }
                                                        disabled={deleting}
                                                    >
                                                        <Icon
                                                            name="edit"
                                                            size={13}
                                                        />
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="admin-btn admin-btn--sm admin-btn--danger"
                                                        onClick={() =>
                                                            remove(g)
                                                        }
                                                        disabled={deleting}
                                                        aria-label={`Delete ${g.name}`}
                                                    >
                                                        {deleting ? (
                                                            <span className="admin-btn__spin" />
                                                        ) : (
                                                            <>
                                                                <Icon
                                                                    name="trash"
                                                                    size={13}
                                                                />
                                                                Delete
                                                            </>
                                                        )}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>
            </div>
        </AdminLayout>
    );
}
