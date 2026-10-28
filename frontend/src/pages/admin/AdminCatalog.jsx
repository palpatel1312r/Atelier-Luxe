import { useEffect, useMemo, useRef, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import api from "../../api/client";
import Icon from "../../components/ui/Icon";
import AdminDataTableControls, {
    useAdminDataTable,
} from "../../components/ui/AdminDataTableControls";
import "../../styles/admin-common.css";
import "../../styles/admin-catalog.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function AdminCatalog() {
    const [tab, setTab] = useState("categories");
    const [counts, setCounts] = useState({ categories: 0, brands: 0 });

    useEffect(() => {
        Promise.all([
            api.get("/admin/categories").catch(() => ({ data: { data: [] } })),
            api.get("/admin/brands").catch(() => ({ data: { data: [] } })),
        ]).then(([catRes, brandRes]) => {
            setCounts({
                categories: catRes.data.data?.length || 0,
                brands: brandRes.data.data?.length || 0,
            });
        });
    }, []);

    return (
        <AdminLayout>
            <div className="admin-catalog">
                <header className="ac-head">
                    <div>
                        <p className="ac-head__eyebrow">
                            <span className="commerce-dot" />
                            Catalog operations
                        </p>
                        <h1 className="ac-head__title">Catalog Setup</h1>
                        <p className="ac-head__sub">
                            Manage product categories and brands that organize
                            your catalog.
                        </p>
                    </div>
                </header>

                <div className="ac-tabs" role="tablist">
                    <button
                        role="tab"
                        aria-selected={tab === "categories"}
                        className={`ac-tab ${
                            tab === "categories" ? "ac-tab--active" : ""
                        }`}
                        onClick={() => setTab("categories")}
                    >
                        <Icon name="layers" size={14} />
                        Categories
                        <span className="ac-tab__count">
                            {counts.categories}
                        </span>
                    </button>
                    <button
                        role="tab"
                        aria-selected={tab === "brands"}
                        className={`ac-tab ${
                            tab === "brands" ? "ac-tab--active" : ""
                        }`}
                        onClick={() => setTab("brands")}
                    >
                        <Icon name="tag" size={14} />
                        Brands
                        <span className="ac-tab__count">{counts.brands}</span>
                    </button>
                </div>

                {tab === "categories" ? (
                    <CategoriesPanel
                        onCountChange={(n) =>
                            setCounts((c) => ({ ...c, categories: n }))
                        }
                    />
                ) : (
                    <BrandsPanel
                        onCountChange={(n) =>
                            setCounts((c) => ({ ...c, brands: n }))
                        }
                    />
                )}
            </div>
        </AdminLayout>
    );
}

/* =========================================================
   Shared PDF generator — professional catalog export
   ========================================================= */
