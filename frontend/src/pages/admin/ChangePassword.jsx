import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import api from "../../api/client";
import Icon from "../../components/ui/Icon";
import "../../styles/admin-common.css";
import "../../styles/admin-settings.css";

/* ---------- strength meter ---------- */
const scorePassword = (value) => {
    if (!value) return { score: 0, label: "Empty", tone: "muted" };
    let score = 0;
    if (value.length >= 8) score++;
    if (value.length >= 12) score++;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
    if (/\d/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;

    const map = [
        { label: "Very weak", tone: "danger" },
        { label: "Weak", tone: "danger" },
        { label: "Fair", tone: "warn" },
        { label: "Good", tone: "info" },
        { label: "Strong", tone: "success" },
        { label: "Excellent", tone: "success" },
    ];
    const idx = Math.min(score, map.length - 1);
    return { score, ...map[idx] };
};

const FIELD_META = [
    {
        name: "current_password",
        label: "Current password",
        placeholder: "Enter your current password",
        autoComplete: "current-password",
        icon: "lock",
    },
    {
        name: "password",
        label: "New password",
        placeholder: "At least 8 characters",
        autoComplete: "new-password",
        icon: "key",
        hint: "Use 8+ characters with a mix of letters, numbers, and symbols.",
    },
    {
        name: "password_confirmation",
        label: "Confirm new password",
        placeholder: "Re-enter the new password",
        autoComplete: "new-password",
        icon: "shield",
    },
];

export default function ChangePassword() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        current_password: "",
        password: "",
        password_confirmation: "",
    });
    const [visible, setVisible] = useState({});
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [touched, setTouched] = useState({});

    const strength = useMemo(
        () => scorePassword(form.password),
        [form.password],
    );

    const mismatch = useMemo(
        () =>
            form.password_confirmation.length > 0 &&
            form.password !== form.password_confirmation,
        [form.password, form.password_confirmation],
    );

    const update = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const toggle = (name) =>
        setVisible((prev) => ({ ...prev, [name]: !prev[name] }));

    const changePassword = async (e) => {
        e.preventDefault();
        setMessage("");
        setError("");

        if (form.password !== form.password_confirmation) {
            setError("New password and confirmation do not match.");
            return;
        }

        setSaving(true);
        try {
            await api.put("/admin/profile/password", form);
            setMessage("Password changed successfully. Redirecting…");
            setTimeout(() => navigate("/admin/dashboard"), 1500);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Could not change password. Please try again.",
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminLayout>
            <div className="admin-page__container">
                <header className="settings-head">
                    <p className="settings-head__eyebrow">Account security</p>
                    <h1 className="settings-head__title">Change password</h1>
                    <p className="settings-head__sub">
                        Use a strong, unique password to protect your admin
                        account.
                    </p>
                </header>

                <form
                    className="admin-card admin-card--settings"
                    onSubmit={changePassword}
                    noValidate
                >
                    <div className="admin-card__header">
                        <div>
                            <h3 className="admin-card__title">
                                Password credentials
                            </h3>
                            <p className="admin-card__sub">
                                At least 8 characters, mix letters and numbers.
                            </p>
                        </div>
                    </div>

                    <div className="cpw-fields">
                        {FIELD_META.map((f) => {
                            const value = form[f.name];
                            const shown = !!visible[f.name];
                            const isNew = f.name === "password";
                            const isConfirm =
                                f.name === "password_confirmation";

                            return (
                                <div key={f.name} className="cpw-field">
                                    <label
                                        htmlFor={`cpw-${f.name}`}
                                        className="cpw-field__label"
                                    >
                                        {f.label}
                                    </label>
                                    <div className="cpw-field__control">
                                        <span className="cpw-field__lead">
                                            <Icon name={f.icon} size={15} />
                                        </span>
                                        <input
                                            id={`cpw-${f.name}`}
                                            name={f.name}
                                            type={shown ? "text" : "password"}
                                            value={value}
                                            onChange={update}
                                            onBlur={() =>
                                                setTouched((p) => ({
                                                    ...p,
                                                    [f.name]: true,
                                                }))
                                            }
                                            placeholder={f.placeholder}
                                            required
                                            autoComplete={f.autoComplete}
                                            minLength={
                                                isNew || isConfirm
                                                    ? 8
                                                    : undefined
                                            }
                                        />
                                        <button
                                            type="button"
                                            className="cpw-field__toggle"
                                            onClick={() => toggle(f.name)}
                                            aria-label={
                                                shown
                                                    ? "Hide password"
                                                    : "Show password"
                                            }
                                            aria-pressed={shown}
                                        >
                                            <Icon
                                                name={shown ? "eyeOff" : "eye"}
                                                size={15}
                                            />
                                        </button>
                                    </div>

                                    {/* New-password helpers */}
                                    {isNew && value.length > 0 && (
                                        <div className="cpw-strength">
                                            <div className="cpw-strength__bar">
                                                {[0, 1, 2, 3, 4].map((i) => (
                                                    <span
                                                        key={i}
                                                        className={`cpw-strength__seg ${
                                                            i < strength.score
                                                                ? `is-${strength.tone}`
                                                                : ""
                                                        }`}
                                                    />
                                                ))}
                                            </div>
                                            <span
                                                className={`cpw-strength__label is-${strength.tone}`}
                                            >
                                                {strength.label}
                                            </span>
                                        </div>
                                    )}
                                    {f.hint && !value && (
                                        <p className="cpw-field__hint">
                                            {f.hint}
                                        </p>
                                    )}

                                    {/* Confirm-password mismatch */}
                                    {isConfirm &&
                                        touched[f.name] &&
                                        mismatch && (
                                            <p className="cpw-field__error">
                                                <Icon name="alert" size={13} />
                                                Passwords don't match yet.
                                            </p>
                                        )}
                                    {isConfirm &&
                                        touched[f.name] &&
                                        !mismatch &&
                                        value.length > 0 && (
                                            <p className="cpw-field__ok">
                                                <Icon name="check" size={13} />
                                                Passwords match.
                                            </p>
                                        )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Feedback */}
                    {message && (
                        <div
                            className="settings-alert settings-alert--success"
                            role="status"
                        >
                            <Icon name="check" size={15} />
                            <span>{message}</span>
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
                            type="button"
                            className="admin-btn admin-btn--ghost"
                            onClick={() => navigate(-1)}
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="admin-btn admin-btn--brass"
                            disabled={saving}
                        >
                            {saving ? (
                                <>
                                    <span className="admin-btn__spin" />
                                    Saving…
                                </>
                            ) : (
                                <>
                                    <Icon name="lock" size={15} />
                                    Update password
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
