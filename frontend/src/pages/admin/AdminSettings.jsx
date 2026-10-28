import { useEffect, useRef, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import api from "../../api/client";
import "../../styles/admin-common.css";
import "../../styles/admin-settings.css";

const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

const humanSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

export default function AdminSettings() {
    const [logo, setLogo] = useState(null);
    const [preview, setPreview] = useState(null);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [dragging, setDragging] = useState(false);

    const fileInputRef = useRef(null);

    /* ---------- load existing logo ---------- */
    useEffect(() => {
        api.get("/settings/logo")
            .then(({ data }) => setLogo(data.logo))
            .catch(() => {});
    }, []);

    /* ---------- cleanup preview URL on unmount ---------- */
    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
        };
    }, [preview]);

    /* ---------- validation ---------- */
    const validate = (selected) => {
        if (!ACCEPTED.includes(selected.type)) {
            return "Unsupported file type. Use PNG, JPG, WebP, or SVG.";
        }
        if (selected.size > MAX_BYTES) {
            return `File too large (${humanSize(selected.size)}). Max 2 MB.`;
        }
        return null;
    };

    /* ---------- file selection ---------- */
    const applyFile = (selected) => {
        setMessage("");
        setError("");
        if (!selected) return;

        const v = validate(selected);
        if (v) {
            setError(v);
            setFile(null);
            if (preview) URL.revokeObjectURL(preview);
            setPreview(null);
            return;
        }

        if (preview) URL.revokeObjectURL(preview);
        setFile(selected);
        setPreview(URL.createObjectURL(selected));
    };

    const handleImageSelect = (e) => {
        applyFile(e.target.files?.[0]);
        // allow re-selecting the same file after removing it
        e.target.value = "";
    };

    const removePreview = () => {
        if (preview) URL.revokeObjectURL(preview);
        setFile(null);
        setPreview(null);
        setMessage("");
        setError("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    /* ---------- drag & drop ---------- */
    const onDragOver = (e) => {
        e.preventDefault();
        if (!uploading) setDragging(true);
    };

    const onDragLeave = (e) => {
        e.preventDefault();
        setDragging(false);
    };

    const onDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        if (uploading) return;
        const dropped = e.dataTransfer.files?.[0];
        applyFile(dropped);
    };

    /* ---------- save ---------- */
    const saveLogo = async () => {
        if (!file) {
            setError("Please select an image first.");
            return;
        }

        setUploading(true);
        setMessage("");
        setError("");

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("folder", "misc");

            const { data: up } = await api.post("/uploads", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            const { data } = await api.post("/admin/settings/logo", {
                path: up.path,
            });

            setLogo(data.logo);
            removePreview();
            setMessage("Logo uploaded successfully.");
            setTimeout(() => setMessage(""), 4000);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Upload failed. Please try again.",
            );
        } finally {
            setUploading(false);
        }
    };

    /* ---------- render ---------- */
    return (
        <AdminLayout>
            <div className="admin-page__container">
                <header className="settings-head">
                    <div>
                        <p className="settings-head__eyebrow">Branding</p>
                        <h1 className="settings-head__title">Settings</h1>
                        <p className="settings-head__sub">
                            Upload your store logo. It appears in the header and
                            on invoices.
                        </p>
                    </div>
                </header>

                <div className="admin-card admin-card--settings">
                    <div className="admin-card__header">
                        <div>
                            <h3 className="admin-card__title">Store logo</h3>
                            <p className="admin-card__sub">
                                PNG, JPG, WebP, or SVG · up to 2 MB
                            </p>
                        </div>
                        <span className="admin-card__badge">
                            {logo ? "Live" : "Not set"}
                        </span>
                    </div>

                    <div className="settings-logo__grid">
                        {/* ---------- Current logo ---------- */}
                        <div className="settings-logo__panel">
                            <p className="settings-logo__label">Current logo</p>
                            {logo ? (
                                <div className="settings-logo__frame">
                                    <img
                                        src={logo}
                                        alt="Current store logo"
                                        className="settings-logo__img"
                                    />
                                </div>
                            ) : (
                                <div className="settings-logo__frame settings-logo__frame--empty">
                                    <span>No logo uploaded yet</span>
                                </div>
                            )}
                        </div>

                        {/* ---------- New logo ---------- */}
                        <div className="settings-logo__panel">
                            <p className="settings-logo__label">New logo</p>

                            {preview ? (
                                <div className="settings-logo__frame settings-logo__frame--preview">
                                    <img
                                        src={preview}
                                        alt="New logo preview"
                                        className="settings-logo__img"
                                    />
                                    <button
                                        type="button"
                                        className="settings-logo__remove-btn"
                                        onClick={removePreview}
                                        disabled={uploading}
                                        aria-label="Remove selected image"
                                    >
                                        ✕
                                    </button>
                                    {file && (
                                        <span className="settings-logo__meta">
                                            {file.name} · {humanSize(file.size)}
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    className={`settings-logo__dropzone ${
                                        dragging ? "is-dragging" : ""
                                    }`}
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                    onDragOver={onDragOver}
                                    onDragLeave={onDragLeave}
                                    onDrop={onDrop}
                                    disabled={uploading}
                                >
                                    <span className="settings-logo__dropzone-icon">
                                        <svg
                                            width="22"
                                            height="22"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.8"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="17 8 12 3 7 8" />
                                            <line
                                                x1="12"
                                                y1="3"
                                                x2="12"
                                                y2="15"
                                            />
                                        </svg>
                                    </span>
                                    <span className="settings-logo__dropzone-title">
                                        Click to upload, or drag and drop
                                    </span>
                                    <span className="settings-logo__dropzone-hint">
                                        PNG · JPG · WebP · SVG · max 2 MB
                                    </span>
                                </button>
                            )}

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                onChange={handleImageSelect}
                                disabled={uploading}
                                className="settings-logo__file-input"
                            />
                        </div>
                    </div>

                    {/* ---------- Feedback ---------- */}
                    {message && (
                        <div
                            className="settings-alert settings-alert--success"
                            role="status"
                        >
                            {message}
                        </div>
                    )}
                    {error && (
                        <div
                            className="settings-alert settings-alert--error"
                            role="alert"
                        >
                            {error}
                        </div>
                    )}

                    {/* ---------- Actions ---------- */}
                    <div className="settings-logo__actions">
                        {preview && (
                            <button
                                type="button"
                                className="admin-btn admin-btn--ghost"
                                onClick={removePreview}
                                disabled={uploading}
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            type="button"
                            className="admin-btn admin-btn--brass"
                            onClick={saveLogo}
                            disabled={uploading || !file}
                        >
                            {uploading ? (
                                <>
                                    <span className="admin-btn__spin" />
                                    Uploading…
                                </>
                            ) : (
                                "Save logo"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