function generateCatalogPDF({ heading, items, filenamePrefix }) {
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 210
    const pageHeight = doc.internal.pageSize.getHeight(); // 297
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;

    /* ---------- Brand palette (matches admin UI) ---------- */
    const BRASS = [192, 138, 30];
    const BRASS_DEEP = [168, 118, 21];
    const BRASS_WASH = [254, 249, 240];
    const INK = [26, 46, 68];
    const INK_SOFT = [107, 114, 128];
    const RULE = [226, 230, 223];
    const RULE_SOFT = [240, 243, 237];

    /* ---------- Aggregate stats ---------- */
    const totalEntries = items.length;
    const totalProducts = items.reduce(
        (sum, i) => sum + (i.products?.length || 0),
        0,
    );
    const emptyEntries = items.filter(
        (i) => !i.products || i.products.length === 0,
    ).length;

    /* ============================================================
       HEADER (drawn on first page only)
       ============================================================ */
    const drawHeader = () => {
        // Top brass accent bar
        doc.setFillColor(...BRASS);
        doc.rect(0, 0, pageWidth, 4, "F");

        // Dark header block
        doc.setFillColor(...INK);
        doc.rect(0, 4, pageWidth, 32, "F");

        // Category / brand type label
        doc.setTextColor(...BRASS);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.text("CATALOG EXPORT", margin, 15);

        // Main heading
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text(heading, margin, 23);

        // Right-side stats
        const statsText = `${totalEntries} ${totalEntries === 1 ? "entry" : "entries"} · ${totalProducts} product${totalProducts === 1 ? "" : "s"}`;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(200, 210, 220);
        doc.text(statsText, pageWidth - margin, 23, { align: "right" });

        // Generation date on the far right
        const dateStr = new Date().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
        doc.setFontSize(8);
        doc.setTextColor(150, 165, 180);
        doc.text(`Generated ${dateStr}`, pageWidth - margin, 29, {
            align: "right",
        });

        return 46; // content starts here
    };

    /* ============================================================
       HEADER (drawn on subsequent pages)
       ============================================================ */
    const drawContinuationHeader = () => {
        doc.setFillColor(...BRASS);
        doc.rect(0, 0, pageWidth, 3, "F");

        doc.setTextColor(...INK);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(heading, margin, 14);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...INK_SOFT);
        doc.text("(continued)", pageWidth - margin, 14, {
            align: "right",
        });

        doc.setDrawColor(...RULE);
        doc.setLineWidth(0.3);
        doc.line(margin, 18, pageWidth - margin, 18);

        return 24;
    };

    /* ============================================================
       Draw first page header
       ============================================================ */
    let y = drawHeader();

    /* ============================================================
       EMPTY STATE (no items)
       ============================================================ */
    if (totalEntries === 0) {
        doc.setTextColor(...INK_SOFT);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(11);
        doc.text("No entries to export.", pageWidth / 2, y + 20, {
            align: "center",
        });
        drawFooter();
        doc.save(`${filenamePrefix}-${Date.now()}.pdf`);
        return;
    }

    /* ============================================================
       ENTRIES LOOP
       ============================================================ */
    items.forEach((item, idx) => {
        const productCount = item.products?.length || 0;
        const isLast = idx === items.length - 1;

        /* ---- Reserve space: section header (~10mm) + table header (~8mm) ---- */
        const reservedSpace = 20;
        const estimatedTableHeight = 8 + Math.min(productCount, 3) * 6 + 4;

        /* ---- Page break check ---- */
        const spaceNeeded =
            productCount === 0
                ? reservedSpace
                : reservedSpace + estimatedTableHeight;

        if (y + spaceNeeded > pageHeight - 20) {
            doc.addPage();
            y = drawContinuationHeader();
        }

        /* ============================================================
           Section header
           ============================================================ */
        // Number badge (left)
        doc.setFillColor(...BRASS);
        doc.roundedRect(margin, y - 4.5, 8, 8, 1.5, 1.5, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(String(idx + 1), margin + 4, y + 0.7, {
            align: "center",
        });

        // Entry name
        doc.setTextColor(...INK);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        const nameMaxWidth = contentWidth - 80; // leave room for count pill
        const nameText =
            item.name.length > 60 ? item.name.slice(0, 57) + "…" : item.name;
        doc.text(nameText, margin + 12, y + 1);

        // Product count badge (right)
        const countLabel = `${productCount} product${productCount === 1 ? "" : "s"}`;
        const countW = doc.getTextWidth(countLabel) + 8;
        const countX = pageWidth - margin - countW;

        if (productCount === 0) {
            doc.setFillColor(...RULE_SOFT);
            doc.roundedRect(countX, y - 4, countW, 6, 3, 3, "F");
            doc.setTextColor(...INK_SOFT);
        } else {
            doc.setFillColor(...BRASS_WASH);
            doc.roundedRect(countX, y - 4, countW, 6, 3, 3, "F");
            doc.setDrawColor(...BRASS);
            doc.setLineWidth(0.2);
            doc.roundedRect(countX, y - 4, countW, 6, 3, 3, "S");
            doc.setTextColor(...BRASS_DEEP);
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.text(countLabel, pageWidth - margin - countW / 2, y, {
            align: "center",
        });

        // Divider under header
        doc.setDrawColor(...RULE);
        doc.setLineWidth(0.3);
        doc.line(margin, y + 5, pageWidth - margin, y + 5);

        y += 10;

        /* ============================================================
           Products table (or empty state)
           ============================================================ */
        if (productCount === 0) {
            doc.setFont("helvetica", "italic");
            doc.setFontSize(9);
            doc.setTextColor(...INK_SOFT);
            doc.text("No products assigned to this entry.", margin + 2, y);
            y += 8;
        } else {
            autoTable(doc, {
                startY: y,
                head: [["ID", "PRODUCT NAME", "SKU"]],
                body: item.products.map((p) => [
                    String(p.id),
                    p.name || "—",
                    p.sku || p.product_code || "—",
                ]),
                margin: { left: margin, right: margin },
                styles: {
                    font: "helvetica",
                    fontSize: 9,
                    cellPadding: {
                        top: 3.5,
                        bottom: 3.5,
                        left: 4,
                        right: 4,
                    },
                    textColor: INK,
                    lineColor: RULE_SOFT,
                    lineWidth: 0.15,
                    valign: "middle",
                    overflow: "linebreak",
                },
                headStyles: {
                    fillColor: [242, 244, 240],
                    textColor: INK_SOFT,
                    fontStyle: "bold",
                    fontSize: 8,
                    halign: "left",
                    cellPadding: {
                        top: 4,
                        bottom: 4,
                        left: 4,
                        right: 4,
                    },
                    lineWidth: 0,
                },
                alternateRowStyles: {
                    fillColor: [250, 251, 248],
                },
                columnStyles: {
                    0: {
                        cellWidth: 16,
                        halign: "center",
                        fontStyle: "bold",
                        textColor: BRASS_DEEP,
                    },
                    1: { cellWidth: "auto", halign: "left" },
                    2: {
                        cellWidth: 42,
                        halign: "left",
                        font: "courier",
                        fontSize: 8.5,
                        textColor: INK_SOFT,
                    },
                },
                theme: "grid",
                tableLineColor: RULE,
                tableLineWidth: 0.15,
                didDrawPage: (data) => {
                    // If autoTable spills onto a new page, draw a light
                    // continuation header
                    if (data.pageNumber > 1 && data.cursor?.y <= 30) {
                        drawContinuationHeader();
                    }
                },
            });

            y = doc.lastAutoTable.finalY + 10;
        }

        /* ============================================================
           Spacer between entries (except after the last one)
           ============================================================ */
        if (!isLast) {
            doc.setDrawColor(...RULE_SOFT);
            doc.setLineWidth(0.4);
            doc.setLineDashPattern([1, 1.5], 0);
            doc.line(margin, y - 2, pageWidth - margin, y - 2);
            doc.setLineDashPattern([], 0);
            y += 6;
        }
    });

    /* ============================================================
       FOOTER (drawn on every page)
       ============================================================ */
    function drawFooter() {
        const pageCount = doc.internal.getNumberOfPages();

        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);

            const footerY = pageHeight - 12;

            // Divider
            doc.setDrawColor(...RULE);
            doc.setLineWidth(0.3);
            doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

            // Left: catalog name
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.5);
            doc.setTextColor(...INK_SOFT);
            doc.text(heading, margin, footerY);

            // Center: page number
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, footerY, {
                align: "center",
            });

            // Right: brand
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(...INK_SOFT);
            doc.text("B2B Wholesale", pageWidth - margin, footerY, {
                align: "right",
            });
        }
    }

    drawFooter();
    doc.save(`${filenamePrefix}-${Date.now()}.pdf`);
}
/* =========================================================
   Categories Panel
   ========================================================= */
