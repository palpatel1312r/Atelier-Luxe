import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import api from "../../api/client";
import Icon from "../../components/ui/Icon";
import "../../styles/admin-common.css";
import "../../styles/admin-settings.css";

/* ---------- notification types ---------- */
const TYPES = [
    {
        id: "general",
        label: "General",
        hint: "A plain announcement",
        icon: "bell",
        tone: "neutral",
    },
    {
        id: "offer",
        label: "Offer / Sale",
        hint: "Discounts and coupons",
        icon: "tag",
        tone: "brass",
    },
    {
        id: "new_product",
        label: "New Product",
        hint: "Catalog addition",
        icon: "box",
        tone: "blue",
    },
    {
        id: "price_updated",
        label: "Price Update",
        hint: "Rate change notice",
        icon: "trending",
        tone: "amber",
    },
    {
        id: "stock_updated",
        label: "Stock Update",
        hint: "Availability change",
        icon: "layers",
        tone: "green",
    },
];

const MAX_TITLE = 80;
const MAX_MESSAGE = 500;

export default function AdminBroadcast() {
    const [groups, setGroups] = useState([]);
    const [form, setForm] = useState({
        title: "",
        message: "",
        target_group_id: "",
        type: "general",
    });
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");
    const [sending, setSending] = useState(false);

    /* ---------- load groups ---------- */
    useEffect(() => {
        api.get("/admin/groups")
            .then(({ data }) => setGroups(data.data ?? []))
            .catch(() => {});
    }, []);

    /* ---------- derived ---------- */
    const audienceLabel = useMemo(() => {
        if (!form.target_group_id) return "All dealers";
        const g = groups.find(
            (x) => String(x.id) === String(form.target_group_id),
        );
        return g ? `${g.name} only` : "All dealers";
    }, [form.target_group_id, groups]);

    const activeType = useMemo(
        () => TYPES.find((t) => t.id === form.type) ?? TYPES[0],
        [form.type],
    );

    const canSend =
        form.title.trim().length > 0 &&
        form.message.trim().length > 0 &&
        !sending;

    /* ---------- handlers ---------- */
    const update = (key, value) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    const reset = () => {
        setForm({
            title: "",
            message: "",
            target_group_id: "",
            type: "general",
        });
        setSuccess("");
        setError("");
    };

    const send = async (e) => {
        e.preventDefault();
        if (!canSend) return;

        setSending(true);
        setSuccess("");
        setError("");

        try {
            await api.post("/admin/notifications/broadcast", {
                ...form,
                target_group_id: form.target_group_id || undefined,
            });
            setSuccess(`Notification sent to ${audienceLabel}.`);
            setForm({
                title: "",
                message: "",
                target_group_id: "",
                type: "general",
            });
            setTimeout(() => setSuccess(""), 4000);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Could not send the notification. Please try again.",
            );
        } finally {
            setSending(false);
        }
    };

    return (
        <AdminLayout>
            <div className="admin-page__container">
                {/* ---------- Header ---------- */}
                <header className="settings-head">
                    <p className="settings-head__eyebrow">Outreach</p>
                    <h1 className="settings-head__title">Send notification</h1>
                    <p className="settings-head__sub">
                        Broadcast a message to every dealer, or target a
                        specific group.
                    </p>
                </header>

                <form
                    className="admin-card admin-card--settings"
                    onSubmit={send}
                    noValidate
                >
                    <div className="admin-card__header">
                        <div>
                            <h3 className="admin-card__title">
                                Compose broadcast
                            </h3>
                            <p className="admin-card__sub">
                                Dealers receive this in their notifications feed
                                instantly.
                            </p>
                        </div>
                        <span className="admin-card__badge">
                            {audienceLabel}
                        </span>
                    </div>

                    {/* ---------- Audience ---------- */}
                    <div className="broadcast-section">
                        <label
                            htmlFor="bc-audience"
                            className="broadcast-section__label"
                        >
                            Send to
                        </label>
                        <div className="broadcast-select">
                            <span className="broadcast-select__icon">
                                <Icon name="users" size={15} />
                            </span>
                            <select
                                id="bc-audience"
                                value={form.target_group_id}
                                onChange={(e) =>
                                    update("target_group_id", e.target.value)
                                }
                            >
                                <option value="">Everyone (all dealers)</option>
                                {groups.map((g) => (
                                    <option key={g.id} value={g.id}>
                                        {g.name} only
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* ---------- Type ---------- */}
                    <div className="broadcast-section">
                        <p className="broadcast-section__label">Type</p>
                        <div
                            className="broadcast-types"
                            role="radiogroup"
                            aria-label="Notification type"
                        >
                            {TYPES.map((t) => {
                                const active = form.type === t.id;
                                return (
                                    <label
                                        key={t.id}
                                        className={`broadcast-type broadcast-type--${t.tone} ${
                                            active
                                                ? "broadcast-type--active"
                                                : ""
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="type"
                                            value={t.id}
                                            checked={active}
                                            onChange={() =>
                                                update("type", t.id)
                                            }
                                        />
                                        <span className="broadcast-type__icon">
                                            <Icon name={t.icon} size={16} />
                                        </span>
                                        <span className="broadcast-type__body">
                                            <span className="broadcast-type__label">
                                                {t.label}
                                            </span>
                                            <span className="broadcast-type__hint">
                                                {t.hint}
                                            </span>
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* ---------- Title ---------- */}
                    <div className="broadcast-section">
                        <label
                            htmlFor="bc-title"
                            className="broadcast-section__label"
                        >
                            Title
                            <span className="broadcast-section__count">
                                {form.title.length}/{MAX_TITLE}
                            </span>
                        </label>
                        <input
                            id="bc-title"
                            type="text"
                            className="broadcast-input"
                            value={form.title}
                            onChange={(e) =>
                                update(
                                    "title",
                                    e.target.value.slice(0, MAX_TITLE),
                                )
                            }
                            placeholder="e.g. Monsoon Sale Live Now"
                            maxLength={MAX_TITLE}
                            required
                        />
                    </div>

                    {/* ---------- Message ---------- */}
                    <div className="broadcast-section">
                        <label
                            htmlFor="bc-message"
                            className="broadcast-section__label"
                        >
                            Message
                            <span className="broadcast-section__count">
                                {form.message.length}/{MAX_MESSAGE}
                            </span>
                        </label>
                        <textarea
                            id="bc-message"
                            className="broadcast-textarea"
                            value={form.message}
                            onChange={(e) =>
                                update(
                                    "message",
                                    e.target.value.slice(0, MAX_MESSAGE),
                                )
                            }
                            placeholder="Write the message dealers will see…"
                            maxLength={MAX_MESSAGE}
                            rows={5}
                            required
                        />
                    </div>

                    {/* ---------- Live preview ---------- */}
                    {(form.title || form.message) && (
                        <div className="broadcast-section">
                            <p className="broadcast-section__label">Preview</p>
                            <div
                                className={`broadcast-preview broadcast-preview--${activeType.tone}`}
                            >
                                <span className="broadcast-preview__icon">
                                    <Icon name={activeType.icon} size={16} />
                                </span>
                                <div className="broadcast-preview__body">
                                    <span className="broadcast-preview__type">
                                        {activeType.label}
                                    </span>
                                    <span className="broadcast-preview__title">
                                        {form.title || "Untitled"}
                                    </span>
                                    <span className="broadcast-preview__msg">
                                        {form.message ||
                                            "Your message will appear here."}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ---------- Feedback ---------- */}
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

                    {/* ---------- Actions ---------- */}
                    <div className="settings-logo__actions">
                        <button
                            type="button"
                            className="admin-btn admin-btn--ghost"
                            onClick={reset}
                            disabled={sending}
                        >
                            Clear
                        </button>
                        <button
                            type="submit"
                            className="admin-btn admin-btn--brass"
                            disabled={!canSend}
                        >
                            {sending ? (
                                <>
                                    <span className="admin-btn__spin" />
                                    Sending…
                                </>
                            ) : (
                                <>
                                    <Icon name="send" size={15} />
                                    Send notification
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
