import TradeAccountNav from "../components/TradeAccountNav";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/ui/Icon";
import "../styles/profile.css";

const FIELDS = [
    {
        key: "name",
        label: "Full name",
        placeholder: "Your name",
        required: true,
        type: "text",
        icon: "user",
    },
    {
        key: "company_name",
        label: "Company",
        placeholder: "Business name",
        type: "text",
        icon: "building",
    },
    {
        key: "gst_number",
        label: "GST number",
        placeholder: "e.g. 24AAAAA0000A1Z5",
        type: "text",
        icon: "file-text",
        hint: "Used on GST invoices",
    },
    {
        key: "email",
        label: "Email",
        placeholder: "you@company.com",
        type: "email",
        icon: "mail",
    },
];

export default function Profile() {
    const { user, login } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: user?.name || "",
        company_name: user?.company_name || "",
        gst_number: user?.gst_number || "",
        address: user?.address || "",
        email: user?.email || "",
    });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const update = (key, value) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    const saveProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage("");
        setError("");
        try {
            const { data } = await api.put("/profile", form);
            login(localStorage.getItem("auth_token"), data.data);
            setMessage("Profile updated successfully.");
            setTimeout(() => setMessage(""), 4000);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Could not update profile. Please try again.",
            );
        } finally {
            setSaving(false);
        }
    };

    const initials = (form.name || "?")
        .split(" ")
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase();

    return (
        <Layout>
            <TradeAccountNav />
            <div className="profile-page">
                {/* ---------- Header ---------- */}
                <header className="profile-head">
                    <div className="profile-head__left">
                        <p className="profile-head__eyebrow">
                            Account settings
                        </p>
                        <h1 className="profile-head__title">My Profile</h1>
                        <p className="profile-head__sub">
                            Keep your business details up to date.
                        </p>
                    </div>
                    <div className="profile-head__avatar" aria-hidden="true">
                        {initials}
                    </div>
                </header>

                <div className="profile-grid">
                    {/* ---------- Form ---------- */}
                    <form
                        className="profile-card"
                        onSubmit={saveProfile}
                        noValidate
                    >
                        <header className="profile-card__head">
                            <span className="profile-card__icon">
                                <Icon name="building" size={18} />
                            </span>
                            <div>
                                <h2>Company details</h2>
                                <p>These appear on your orders and invoices.</p>
                            </div>
                        </header>

                        <div className="profile-fields">
                            {FIELDS.map((f) => (
                                <div key={f.key} className="profile-field">
                                    <label
                                        htmlFor={`profile-${f.key}`}
                                        className="profile-field__label"
                                    >
                                        {f.label}
                                        {f.required && (
                                            <span
                                                className="profile-field__req"
                                                aria-hidden="true"
                                            >
                                                *
                                            </span>
                                        )}
                                    </label>
                                    <div className="profile-field__control">
                                        <span className="profile-field__lead">
                                            <Icon name={f.icon} size={15} />
                                        </span>
                                        <input
                                            id={`profile-${f.key}`}
                                            type={f.type}
                                            value={form[f.key]}
                                            onChange={(e) =>
                                                update(f.key, e.target.value)
                                            }
                                            placeholder={f.placeholder}
                                            required={f.required}
                                            autoComplete="off"
                                        />
                                    </div>
                                    {f.hint && (
                                        <p className="profile-field__hint">
                                            {f.hint}
                                        </p>
                                    )}
                                </div>
                            ))}

                            <div className="profile-field profile-field--full">
                                <label
                                    htmlFor="profile-address"
                                    className="profile-field__label"
                                >
                                    Address
                                </label>
                                <textarea
                                    id="profile-address"
                                    rows={3}
                                    value={form.address}
                                    onChange={(e) =>
                                        update("address", e.target.value)
                                    }
                                    placeholder="Building, street, city, state, PIN"
                                />
                            </div>
                        </div>

                        {/* Readonly info */}
                        <div className="profile-readonly">
                            <Icon name="phone" size={14} />
                            <span>
                                Phone: <strong>{user?.phone || "—"}</strong> —
                                contact admin to change
                            </span>
                        </div>

                        {/* Feedback */}
                        {message && (
                            <div
                                className="profile-alert profile-alert--success"
                                role="status"
                            >
                                <Icon name="check" size={15} />
                                <span>{message}</span>
                            </div>
                        )}
                        {error && (
                            <div
                                className="profile-alert profile-alert--error"
                                role="alert"
                            >
                                <Icon name="alert" size={15} />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="profile-actions">
                            <button
                                type="button"
                                className="profile-btn profile-btn--ghost"
                                onClick={() => navigate(-1)}
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="profile-btn profile-btn--primary"
                                disabled={saving}
                            >
                                {saving ? (
                                    <>
                                        <span className="profile-btn__spin" />
                                        Saving…
                                    </>
                                ) : (
                                    <>
                                        <Icon name="check" size={15} />
                                        Save changes
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* ---------- Sidebar ---------- */}
                    <aside className="profile-aside">
                        <div className="profile-sidecard">
                            <h3 className="profile-sidecard__title">Account</h3>

                            <div className="profile-identity">
                                <div
                                    className="profile-identity__avatar"
                                    aria-hidden="true"
                                >
                                    {initials}
                                </div>
                                <div className="profile-identity__body">
                                    <span className="profile-identity__name">
                                        {user?.name || "—"}
                                    </span>
                                    <span className="profile-identity__role">
                                        Dealer account
                                    </span>
                                </div>
                            </div>

                            <dl className="profile-meta">
                                <div className="profile-meta__row">
                                    <dt>Email</dt>
                                    <dd>
                                        {user?.email || (
                                            <span className="profile-meta__muted">
                                                Not set
                                            </span>
                                        )}
                                    </dd>
                                </div>
                                <div className="profile-meta__row">
                                    <dt>Phone</dt>
                                    <dd className="profile-meta__mono">
                                        {user?.phone || "—"}
                                    </dd>
                                </div>
                                <div className="profile-meta__row">
                                    <dt>Company</dt>
                                    <dd>
                                        {user?.company_name || (
                                            <span className="profile-meta__muted">
                                                Not set
                                            </span>
                                        )}
                                    </dd>
                                </div>
                                {user?.gst_number && (
                                    <div className="profile-meta__row">
                                        <dt>GST</dt>
                                        <dd className="profile-meta__mono">
                                            {user.gst_number}
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </div>

                        <div className="profile-sidecard profile-sidecard--info">
                            <div className="profile-sidecard__head">
                                <Icon name="shield" size={16} />
                                <h3>Security</h3>
                            </div>
                            <p>
                                To change your password, use{" "}
                                <button
                                    type="button"
                                    className="profile-sidecard__link"
                                    onClick={() =>
                                        navigate("/profile/password")
                                    }
                                >
                                    change password
                                </button>
                                . For phone number changes, contact your
                                administrator.
                            </p>
                        </div>
                    </aside>
                </div>
            </div>
        </Layout>
    );
}
