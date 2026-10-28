import { useEffect, useRef, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import api from "../../api/client";
import Icon from "../../components/ui/Icon";
import "../../styles/admin-common.css";
import "../../styles/admin-bulk-upload.css";

export default function AdminBulkUpload() {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(true);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const loadLogs = () => {
        setLoadingLogs(true);
        api.get("/admin/bulk-upload/logs")
            .then(({ data }) => setLogs(data.data || []))
            .finally(() => setLoadingLogs(false));
    };

    useEffect(() => {
        loadLogs();
    }, []);

    const downloadSample = async () => {
        try {
            const response = await api.get("/admin/bulk-upload/sample", {
                responseType: "blob",
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", "bulk_upload_sample.csv");
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert(
                err.response?.data?.message ||
                    "Could not download sample file.",
            );
        }
    };

    const upload = async (e) => {
        e.preventDefault();
        if (!file) return;
        setUploading(true);
        setResult(null);
        const formData = new FormData();
        formData.append("file", file);
        try {
            const { data } = await api.post(
                "/admin/bulk-upload/products",
                formData,
            );
            setResult(data.data);
            setFile(null);
            loadLogs();
        } catch (err) {
            setResult({
                error: err.response?.data?.message || "Upload failed.",
            });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleFile = (f) => {
        if (!f) return;
        const allowed = [".xlsx", ".xls", ".csv"];
        const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
        if (!allowed.includes(ext)) {
            alert("Please upload an Excel (.xlsx/.xls) or CSV (.csv) file.");
            return;
        }
        setFile(f);
        setResult(null);
    };

    const onDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const dropped = e.dataTransfer.files?.[0];
        handleFile(dropped);
    };

    const onDragOver = (e) => {
        e.preventDefault();
        setDragOver(true);
    };

    const onDragLeave = () => setDragOver(false);

    const clearFile = () => {
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const formatBytes = (bytes) => {
        if (!bytes) return "";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    };

    const statusVariant = (status) => {
        if (status === "completed") return "success";
        if (status === "failed") return "danger";
        return "warning";
    };

    return (
        <AdminLayout>
            <div className="admin-bulk-upload">
                {/* ===== Header ===== */}
                <header className="bu-head">
                    <div>
                        <p className="bu-head__eyebrow">
                            <span className="commerce-dot" />
                            Catalog operations
                        </p>
                        <h1 className="bu-head__title">Bulk Product Upload</h1>
                        <p className="bu-head__sub">
                            Import or update products in bulk from an Excel or
                            CSV file.
                        </p>
                    </div>
                    <div className="bu-head__actions">
                        <button
                            className="bu-btn bu-btn--outline"
                            onClick={downloadSample}
                        >
                            <Icon name="box" size={15} />
                            Download Sample File
                        </button>
                    </div>
                </header>

                {/* ===== Upload card ===== */}
                <section className="bu-card">
                    <div className="bu-card__head">
                        <span className="bu-card__icon">
                            <Icon name="box" size={18} />
                        </span>
                        <div>
                            <h2 className="bu-card__title">Upload your file</h2>
                            <p className="bu-card__sub">
                                Drag & drop or click to choose a file. Max size
                                will depend on your server limits.
                            </p>
                        </div>
                    </div>

                    {/* Info strip */}
                    <div className="bu-info">
                        <span className="bu-info__icon">
                            <Icon name="alert" size={15} />
                        </span>
                        <p style={{ margin: 0 }}>
                            <strong>Expected columns:</strong>{" "}
                            {[
                                "sku",
                                "name",
                                "category",
                                "brand",
                                "mrp",
                                "stock_quantity",
                                "pack_size",
                                "hsn_code",
                                "gst_rate",
                            ].map((c, i, arr) => (
                                <span key={c}>
                                    <code className="bu-info__code">{c}</code>
                                    {i < arr.length - 1 ? " " : ""}
                                </span>
                            ))}
                            . Existing SKUs are <strong>updated</strong>{" "}
                            (stock/price); new SKUs
                            <strong> create new products</strong>.
                        </p>
                    </div>

                    <form onSubmit={upload}>
                        {/* Dropzone */}
                        {!file ? (
                            <label
                                className={`bu-dropzone ${
                                    dragOver ? "bu-dropzone--dragover" : ""
                                }`}
                                onDrop={onDrop}
                                onDragOver={onDragOver}
                                onDragLeave={onDragLeave}
                            >
                                <span className="bu-dropzone__icon">
                                    <Icon name="plus" size={24} />
                                </span>
                                <span className="bu-dropzone__title">
                                    {dragOver
                                        ? "Drop your file here"
                                        : "Choose an Excel or CSV file"}
                                </span>
                                <span className="bu-dropzone__hint">
                                    .xlsx · .xls · .csv · Max 10 MB
                                </span>
                                <input
                                    type="file"
                                    className="bu-dropzone__input"
                                    ref={fileInputRef}
                                    accept=".xlsx,.xls,.csv"
                                    onChange={(e) =>
                                        handleFile(e.target.files?.[0])
                                    }
                                />
                            </label>
                        ) : (
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "center",
                                }}
                            >
                                <div className="bu-file">
                                    <span className="bu-file__icon">
                                        <Icon name="box" size={18} />
                                    </span>
                                    <div className="bu-file__info">
                                        <p className="bu-file__name">
                                            {file.name}
                                        </p>
                                        <p className="bu-file__meta">
                                            {formatBytes(file.size)} ·{" "}
                                            {file.name
                                                .slice(
                                                    file.name.lastIndexOf(".") +
                                                        1,
                                                )
                                                .toUpperCase()}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        className="bu-file__remove"
                                        onClick={clearFile}
                                        aria-label="Remove file"
                                        title="Remove file"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Progress bar while uploading */}
                        {uploading && (
                            <div className="bu-progress">
                                <div className="bu-progress__bar" />
                            </div>
                        )}

                        {/* Actions */}
                        <div className="bu-actions">
                            {file && !uploading && (
                                <button
                                    type="button"
                                    className="bu-btn bu-btn--ghost"
                                    onClick={clearFile}
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                className="bu-btn bu-btn--primary"
                                type="submit"
                                disabled={!file || uploading}
                            >
                                {uploading ? (
                                    <>
                                        <span className="bu-btn__spin" />
                                        Uploading…
                                    </>
                                ) : (
                                    <>
                                        <Icon name="box" size={15} />
                                        Upload File
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* ===== Result ===== */}
                    {result && !result.error && (
                        <div className="bu-result">
                            <div className="bu-result__grid">
                                <div className="bu-result__stat">
                                    <div className="bu-result__label">
                                        Total Rows
                                    </div>
                                    <div className="bu-result__value">
                                        {result.total_rows ?? 0}
                                    </div>
                                </div>
                                <div className="bu-result__stat bu-result__stat--success">
                                    <div className="bu-result__label">
                                        Success
                                    </div>
                                    <div className="bu-result__value bu-result__value--success">
                                        {result.success_rows ?? 0}
                                    </div>
                                </div>
                                <div className="bu-result__stat bu-result__stat--danger">
                                    <div className="bu-result__label">
                                        Failed
                                    </div>
                                    <div className="bu-result__value bu-result__value--danger">
                                        {result.failed_rows ?? 0}
                                    </div>
                                </div>
                            </div>

                            {result.errors?.length > 0 && (
                                <div className="bu-errors">
                                    <div className="bu-errors__head">
                                        <Icon name="alert" size={14} />
                                        Row errors ({result.errors.length})
                                    </div>
                                    <ul className="bu-errors__list">
                                        {result.errors.map((e, i) => (
                                            <li
                                                key={i}
                                                className="bu-errors__item"
                                            >
                                                <span className="bu-errors__row">
                                                    Row {e.row}
                                                </span>
                                                <span className="bu-errors__msg">
                                                    {e.message}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {result?.error && (
                        <div className="bu-alert bu-alert--error" role="alert">
                            <Icon name="alert" size={16} />
                            <span>{result.error}</span>
                        </div>
                    )}

                    {result &&
                        !result.error &&
                        (result.success_rows ?? 0) > 0 && (
                            <div
                                className="bu-alert bu-alert--success"
                                role="status"
                            >
                                <Icon name="check" size={16} />
                                <span>
                                    Upload complete. {result.success_rows} row
                                    {result.success_rows !== 1 ? "s" : ""}{" "}
                                    processed successfully.
                                </span>
                            </div>
                        )}
                </section>

                {/* ===== History ===== */}
                <div className="bu-section-title">
                    <h2>Upload History</h2>
                    <span className="bu-section-title__count">
                        {logs.length}
                    </span>
                </div>

                <div className="bu-table-card">
                    {loadingLogs ? (
                        <div className="bu-skeleton">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bu-skeleton__row" />
                            ))}
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="bu-empty">
                            <div className="bu-empty__icon">
                                <Icon name="box" size={28} />
                            </div>
                            <h3>No uploads yet</h3>
                            <p>
                                Your bulk upload history will appear here after
                                your first import.
                            </p>
                        </div>
                    ) : (
                        <div className="bu-table-scroll">
                            <table className="bu-table">
                                <thead>
                                    <tr>
                                        <th>File</th>
                                        <th>Total</th>
                                        <th>Success</th>
                                        <th>Failed</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((l) => (
                                        <tr key={l.id}>
                                            <td>
                                                <div className="bu-table__file">
                                                    <span className="bu-table__file-icon">
                                                        <Icon
                                                            name="box"
                                                            size={14}
                                                        />
                                                    </span>
                                                    <span className="bu-table__file-name">
                                                        {l.file_name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="bu-table__num">
                                                    {l.total_rows}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="bu-table__num bu-table__num--success">
                                                    {l.success_rows}
                                                </span>
                                            </td>
                                            <td>
                                                <span
                                                    className={`bu-table__num ${
                                                        l.failed_rows > 0
                                                            ? "bu-table__num--danger"
                                                            : ""
                                                    }`}
                                                >
                                                    {l.failed_rows}
                                                </span>
                                            </td>
                                            <td>
                                                <span
                                                    className={`bu-status bu-status--${statusVariant(
                                                        l.status,
                                                    )}`}
                                                >
                                                    {l.status}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="bu-table__date">
                                                    {new Date(
                                                        l.created_at,
                                                    ).toLocaleString("en-GB", {
                                                        day: "2-digit",
                                                        month: "short",
                                                        year: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