function CategoriesPanel({ onCountChange }) {
    const [categories, setCategories] = useState([]);
    const [name, setName] = useState("");
    const [parentId, setParentId] = useState("");
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("success");
    const [parentQuery, setParentQuery] = useState("");
    const [showParentDropdown, setShowParentDropdown] = useState(false);
    const [selected, setSelected] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const parentWrapRef = useRef(null);

    const showMsg = (text, type = "success") => {
        setMessage(text);
        setMessageType(type);
        setTimeout(() => setMessage(""), 2500);
    };

    const filteredParents = categories
        .filter((c) => c.name.toLowerCase().includes(parentQuery.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));

    const load = () => {
        setLoading(true);
        api.get("/admin/categories")
            .then(({ data }) => {
                setCategories(data.data);
                onCountChange?.(data.data?.length || 0);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* Close parent dropdown on outside click */
    useEffect(() => {
        const onDoc = (e) => {
            if (
                parentWrapRef.current &&
                !parentWrapRef.current.contains(e.target)
            ) {
                setShowParentDropdown(false);
            }
        };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, []);

    const clearParentSearch = () => {
        setParentQuery("");
        setParentId("");
        setShowParentDropdown(false);
    };

    const create = async (e) => {
        e.preventDefault();
        try {
            await api.post("/admin/categories", {
                name,
                parent_id: parentId || null,
            });
            setName("");
            setParentId("");
            setParentQuery("");
            showMsg("Category created", "success");
            load();
        } catch (err) {
            showMsg(err.response?.data?.message || "Failed.", "error");
        }
    };

    const remove = async (id) => {
        if (!confirm("Delete this category?")) return;
        try {
            await api.delete(`/admin/categories/${id}`);
            load();
        } catch (err) {
            alert(err.response?.data?.message || "Could not delete.");
        }
    };

    const toggleSelect = (id) =>
        setSelected((s) =>
            s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
        );

    const allSelected =
        categories.length > 0 && selected.length === categories.length;

    const toggleSelectAll = () =>
        setSelected(allSelected ? [] : categories.map((c) => c.id));

    const clearSelection = () => {
        setSelected([]);
        showMsg("Selection cleared.", "success");
    };

    const generatePDF = async () => {
        const idsToFetch =
            selected.length > 0 ? selected : categories.map((c) => c.id);

        if (idsToFetch.length === 0) {
            alert("No categories to export.");
            return;
        }

        setGenerating(true);
        try {
            const results = await Promise.all(
                idsToFetch.map((id) =>
                    api
                        .get(`/admin/categories/${id}`)
                        .then(({ data }) => ({
                            id: data.data.id,
                            name: data.data.name,
                            products: data.data.products || [],
                        }))
                        .catch(() => ({
                            id,
                            name:
                                categories.find((c) => c.id === id)?.name ||
                                `Category #${id}`,
                            products: [],
                        })),
                ),
            );

            generateCatalogPDF({
                heading: "Catalog – Categories & Products",
                items: results,
                filenamePrefix: "catalog-categories",
            });
        } catch {
            alert("Could not generate PDF.");
        } finally {
            setGenerating(false);
        }
    };

    /* ---------- derived stats ---------- */
    const stats = useMemo(() => {
        const total = categories.length;
        const topLevel = categories.filter((c) => !c.parent_id).length;
        const withProducts = categories.filter(
            (c) => (c.products_count ?? 0) > 0,
        ).length;
        return { total, topLevel, withProducts };
    }, [categories]);

    const findParentName = (parentId) =>
        categories.find((p) => p.id === parentId)?.name;

    const categoryTable = useAdminDataTable(categories, {
        searchText: (category) =>
            `${category.name} ${findParentName(category.parent_id) || ""} ${category.products_count ?? 0}`,
        sortOptions: [
            {
                value: "name_asc",
                label: "Name: A to Z",
                getValue: (category) => category.name,
            },
            {
                value: "name_desc",
                label: "Name: Z to A",
                getValue: (category) => category.name,
                direction: "desc",
            },
            {
                value: "products_desc",
                label: "Most products",
                getValue: (category) => category.products_count ?? 0,
                direction: "desc",
            },
        ],
    });

    /* ---------- loading skeleton ---------- */
    if (loading && categories.length === 0) {
        return (
            <>
                <div className="ac-card">
                    <div className="ac-skeleton">
                        {[1, 2].map((i) => (
                            <div key={i} className="ac-skeleton__row" />
                        ))}
                    </div>
                </div>
                <div className="ac-table-card">
                    <div className="ac-skeleton">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="ac-skeleton__row" />
                        ))}
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            {/* Stats strip */}
            {categories.length > 0 && (
                <div className="ac-stats">
                    <div className="ac-stats__item">
                        <span className="ac-stats__label">
                            Total categories
                        </span>
                        <span className="ac-stats__value">{stats.total}</span>
                    </div>
                    <div className="ac-stats__item">
                        <span className="ac-stats__label">Top level</span>
                        <span className="ac-stats__value">
                            {stats.topLevel}
                        </span>
                    </div>
                    <div className="ac-stats__item ac-stats__item--success">
                        <span className="ac-stats__label">With products</span>
                        <span className="ac-stats__value">
                            {stats.withProducts}
                        </span>
                    </div>
                </div>
            )}

            {/* Create form card */}
            <section className="ac-card">
                <div className="ac-card__head">
                    <div className="ac-card__title-group">
                        <span className="ac-card__icon">
                            <Icon name="plus" size={18} />
                        </span>
                        <div>
                            <h2 className="ac-card__title">
                                Create a category
                            </h2>
                            <p className="ac-card__sub">
                                Categories help dealers navigate your catalog.
                                Nest them under a parent for hierarchy.
                            </p>
                        </div>
                    </div>
                </div>

                <form className="ac-form" onSubmit={create}>
                    <div className="ac-field">
                        <label className="ac-field__label">Category Name</label>
                        <input
                            className="ac-input"
                            value={name}
                            placeholder="e.g. Bath Towels"
                            onChange={(e) => setName(e.target.value)}
                            required
                            maxLength={80}
                        />
                    </div>

                    <div className="ac-field ac-combobox" ref={parentWrapRef}>
                        <label className="ac-field__label">
                            Parent Category
                            <span className="ac-field__optional">optional</span>
                        </label>
                        <input
                            className="ac-input"
                            value={parentQuery}
                            onChange={(e) => {
                                setParentQuery(e.target.value);
                                setParentId("");
                                setShowParentDropdown(true);
                            }}
                            onFocus={() => setShowParentDropdown(true)}
                            placeholder="Search parent category…"
                            style={{ paddingRight: 36 }}
                        />
                        {parentQuery.length > 0 && (
                            <button
                                type="button"
                                className="ac-input__clear"
                                onClick={clearParentSearch}
                                aria-label="Clear parent search"
                            >
                                ✕
                            </button>
                        )}
                        {showParentDropdown && (
                            <div className="ac-combobox__dropdown">
                                <div
                                    className="ac-combobox__option ac-combobox__option--muted"
                                    onMouseDown={() => {
                                        setParentId("");
                                        setParentQuery("");
                                        setShowParentDropdown(false);
                                    }}
                                >
                                    — Top Level —
                                </div>
                                {filteredParents.map((c) => (
                                    <div
                                        key={c.id}
                                        className="ac-combobox__option"
                                        onMouseDown={() => {
                                            setParentId(c.id);
                                            setParentQuery(c.name);
                                            setShowParentDropdown(false);
                                        }}
                                    >
                                        {c.name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button className="ac-btn ac-btn--primary" type="submit">
                        <Icon name="plus" size={15} />
                        Add Category
                    </button>
                </form>

                <div className="ac-actions">
                    <button
                        type="button"
                        className="ac-btn ac-btn--ghost ac-btn--sm"
                        onClick={clearSelection}
                        disabled={selected.length === 0}
                    >
                        Clear Selection
                        {selected.length > 0 && ` (${selected.length})`}
                    </button>
                    <button
                        type="button"
                        className="ac-btn ac-btn--outline ac-btn--sm"
                        onClick={generatePDF}
                        disabled={generating}
                    >
                        <Icon name="box" size={12} />
                        {generating
                            ? "Generating…"
                            : selected.length > 0
                              ? `Download Selected (${selected.length})`
                              : "Download Catalog (PDF)"}
                    </button>
                </div>

                {message && (
                    <div
                        className={`ac-alert ac-alert--${
                            messageType === "error" ? "error" : "success"
                        }`}
                        role="status"
                    >
                        <Icon
                            name={messageType === "error" ? "alert" : "check"}
                            size={15}
                        />
                        <span>{message}</span>
                    </div>
                )}
            </section>

            {categories.length > 0 && (
                <AdminDataTableControls
                    {...categoryTable}
                    searchPlaceholder="Search categories..."
                />
            )}

            {/* Table */}
            <div className="ac-table-card">
                {categories.length === 0 ? (
                    <div className="ac-empty">
                        <div className="ac-empty__icon">
                            <Icon name="layers" size={28} />
                        </div>
                        <h3>No categories yet</h3>
                        <p>
                            Add your first category above to start building the
                            catalog hierarchy.
                        </p>
                    </div>
                ) : (
                    <div className="ac-table-scroll">
                        <table className="ac-table">
                            <thead>
                                <tr>
                                    <th>
                                        <input
                                            type="checkbox"
                                            className="ac-check"
                                            checked={allSelected}
                                            onChange={toggleSelectAll}
                                            aria-label="Select all categories"
                                        />
                                    </th>
                                    <th>Name</th>
                                    <th>Parent</th>
                                    <th>Products</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categoryTable.rows.length === 0 ? (
                                    <tr>
                                        <td colSpan="5">No categories match your search.</td>
                                    </tr>
                                ) : categoryTable.rows.map((c) => {
                                    const parent = findParentName(c.parent_id);
                                    const isSel = selected.includes(c.id);
                                    const count = c.products_count ?? 0;
                                    return (
                                        <tr
                                            key={c.id}
                                            className={
                                                isSel ? "is-selected" : ""
                                            }
                                        >
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    className="ac-check"
                                                    checked={isSel}
                                                    onChange={() =>
                                                        toggleSelect(c.id)
                                                    }
                                                    aria-label={`Select ${c.name}`}
                                                />
                                            </td>
                                            <td>
                                                <div className="ac-name">
                                                    <span className="ac-name__avatar">
                                                        {c.name
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </span>
                                                    <span className="ac-name__text">
                                                        {c.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                {parent ? (
                                                    <span className="ac-parent">
                                                        {parent}
                                                    </span>
                                                ) : (
                                                    <span className="ac-parent ac-parent--none">
                                                        —
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <span
                                                    className={`ac-count ${
                                                        count === 0
                                                            ? "ac-count--zero"
                                                            : ""
                                                    }`}
                                                >
                                                    {count}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="ac-row-actions">
                                                    <button
                                                        className="ac-btn ac-btn--danger ac-btn--sm"
                                                        onClick={() =>
                                                            remove(c.id)
                                                        }
                                                        title="Delete category"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}

/* =========================================================
   Brands Panel
   ========================================================= */
function BrandsPanel({ onCountChange }) {
    const [brands, setBrands] = useState([]);
    const [name, setName] = useState("");
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("success");
    const [selected, setSelected] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    const showMsg = (text, type = "success") => {
        setMessage(text);
        setMessageType(type);
        setTimeout(() => setMessage(""), 2500);
    };

    const load = () => {
        setLoading(true);
        api.get("/admin/brands")
            .then(({ data }) => {
                setBrands(data.data);
                onCountChange?.(data.data?.length || 0);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const create = async (e) => {
        e.preventDefault();
        try {
            await api.post("/admin/brands", { name });
            setName("");
            showMsg("Brand created", "success");
            load();
        } catch (err) {
            showMsg(err.response?.data?.message || "Failed.", "error");
        }
    };

    const remove = async (id) => {
        if (!confirm("Delete this brand?")) return;
        try {
            await api.delete(`/admin/brands/${id}`);
            load();
        } catch (err) {
            alert(err.response?.data?.message || "Could not delete.");
        }
    };

    const toggleSelect = (id) =>
        setSelected((s) =>
            s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
        );

    const allSelected = brands.length > 0 && selected.length === brands.length;

    const toggleSelectAll = () =>
        setSelected(allSelected ? [] : brands.map((b) => b.id));

    const clearSelection = () => {
        setSelected([]);
        showMsg("Selection cleared.", "success");
    };

    const generatePDF = async () => {
        const idsToFetch =
            selected.length > 0 ? selected : brands.map((b) => b.id);

        if (idsToFetch.length === 0) {
            alert("No brands to export.");
            return;
        }

        setGenerating(true);
        try {
            const results = await Promise.all(
                idsToFetch.map((id) =>
                    api
                        .get(`/admin/brands/${id}`)
                        .then(({ data }) => ({
                            id: data.data.id,
                            name: data.data.name,
                            products: data.data.products || [],
                        }))
                        .catch(() => ({
                            id,
                            name:
                                brands.find((b) => b.id === id)?.name ||
                                `Brand #${id}`,
                            products: [],
                        })),
                ),
            );

            generateCatalogPDF({
                heading: "Catalog – Brands & Products",
                items: results,
                filenamePrefix: "catalog-brands",
            });
        } catch {
            alert("Could not generate PDF.");
        } finally {
            setGenerating(false);
        }
    };

    const stats = useMemo(() => {
        const total = brands.length;
        const active = brands.filter((b) => b.is_active).length;
        const inactive = total - active;
        return { total, active, inactive };
    }, [brands]);

    const brandTable = useAdminDataTable(brands, {
        searchText: (brand) => `${brand.name} ${brand.is_active ? "active" : "inactive"}`,
        sortOptions: [
            {
                value: "name_asc",
                label: "Name: A to Z",
                getValue: (brand) => brand.name,
            },
            {
                value: "name_desc",
                label: "Name: Z to A",
                getValue: (brand) => brand.name,
                direction: "desc",
            },
            {
                value: "status",
                label: "Status",
                getValue: (brand) => (brand.is_active ? 1 : 0),
                direction: "desc",
            },
        ],
    });

    /* ---------- loading skeleton ---------- */
    if (loading && brands.length === 0) {
        return (
            <>
                <div className="ac-card">
                    <div className="ac-skeleton">
                        {[1, 2].map((i) => (
                            <div key={i} className="ac-skeleton__row" />
                        ))}
                    </div>
                </div>
                <div className="ac-table-card">
                    <div className="ac-skeleton">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="ac-skeleton__row" />
                        ))}
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            {/* Stats strip */}
            {brands.length > 0 && (
                <div className="ac-stats">
                    <div className="ac-stats__item">
                        <span className="ac-stats__label">Total brands</span>
                        <span className="ac-stats__value">{stats.total}</span>
                    </div>
                    <div className="ac-stats__item ac-stats__item--success">
                        <span className="ac-stats__label">Active</span>
                        <span className="ac-stats__value">{stats.active}</span>
                    </div>
                    <div className="ac-stats__item ac-stats__item--warn">
                        <span className="ac-stats__label">Inactive</span>
                        <span className="ac-stats__value">
                            {stats.inactive}
                        </span>
                    </div>
                </div>
            )}

            {/* Create form card */}
            <section className="ac-card">
                <div className="ac-card__head">
                    <div className="ac-card__title-group">
                        <span className="ac-card__icon">
                            <Icon name="tag" size={18} />
                        </span>
                        <div>
                            <h2 className="ac-card__title">Create a brand</h2>
                            <p className="ac-card__sub">
                                Group products under a maker or label name.
                            </p>
                        </div>
                    </div>
                </div>

                <form className="ac-form ac-form--single" onSubmit={create}>
                    <div className="ac-field">
                        <label className="ac-field__label">Brand Name</label>
                        <input
                            className="ac-input"
                            placeholder="e.g. Nilkamal"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            maxLength={80}
                        />
                    </div>
                    <button className="ac-btn ac-btn--primary" type="submit">
                        <Icon name="plus" size={15} />
                        Add Brand
                    </button>
                </form>

                <div className="ac-actions">
                    <button
                        type="button"
                        className="ac-btn ac-btn--ghost ac-btn--sm"
                        onClick={clearSelection}
                        disabled={selected.length === 0}
                    >
                        Clear Selection
                        {selected.length > 0 && ` (${selected.length})`}
                    </button>
                    <button
                        type="button"
                        className="ac-btn ac-btn--outline ac-btn--sm"
                        onClick={generatePDF}
                        disabled={generating}
                    >
                        <Icon name="box" size={12} />
                        {generating
                            ? "Generating…"
                            : selected.length > 0
                              ? `Download Selected (${selected.length})`
                              : "Download Catalog (PDF)"}
                    </button>
                </div>

                {message && (
                    <div
                        className={`ac-alert ac-alert--${
                            messageType === "error" ? "error" : "success"
                        }`}
                        role="status"
                    >
                        <Icon
                            name={messageType === "error" ? "alert" : "check"}
                            size={15}
                        />
                        <span>{message}</span>
                    </div>
                )}
            </section>

            {brands.length > 0 && (
                <AdminDataTableControls
                    {...brandTable}
                    searchPlaceholder="Search brands..."
                />
            )}

            {/* Table */}
            <div className="ac-table-card">
                {brands.length === 0 ? (
                    <div className="ac-empty">
                        <div className="ac-empty__icon">
                            <Icon name="tag" size={28} />
                        </div>
                        <h3>No brands yet</h3>
                        <p>
                            Add your first brand above to start organizing
                            products by maker.
                        </p>
                    </div>
                ) : (
                    <div className="ac-table-scroll">
                        <table className="ac-table">
                            <thead>
                                <tr>
                                    <th>
                                        <input
                                            type="checkbox"
                                            className="ac-check"
                                            checked={allSelected}
                                            onChange={toggleSelectAll}
                                            aria-label="Select all brands"
                                        />
                                    </th>
                                    <th>Name</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {brandTable.rows.length === 0 ? (
                                    <tr>
                                        <td colSpan="4">No brands match your search.</td>
                                    </tr>
                                ) : brandTable.rows.map((b) => {
                                    const isSel = selected.includes(b.id);
                                    return (
                                        <tr
                                            key={b.id}
                                            className={
                                                isSel ? "is-selected" : ""
                                            }
                                        >
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    className="ac-check"
                                                    checked={isSel}
                                                    onChange={() =>
                                                        toggleSelect(b.id)
                                                    }
                                                    aria-label={`Select ${b.name}`}
                                                />
                                            </td>
                                            <td>
                                                <div className="ac-name">
                                                    <span className="ac-name__avatar">
                                                        {b.name
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </span>
                                                    <span className="ac-name__text">
                                                        {b.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <span
                                                    className={`ac-status ac-status--${
                                                        b.is_active
                                                            ? "active"
                                                            : "inactive"
                                                    }`}
                                                >
                                                    {b.is_active
                                                        ? "Active"
                                                        : "Inactive"}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="ac-row-actions">
                                                    <button
                                                        className="ac-btn ac-btn--danger ac-btn--sm"
                                                        onClick={() =>
                                                            remove(b.id)
                                                        }
                                                        title="Delete brand"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}
