import { useEffect, useMemo, useRef, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import api from "../../api/client";
import Icon from "../../components/ui/Icon";
import Skeleton from "../../components/ui/Skeleton";
import {
    ORDER_STATUS_FLOW,
    ORDER_STATUS_TERMINAL_FAIL,
} from "../../constants/orderStatus";
import "../../styles/admin-common.css";
import "../../styles/admin-orders.css";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ===== Map order_status → badge class ===== */
const statusVariant = (status) => {
    switch (status) {
        case "pending":
            return "warn";
        case "approved":
            return "info";
        case "packing":
            return "teal";
        case "dispatched":
            return "info";
        case "delivered":
            return "success";
        case "rejected":
        case "cancelled":
            return "danger";
        default:
            return "neutral";
    }
};

const paymentBadgeVariant = (status) => {
    switch ((status || "").toLowerCase()) {
        case "paid":
            return "paid";
        case "unpaid":
            return "unpaid";
        case "failed":
            return "failed";
        default:
            return "neutral";
    }
};

const titleCase = (s) =>
    (s || "")
        .toString()
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `₹${num.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

const formatDateTime = (value) => value
    ? new Date(value).toLocaleString("en-IN", {
          day: "2-digit", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit",
      })
    : "";

export default function AdminOrders() {
    const [orders, setOrders] = useState([]);
    const [meta, setMeta] = useState(null);
    const [serverCounts, setServerCounts] = useState(null);
    const [serverRevenue, setServerRevenue] = useState(0);

    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [statusFilter, setStatusFilter] = useState("");
    const [paymentFilter, setPaymentFilter] = useState("");
    const [sortBy, setSortBy] = useState("latest");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);
    const [copiedOrderId, setCopiedOrderId] = useState(null);

    // Slide-over Drawer (Order Details)
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [drawerLoading, setDrawerLoading] = useState(false);

    // Custom Action Modals (Dispatch / Reject)
    const [activeModal, setActiveModal] = useState(null);
    const [dispatchCarrier, setDispatchCarrier] = useState("Delhivery");
    const [dispatchTracking, setDispatchTracking] = useState("");
    const [rejectReason, setRejectReason] = useState("");

    const searchTimer = useRef(null);

    /* ---------- Debounce search input ---------- */
    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearch(val);
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            setDebouncedSearch(val.trim());
            setPage(1);
        }, 320);
    };

    const clearSearch = () => {
        setSearch("");
        setDebouncedSearch("");
        setPage(1);
    };

    /* ---------- Fetch Orders ---------- */
    const load = (isSilent = false) => {
        if (!isSilent) setLoading(true);
        else setRefreshing(true);

        api.get("/admin/orders", {
            params: {
                page,
                per_page: perPage,
                status: statusFilter || undefined,
                payment_status: paymentFilter || undefined,
                search: debouncedSearch || undefined,
                sort_by: sortBy || undefined,
            },
        })
            .then(({ data }) => {
                setOrders(data.data || []);
                setMeta(data);
                if (data.counts) setServerCounts(data.counts);
                if (data.revenue_total != null) setServerRevenue(data.revenue_total);
            })
            .catch((err) => {
                console.error("Failed to load orders:", err);
            })
            .finally(() => {
                setLoading(false);
                setRefreshing(false);
            });
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, perPage, statusFilter, paymentFilter, debouncedSearch, sortBy]);

    /* ---------- Open Order Detail Drawer ---------- */
    const openOrderDetail = async (order) => {
        setSelectedOrder(order);
        setDrawerLoading(true);
        try {
            const { data } = await api.get(`/admin/orders/${order.id}`);
            if (data?.data) {
                setSelectedOrder(data.data);
            }
        } catch (e) {
            console.warn("Could not fetch deep order detail:", e);
        } finally {
            setDrawerLoading(false);
        }
    };

    const closeOrderDetail = () => {
        setSelectedOrder(null);
    };

    /* Close drawer on Escape key */
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === "Escape") {
                if (activeModal) setActiveModal(null);
                else if (selectedOrder) setSelectedOrder(null);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [activeModal, selectedOrder]);

    /* ---------- Copy Order ID ---------- */
    const copyToClipboard = (text, id, e) => {
        e?.stopPropagation();
        if (navigator?.clipboard?.writeText) {
            navigator.clipboard.writeText(text);
            setCopiedOrderId(id);
            setTimeout(() => setCopiedOrderId(null), 2000);
        }
    };

    /* ---------- Stats Counts ---------- */
    const stats = useMemo(() => {
        if (serverCounts) {
            const total = serverCounts.all ?? 0;
            const pending = serverCounts.pending ?? 0;
            const inProgress =
                (serverCounts.approved ?? 0) +
                (serverCounts.packing ?? 0) +
                (serverCounts.dispatched ?? 0);
            const delivered = serverCounts.delivered ?? 0;
            const cancelled = serverCounts.cancelled ?? 0;
            return { total, pending, inProgress, delivered, cancelled };
        }
        // Fallback to currently loaded orders
        const total = meta?.total ?? orders.length;
        const pending = orders.filter((o) => o.order_status === "pending").length;
        const inProgress = orders.filter((o) =>
            ["approved", "packing", "dispatched"].includes(o.order_status),
        ).length;
        const delivered = orders.filter((o) => o.order_status === "delivered").length;
        const cancelled = orders.filter((o) =>
            ["rejected", "cancelled"].includes(o.order_status),
        ).length;
        return { total, pending, inProgress, delivered, cancelled };
    }, [serverCounts, meta, orders]);

    /* ---------- Status Update Action ---------- */
    const updateStatus = async (orderId, status, extra = {}) => {
        try {
            const payload = {
                status,
                reason: extra.reason || null,
                tracking_number: extra.tracking_number || null,
                shipping_partner: extra.shipping_partner || null,
            };

            await api.patch(`/admin/orders/${orderId}/status`, payload);
            setActiveModal(null);
            load(true);

            // If drawer is viewing this order, update drawer too
            if (selectedOrder && selectedOrder.id === orderId) {
                openOrderDetail({ id: orderId });
            }
        } catch (err) {
            alert(err.response?.data?.message || "Could not update status.");
        }
    };

    /* ---------- Next Status Trigger ---------- */
    const handleAdvanceStatus = (order, e) => {
        e?.stopPropagation();
        const current = order.order_status;
        if (current === "pending") {
            updateStatus(order.id, "approved");
        } else if (current === "approved") {
            updateStatus(order.id, "packing");
        } else if (current === "packing") {
            setDispatchCarrier(order.shipping_partner || "Delhivery");
            setDispatchTracking(order.tracking_number || "");
            setActiveModal({ type: "dispatch", order });
        } else if (current === "dispatched") {
            if (window.confirm(`Mark order #${order.order_number} as delivered?`)) {
                updateStatus(order.id, "delivered");
            }
        }
    };

    const handleRejectClick = (order, e) => {
        e?.stopPropagation();
        setRejectReason("");
        setActiveModal({ type: "reject", order });
    };

    /* ---------- Export CSV ---------- */
    const exportOrdersCSV = () => {
        if (!orders.length) return;
        const headers = [
            "Order Number",
            "Dealer Name",
            "Company",
            "Phone",
            "Email",
            "Date",
            "Fulfillment Status",
            "Payment Status",
            "Payment Method",
            "Items Count",
            "Total Amount (INR)",
        ];
        const rows = orders.map((o) => [
            `"${o.order_number || o.id}"`,
            `"${o.user?.name || ""}"`,
            `"${o.user?.company_name || ""}"`,
            `"${o.user?.phone || ""}"`,
            `"${o.user?.email || ""}"`,
            `"${new Date(o.created_at).toLocaleDateString("en-GB")}"`,
            `"${o.order_status}"`,
            `"${o.payment_status || "unpaid"}"`,
            `"${o.payment_method || ""}"`,
            `"${o.items?.length || 0}"`,
            `"${Number(o.grand_total || 0).toFixed(2)}"`,
        ]);
        const csvContent =
            "data:text/csv;charset=utf-8," +
            [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute(
            "download",
            `wholesale-orders-${new Date().toISOString().slice(0, 10)}.csv`,
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    /* ============================================================
       PDF invoice generator (Preserved logic from original)
       ============================================================ */
    const downloadInvoice = async (orderId, e) => {
        e?.stopPropagation();
        setDownloadingInvoiceId(orderId);
        try {
            const { data } = await api.get(`/admin/orders/${orderId}`);
            const o = data.data;
            if (!o) throw new Error("Order data is empty");

            /* ---- Fetch company info ---- */
            let company = {
                name: null,
                address: null,
                phone: null,
                email: null,
                gst: null,
                website: null,
            };
            try {
                const profileRes = await api.get("/profile");
                const admin = profileRes.data?.data;
                if (admin) {
                    company.name = admin.company_name || admin.name || null;
                    company.address = admin.address || null;
                    company.phone = admin.phone || null;
                    company.email = admin.email || null;
                    company.gst = admin.gst_number || null;
                    company.website = null;
                }
            } catch (err) {
                console.warn("Could not fetch admin profile:", err);
            }

            /* ---- Fetch logo ---- */
            let logoDataUrl = null;
            try {
                const logoRes = await api.get("/settings/logo");
                logoDataUrl = logoRes.data?.logo || null;
            } catch (err) {
                console.warn("Logo could not be loaded:", err);
            }

            /* Setup jsPDF */
            const doc = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 16;

            const BRASS = [0, 140, 131];
            const BRASS_DEEP = [0, 109, 104];
            const BRASS_WASH = [232, 248, 245];
            const INK = [20, 43, 73];
            const INK_SOFT = [99, 117, 143];
            const RULE = [225, 232, 242];
            const RULE_SOFT = [237, 241, 247];

            // Top accent bar
            doc.setFillColor(...BRASS);
            doc.rect(0, 0, pageWidth, 4, "F");

            // Header
            const headerY = 16;
            if (logoDataUrl) {
                try {
                    const fmt = logoDataUrl.includes("image/png") ? "PNG" : "JPEG";
                    doc.addImage(
                        logoDataUrl,
                        fmt,
                        margin,
                        headerY,
                        42,
                        16,
                        undefined,
                        "FAST",
                    );
                } catch (err) {
                    console.warn("Logo render failed:", err);
                }
            } else {
                doc.setFillColor(...INK);
                doc.roundedRect(margin, headerY, 42, 16, 2, 2, "F");
                doc.setTextColor(255, 255, 255);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(11);
                doc.text(
                    (company.name || "B2B WHOLESALE").slice(0, 20),
                    margin + 21,
                    headerY + 10,
                    { align: "center" },
                );
            }

            const companyX = margin + 48;
            doc.setTextColor(...INK);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(13);
            doc.text(company.name || "B2B Wholesale", companyX, headerY + 6);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(...INK_SOFT);

            let headerLineY = headerY + 11;
            const headerLines = [];
            if (company.address) headerLines.push(company.address);
            if (company.phone) headerLines.push(`Phone: ${company.phone}`);
            if (company.email) headerLines.push(company.email);
            if (company.gst) headerLines.push(`GSTIN: ${company.gst}`);

            headerLines.slice(0, 2).forEach((line) => {
                doc.text(line, companyX, headerLineY);
                headerLineY += 4.2;
            });

            // INVOICE title
            doc.setTextColor(...INK);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(28);
            doc.text("INVOICE", pageWidth - margin, headerY + 12, {
                align: "right",
            });

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(...INK_SOFT);
            doc.text(
                `#${o.order_number || o.id}`,
                pageWidth - margin,
                headerY + 18,
                { align: "right" },
            );

            // Divider
            let cursorY = 46;
            doc.setDrawColor(...RULE);
            doc.setLineWidth(0.3);
            doc.line(margin, cursorY, pageWidth - margin, cursorY);

            // Billed To + Meta
            cursorY += 10;
            const col1X = margin;
            const col2X = margin + 60;
            const col3X = pageWidth - margin - 55;

            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.setTextColor(...BRASS_DEEP);
            doc.text("BILLED TO", col1X, cursorY);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(...INK);
            doc.text(
                (o.user?.name || "Customer").slice(0, 30),
                col1X,
                cursorY + 6,
            );

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(...INK_SOFT);

            let billY = cursorY + 11;
            if (o.user?.company_name) {
                doc.text(o.user.company_name.slice(0, 30), col1X, billY);
                billY += 4.5;
            }
            if (o.user?.phone) {
                doc.text(`Ph: ${o.user.phone}`, col1X, billY);
                billY += 4.5;
            }
            if (o.user?.email) {
                doc.text(o.user.email.slice(0, 32), col1X, billY);
                billY += 4.5;
            }
            if (o.user?.gst_number) {
                doc.text(`GST: ${o.user.gst_number}`, col1X, billY);
                billY += 4.5;
            }
            if (o.user?.address) {
                const wrapped = doc.splitTextToSize(o.user.address, 55);
                wrapped.slice(0, 3).forEach((line) => {
                    doc.text(line, col1X, billY);
                    billY += 4.2;
                });
            }

            // Ship To
            const shipName = o.shipping_name || o.user?.name;
            const shipAddress = o.shipping_address || o.user?.address;
            const hasShipTo =
                shipAddress && shipAddress !== (o.user?.address || "");

            if (hasShipTo) {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(8);
                doc.setTextColor(...BRASS_DEEP);
                doc.text("SHIP TO", col2X, cursorY);

                doc.setFont("helvetica", "bold");
                doc.setFontSize(10);
                doc.setTextColor(...INK);
                doc.text((shipName || "").slice(0, 30), col2X, cursorY + 6);

                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);
                doc.setTextColor(...INK_SOFT);
                let shipY = cursorY + 11;
                const shipLines = doc.splitTextToSize(shipAddress, 55);
                shipLines.slice(0, 4).forEach((line) => {
                    doc.text(line, col2X, shipY);
                    shipY += 4.2;
                });
            }

            // Meta
            const created = new Date(o.created_at);
            const due = new Date(created);
            due.setDate(due.getDate() + 30);

            const metaRows = [
                [
                    "INVOICE DATE",
                    created.toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                    }),
                ],
                [
                    "DUE DATE",
                    due.toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                    }),
                ],
                ["ORDER STATUS", (o.order_status || "pending").toUpperCase()],
                ["PAYMENT", (o.payment_status || "unpaid").toUpperCase()],
            ];

            if (o.payment_method) {
                metaRows.push([
                    "METHOD",
                    (o.payment_method || "").toUpperCase(),
                ]);
            }

            metaRows.forEach(([label, value], i) => {
                const rowY = cursorY + i * 7;
                doc.setFillColor(...BRASS_WASH);
                doc.roundedRect(col3X - 4, rowY - 3.5, 59, 6.5, 1.5, 1.5, "F");

                doc.setFont("helvetica", "normal");
                doc.setFontSize(7.5);
                doc.setTextColor(...INK_SOFT);
                doc.text(label, col3X, rowY);

                doc.setFont("helvetica", "bold");
                doc.setFontSize(9);
                doc.setTextColor(...INK);
                doc.text(value, pageWidth - margin, rowY, { align: "right" });
            });

            // Table
            const items = o.items || o.order_items || [];
            const tableStartY = Math.max(billY, cursorY + 40) + 8;

            autoTable(doc, {
                startY: tableStartY,
                head: [["#", "DESCRIPTION", "RATE", "QTY", "AMOUNT"]],
                body: items.map((item, idx) => {
                    const name =
                        item.product?.name ||
                        item.product_name ||
                        `Item #${item.product_id}`;
                    const sku = item.product?.sku || item.sku || "";
                    const variant = item.variant?.sku || item.variant_sku;
                    const details = [sku, variant].filter(Boolean).join(" · ");

                    return [
                        String(idx + 1).padStart(2, "0"),
                        details ? `${name}\n${details}` : name,
                        `Rs. ${Number(
                            item.unit_price || item.price || 0,
                        ).toFixed(2)}`,
                        String(item.quantity || 0),
                        `Rs. ${Number(
                            item.total_price || item.total || 0,
                        ).toFixed(2)}`,
                    ];
                }),
                styles: {
                    font: "helvetica",
                    fontSize: 9.5,
                    cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
                    textColor: INK,
                    lineColor: RULE_SOFT,
                    lineWidth: 0,
                    valign: "middle",
                    overflow: "linebreak",
                },
                headStyles: {
                    fillColor: INK,
                    textColor: [255, 255, 255],
                    fontStyle: "bold",
                    fontSize: 8.5,
                    halign: "left",
                    cellPadding: { top: 6, bottom: 6, left: 4, right: 4 },
                },
                alternateRowStyles: {
                    fillColor: [250, 251, 248],
                },
                columnStyles: {
                    0: { cellWidth: 10, halign: "center", fontStyle: "bold" },
                    1: { cellWidth: "auto", halign: "left" },
                    2: { cellWidth: 28, halign: "right" },
                    3: { cellWidth: 16, halign: "center" },
                    4: { cellWidth: 32, halign: "right", fontStyle: "bold" },
                },
                theme: "plain",
                margin: { left: margin, right: margin },
                didDrawPage: () => {
                    doc.setFillColor(...BRASS);
                    doc.rect(0, 0, pageWidth, 3, "F");
                },
            });

            // Totals
            let totalsY = doc.lastAutoTable.finalY + 10;
            if (totalsY > pageHeight - 80) {
                doc.addPage();
                totalsY = 30;
            }

            const totalsBoxW = 80;
            const totalsBoxX = pageWidth - margin - totalsBoxW;
            const itemsSubtotal = items.reduce(
                (sum, i) => sum + Number(i.total_price || i.total || 0),
                0,
            );
            const reportedTotal = Number(
                o.grand_total || o.total_amount || o.subtotal || itemsSubtotal,
            );
            const discountAmount = Number(o.discount_amount || o.discount || 0);
            const taxAmount = Number(o.tax_amount || 0);
            const shippingAmount = Number(
                o.shipping_amount || o.delivery_charge || 0,
            );
            const computedSubtotal =
                itemsSubtotal > 0 ? itemsSubtotal : reportedTotal;

            const totalRows = [
                ["Subtotal", `Rs. ${computedSubtotal.toFixed(2)}`],
            ];
            if (discountAmount > 0) {
                totalRows.push(["Discount", `- Rs. ${discountAmount.toFixed(2)}`]);
            }
            if (shippingAmount > 0) {
                totalRows.push(["Shipping", `Rs. ${shippingAmount.toFixed(2)}`]);
            }
            if (taxAmount > 0) {
                totalRows.push(["Tax", `Rs. ${taxAmount.toFixed(2)}`]);
            }
            totalRows.push(["TOTAL", `Rs. ${reportedTotal.toFixed(2)}`, true]);

            const rowH = 6;
            totalRows.forEach((row, i) => {
                const isTotal = row[2] === true;
                const rowY = totalsY + i * rowH;

                if (isTotal) {
                    doc.setFillColor(...BRASS_WASH);
                    doc.roundedRect(
                        totalsBoxX - 4,
                        rowY - 4.5,
                        totalsBoxW + 8,
                        9,
                        2,
                        2,
                        "F",
                    );
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(11);
                    doc.setTextColor(...BRASS_DEEP);
                    doc.text(row[0], totalsBoxX, rowY + 1);
                    doc.setFontSize(13);
                    doc.text(row[1], pageWidth - margin, rowY + 1, {
                        align: "right",
                    });
                } else {
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(9.5);
                    doc.setTextColor(...INK_SOFT);
                    doc.text(row[0], totalsBoxX, rowY);
                    doc.setTextColor(...INK);
                    doc.text(row[1], pageWidth - margin, rowY, {
                        align: "right",
                    });
                }
            });

            // Save PDF
            doc.save(`Invoice-${o.order_number || orderId}.pdf`);
        } catch (err) {
            console.error("Invoice download error:", err);
            alert(err.message || "Could not generate invoice.");
        } finally {
            setDownloadingInvoiceId(null);
        }
    };

    /* Common Rejection Reasons */
    const REJECT_REASONS = [
        "Stock Unavailable",
        "Dealer Credit Limit Exceeded",
        "Duplicate Order",
        "Pricing Discrepancy",
        "Delivery Area Non-serviceable",
        "Cancelled on Dealer Request",
    ];

    /* Common Carrier Options */
    const CARRIERS = [
        "Delhivery",
        "Blue Dart",
        "DTDC",
        "VRL Logistics",
        "Trackon",
        "In-house Fleet",
        "Other",
    ];

    /* ============================================================
       RENDER
       ============================================================ */
    return (
        <AdminLayout>
            <div className="admin-orders">
                {/* ===== Header ===== */}
                <header className="ao-head">
                    <div>
                        <p className="ao-head__eyebrow">
                            <span className="ao-pulse-dot" />
                            Wholesale Fulfillment Desk
                        </p>
                        <h1 className="ao-head__title">The Order Desk.</h1>
                        <p className="ao-head__sub">
                            Manage dealership purchase orders from initial booking
                            through packing, dispatch, and final delivery.
                        </p>
                    </div>

                    <div className="ao-head__actions">
                        <button
                            className="ao-btn ao-btn--outline"
                            onClick={() => load(true)}
                            disabled={loading || refreshing}
                            title="Refresh orders list"
                        >
                            <Icon
                                name="refresh"
                                size={14}
                                className={refreshing ? "ao-spinner" : ""}
                            />
                            {refreshing ? "Refreshing..." : "Refresh"}
                        </button>
                        <button
                            className="ao-btn ao-btn--outline"
                            onClick={exportOrdersCSV}
                            disabled={!orders.length}
                            title="Export current view to CSV"
                        >
                            <Icon name="download" size={14} />
                            Export CSV
                        </button>
                    </div>
                </header>

                {/* ===== Interactive KPI Metrics Bar ===== */}
                <section
                    className="ao-stats"
                    aria-label="Order summary key performance metrics"
                >
                    <button
                        type="button"
                        className={`ao-stats__item ${statusFilter === "" ? "ao-stats__item--active" : ""}`}
                        onClick={() => {
                            setStatusFilter("");
                            setPage(1);
                        }}
                    >
                        <div className="ao-stats__top">
                            <span className="ao-stats__label">Total Orders</span>
                            <span className="ao-stats__badge">All</span>
                        </div>
                        <span className="ao-stats__value">{stats.total}</span>
                        <span className="ao-stats__subtext">
                            {serverRevenue > 0
                                ? `Vol: ${formatCurrency(serverRevenue)}`
                                : "All recorded orders"}
                        </span>
                    </button>

                    <button
                        type="button"
                        className={`ao-stats__item ao-stats__item--warn ${statusFilter === "pending" ? "ao-stats__item--active" : ""}`}
                        onClick={() => {
                            setStatusFilter("pending");
                            setPage(1);
                        }}
                    >
                        <div className="ao-stats__top">
                            <span className="ao-stats__label">Pending</span>
                            <span className="ao-stats__badge">Action Needed</span>
                        </div>
                        <span className="ao-stats__value">{stats.pending}</span>
                        <span className="ao-stats__subtext">Awaiting approval</span>
                    </button>

                    <button
                        type="button"
                        className={`ao-stats__item ao-stats__item--teal ${["approved", "packing", "dispatched"].includes(statusFilter) ? "ao-stats__item--active" : ""}`}
                        onClick={() => {
                            setStatusFilter("approved");
                            setPage(1);
                        }}
                    >
                        <div className="ao-stats__top">
                            <span className="ao-stats__label">In Fulfillment</span>
                            <span className="ao-stats__badge">Active</span>
                        </div>
                        <span className="ao-stats__value">{stats.inProgress}</span>
                        <span className="ao-stats__subtext">Approved / Packing / En Route</span>
                    </button>

                    <button
                        type="button"
                        className={`ao-stats__item ao-stats__item--success ${statusFilter === "delivered" ? "ao-stats__item--active" : ""}`}
                        onClick={() => {
                            setStatusFilter("delivered");
                            setPage(1);
                        }}
                    >
                        <div className="ao-stats__top">
                            <span className="ao-stats__label">Delivered</span>
                            <span className="ao-stats__badge">Complete</span>
                        </div>
                        <span className="ao-stats__value">{stats.delivered}</span>
                        <span className="ao-stats__subtext">Successfully fulfilled</span>
                    </button>

                    <button
                        type="button"
                        className={`ao-stats__item ao-stats__item--danger ${statusFilter === "cancelled" ? "ao-stats__item--active" : ""}`}
                        onClick={() => {
                            setStatusFilter("cancelled");
                            setPage(1);
                        }}
                    >
                        <div className="ao-stats__top">
                            <span className="ao-stats__label">Cancelled</span>
                            <span className="ao-stats__badge">Void</span>
                        </div>
                        <span className="ao-stats__value">{stats.cancelled}</span>
                        <span className="ao-stats__subtext">Rejected or voided</span>
                    </button>
                </section>

                {/* ===== Status Filter Tabs Strip ===== */}
                <nav className="ao-tabs-bar" aria-label="Order status tabs">
                    <button
                        className={`ao-tab ${statusFilter === "" ? "ao-tab--active" : ""}`}
                        onClick={() => {
                            setStatusFilter("");
                            setPage(1);
                        }}
                    >
                        All Orders
                        <span className="ao-tab__pill">{stats.total}</span>
                    </button>
                    <button
                        className={`ao-tab ${statusFilter === "pending" ? "ao-tab--active" : ""}`}
                        onClick={() => {
                            setStatusFilter("pending");
                            setPage(1);
                        }}
                    >
                        Pending
                        <span className="ao-tab__pill ao-tab__pill--warn">
                            {stats.pending}
                        </span>
                    </button>
                    <button
                        className={`ao-tab ${statusFilter === "approved" ? "ao-tab--active" : ""}`}
                        onClick={() => {
                            setStatusFilter("approved");
                            setPage(1);
                        }}
                    >
                        Approved
                        {serverCounts?.approved != null && (
                            <span className="ao-tab__pill">{serverCounts.approved}</span>
                        )}
                    </button>
                    <button
                        className={`ao-tab ${statusFilter === "packing" ? "ao-tab--active" : ""}`}
                        onClick={() => {
                            setStatusFilter("packing");
                            setPage(1);
                        }}
                    >
                        Packing
                        {serverCounts?.packing != null && (
                            <span className="ao-tab__pill">{serverCounts.packing}</span>
                        )}
                    </button>
                    <button
                        className={`ao-tab ${statusFilter === "dispatched" ? "ao-tab--active" : ""}`}
                        onClick={() => {
                            setStatusFilter("dispatched");
                            setPage(1);
                        }}
                    >
                        Dispatched
                        {serverCounts?.dispatched != null && (
                            <span className="ao-tab__pill">
                                {serverCounts.dispatched}
                            </span>
                        )}
                    </button>
                    <button
                        className={`ao-tab ${statusFilter === "delivered" ? "ao-tab--active" : ""}`}
                        onClick={() => {
                            setStatusFilter("delivered");
                            setPage(1);
                        }}
                    >
                        Delivered
                        <span className="ao-tab__pill">{stats.delivered}</span>
                    </button>
                    <button
                        className={`ao-tab ${statusFilter === "cancelled" ? "ao-tab--active" : ""}`}
                        onClick={() => {
                            setStatusFilter("cancelled");
                            setPage(1);
                        }}
                    >
                        Cancelled / Rejected
                        <span className="ao-tab__pill">{stats.cancelled}</span>
                    </button>
                </nav>

                {/* ===== Search & Filter Toolbar ===== */}
                <div className="ao-toolbar">
                    <div className="ao-search-wrap">
                        <Icon name="search" size={16} className="ao-search-icon" />
                        <input
                            type="search"
                            className="ao-search-input"
                            placeholder="Search order #, dealer name, company, tracking..."
                            value={search}
                            onChange={handleSearchChange}
                        />
                        {search && (
                            <button
                                type="button"
                                className="ao-search-clear"
                                onClick={clearSearch}
                                title="Clear search"
                            >
                                <Icon name="close" size={14} />
                            </button>
                        )}
                    </div>

                    <div className="ao-filter-group">
                        <select
                            className="ao-select"
                            value={paymentFilter}
                            onChange={(e) => {
                                setPaymentFilter(e.target.value);
                                setPage(1);
                            }}
                            aria-label="Filter by payment status"
                        >
                            <option value="">All Payments</option>
                            <option value="paid">Paid</option>
                            <option value="unpaid">Unpaid</option>
                            <option value="pending">Pending</option>
                            <option value="failed">Failed</option>
                        </select>

                        <select
                            className="ao-select"
                            value={sortBy}
                            onChange={(e) => {
                                setSortBy(e.target.value);
                                setPage(1);
                            }}
                            aria-label="Sort orders"
                        >
                            <option value="latest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="amount_desc">Highest Value</option>
                            <option value="amount_asc">Lowest Value</option>
                        </select>

                        <select
                            className="ao-select"
                            value={perPage}
                            onChange={(e) => {
                                setPerPage(Number(e.target.value));
                                setPage(1);
                            }}
                            aria-label="Rows per page"
                        >
                            <option value={10}>10 per page</option>
                            <option value={20}>20 per page</option>
                            <option value={50}>50 per page</option>
                        </select>
                    </div>

                    {/* Active Filter Clear Chip */}
                    {(debouncedSearch || paymentFilter || statusFilter) && (
                        <div className="ao-active-filter-chip">
                            <span>Filters active</span>
                            <button
                                type="button"
                                onClick={() => {
                                    clearSearch();
                                    setStatusFilter("");
                                    setPaymentFilter("");
                                    setPage(1);
                                }}
                                title="Reset all filters"
                            >
                                <Icon name="close" size={12} />
                            </button>
                        </div>
                    )}

                    <span className="ao-toolbar__count">
                        {meta?.total ?? orders.length} order
                        {(meta?.total ?? orders.length) !== 1 ? "s" : ""}
                    </span>
                </div>

                {/* ===== Table Card ===== */}
                <div className="ao-table-card ao-orders-list-card">
                    {loading ? (
                        <div className="ao-skeleton">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="ao-skeleton__row" />
                            ))}
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="ao-empty">
                            <div className="ao-empty__icon">
                                <Icon name="orders" size={32} />
                            </div>
                            <h3>No orders found</h3>
                            <p>
                                {debouncedSearch
                                    ? `No orders matching "${debouncedSearch}".`
                                    : statusFilter
                                      ? `No orders currently match the "${titleCase(statusFilter)}" filter.`
                                      : "Orders placed by wholesale dealers will appear here automatically."}
                            </p>
                            {(debouncedSearch || statusFilter || paymentFilter) && (
                                <button
                                    className="ao-btn ao-btn--outline"
                                    onClick={() => {
                                        clearSearch();
                                        setStatusFilter("");
                                        setPaymentFilter("");
                                    }}
                                >
                                    Reset Filters
                                </button>
                            )}
                        </div>
                    ) : (
                        <div
                            className="ao-table-scroll ao-orders-table-scroll"
                            tabIndex={0}
                            role="region"
                            aria-label="Wholesale orders list"
                        >
                            <table className="ao-table ao-orders-table">
                                <thead>
                                    <tr>
                                        <th>Order #</th>
                                        <th>Dealer & Company</th>
                                        <th>Order Date</th>
                                        <th>Items</th>
                                        <th>Order Value</th>
                                        <th>Payment</th>
                                        <th>Fulfillment Status</th>
                                        <th>Next Action</th>
                                        <th style={{ textAlign: "right" }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((o) => {
                                        const isCopied = copiedOrderId === o.id;
                                        const itemsCount =
                                            o.items?.length ||
                                            o.order_items?.length ||
                                            0;
                                        const firstItemName =
                                            o.items?.[0]?.product?.name || "";

                                        return (
                                            <tr
                                                key={o.id}
                                                onClick={() => openOrderDetail(o)}
                                                title="Click to view full order details"
                                            >
                                                {/* Order # */}
                                                <td data-label="Order #">
                                                    <div className="ao-order-num-block">
                                                        <span className="ao-order-num">
                                                            #{o.order_number || o.id}
                                                            <button
                                                                type="button"
                                                                className="ao-copy-btn"
                                                                onClick={(e) =>
                                                                    copyToClipboard(
                                                                        o.order_number || o.id,
                                                                        o.id,
                                                                        e,
                                                                    )
                                                                }
                                                                title="Copy Order #"
                                                            >
                                                                <Icon
                                                                    name={isCopied ? "check" : "copy"}
                                                                    size={12}
                                                                />
                                                            </button>
                                                        </span>
                                                        <span className="ao-order-type-tag">
                                                            {o.buy_now
                                                                ? "⚡ Direct Buy"
                                                                : "📦 Cart Order"}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Dealer */}
                                                <td data-label="Dealer & Company">
                                                    <div className="ao-dealer">
                                                        <span className="ao-dealer__avatar">
                                                            {o.user?.name
                                                                ?.charAt(0)
                                                                ?.toUpperCase() || "?"}
                                                        </span>
                                                        <div className="ao-dealer__info">
                                                            <span className="ao-dealer__name">
                                                                {o.user?.name || "Unknown"}
                                                            </span>
                                                            <span className="ao-dealer__company">
                                                                {o.user?.company_name ||
                                                                    o.user?.email ||
                                                                    "—"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Date */}
                                                <td data-label="Order Date">
                                                    <div className="ao-date">
                                                        <strong>
                                                            {new Date(
                                                                o.created_at,
                                                            ).toLocaleDateString("en-GB", {
                                                                day: "2-digit",
                                                                month: "short",
                                                                year: "numeric",
                                                            })}
                                                        </strong>
                                                        <span className="ao-date__time">
                                                            {new Date(
                                                                o.created_at,
                                                            ).toLocaleTimeString("en-GB", {
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                            })}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Items */}
                                                <td data-label="Items">
                                                    <div className="ao-items-cell">
                                                        <span className="ao-items-count">
                                                            <Icon name="package" size={13} />
                                                            {itemsCount} item
                                                            {itemsCount !== 1 ? "s" : ""}
                                                        </span>
                                                        {firstItemName && (
                                                            <span
                                                                className="ao-items-summary"
                                                                title={firstItemName}
                                                            >
                                                                {firstItemName}
                                                                {itemsCount > 1
                                                                    ? ` +${itemsCount - 1} more`
                                                                    : ""}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Total */}
                                                <td data-label="Order Value">
                                                    <div className="ao-total-cell">
                                                        <span className="ao-total">
                                                            {formatCurrency(o.grand_total)}
                                                        </span>
                                                        <span className="ao-method-pill">
                                                            {o.payment_method || "COD"}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Payment Status */}
                                                <td data-label="Payment">
                                                    <span
                                                        className={`ao-pay-badge ao-pay-badge--${paymentBadgeVariant(
                                                            o.payment_status,
                                                        )}`}
                                                    >
                                                        {titleCase(
                                                            o.payment_status || "unpaid",
                                                        )}
                                                    </span>
                                                </td>

                                                {/* Status */}
                                                <td data-label="Fulfillment Status">
                                                    <span
                                                        className={`ao-status ao-status--${statusVariant(
                                                            o.order_status,
                                                        )}`}
                                                    >
                                                        {titleCase(o.order_status)}
                                                    </span>
                                                </td>

                                                {/* Next Action */}
                                                <td data-label="Next Action">
                                                    <div
                                                        className="ao-actions"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {o.order_status === "pending" && (
                                                            <>
                                                                <button
                                                                    className="ao-btn ao-btn--primary"
                                                                    onClick={(e) =>
                                                                        handleAdvanceStatus(o, e)
                                                                    }
                                                                    title="Approve order"
                                                                >
                                                                    <Icon name="check" size={12} />
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    className="ao-btn ao-btn--danger"
                                                                    onClick={(e) =>
                                                                        handleRejectClick(o, e)
                                                                    }
                                                                    title="Reject order"
                                                                >
                                                                    Reject
                                                                </button>
                                                            </>
                                                        )}

                                                        {o.order_status === "approved" && (
                                                            <button
                                                                className="ao-btn ao-btn--teal"
                                                                onClick={(e) =>
                                                                    handleAdvanceStatus(o, e)
                                                                }
                                                                title="Mark order as packing"
                                                            >
                                                                <Icon name="box" size={12} />
                                                                Pack Order
                                                            </button>
                                                        )}

                                                        {o.order_status === "packing" && (
                                                            <button
                                                                className="ao-btn ao-btn--primary"
                                                                onClick={(e) =>
                                                                    handleAdvanceStatus(o, e)
                                                                }
                                                                title="Enter courier and dispatch"
                                                            >
                                                                <Icon name="truck" size={13} />
                                                                Dispatch...
                                                            </button>
                                                        )}

                                                        {o.order_status === "dispatched" && (
                                                            <button
                                                                className="ao-btn ao-btn--success"
                                                                onClick={(e) =>
                                                                    handleAdvanceStatus(o, e)
                                                                }
                                                                title="Mark order as delivered"
                                                            >
                                                                <Icon name="check" size={12} />
                                                                Deliver
                                                            </button>
                                                        )}

                                                        {o.order_status === "delivered" && (
                                                            <span
                                                                style={{
                                                                    fontSize: 11,
                                                                    color: "var(--ledger-green)",
                                                                    fontFamily: "var(--font-mono)",
                                                                    fontWeight: 700,
                                                                    display: "inline-flex",
                                                                    alignItems: "center",
                                                                    gap: 4,
                                                                }}
                                                            >
                                                                <Icon name="check" size={12} />
                                                                Completed
                                                            </span>
                                                        )}

                                                        {["rejected", "cancelled"].includes(
                                                            o.order_status,
                                                        ) && (
                                                            <span
                                                                style={{
                                                                    fontSize: 11,
                                                                    color: "var(--rust)",
                                                                    fontFamily: "var(--font-mono)",
                                                                    fontWeight: 600,
                                                                }}
                                                            >
                                                                ✕ {titleCase(o.order_status)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Actions */}
                                                <td data-label="Actions" style={{ textAlign: "right" }}>
                                                    <div
                                                        className="ao-actions"
                                                        style={{ justifyContent: "flex-end" }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <button
                                                            className="ao-btn-view"
                                                            onClick={() => openOrderDetail(o)}
                                                            title="Inspect order details"
                                                        >
                                                            <Icon name="eye" size={13} />
                                                            View
                                                        </button>

                                                        {["approved", "packing", "dispatched", "delivered"].includes(
                                                            o.order_status,
                                                        ) && (
                                                            <button
                                                                className="ao-btn-invoice"
                                                                onClick={(e) =>
                                                                    downloadInvoice(o.id, e)
                                                                }
                                                                disabled={
                                                                    downloadingInvoiceId === o.id
                                                                }
                                                                title="Download PDF invoice"
                                                            >
                                                                {downloadingInvoiceId === o.id ? (
                                                                    <span className="ao-spinner" />
                                                                ) : (
                                                                    <Icon name="download" size={12} />
                                                                )}
                                                                PDF
                                                            </button>
                                                        )}
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

                {/* ===== Pagination ===== */}
                {meta && meta.last_page > 1 && (
                    <div className="ao-pagination">
                        <span className="ao-pagination__info">
                            Showing page <strong>{page}</strong> of{" "}
                            <strong>{meta.last_page}</strong> ({meta.total} total orders)
                        </span>
                        <div className="ao-pagination__controls">
                            <button
                                className="ao-btn ao-btn--outline"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                            >
                                ← Previous
                            </button>
                            <button
                                className="ao-btn ao-btn--outline"
                                disabled={page >= meta.last_page}
                                onClick={() =>
                                    setPage((p) => Math.min(meta.last_page, p + 1))
                                }
                            >
                                Next →
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ============================================================
               SLIDE-OVER DRAWER (Order Details Sheet)
               ============================================================ */}
            {selectedOrder && (
                <>
                    <div
                        className="ao-drawer-backdrop"
                        onClick={closeOrderDetail}
                        aria-hidden="true"
                    />
                    <aside
                        className="ao-drawer"
                        role="dialog"
                        aria-label={`Order details for #${selectedOrder.order_number || selectedOrder.id}`}
                    >
                        {/* Drawer Header */}
                        <div className="ao-drawer__header">
                            <div className="ao-drawer__title-block">
                                <span className="ao-drawer__eyebrow">
                                    Placed on{" "}
                                    {new Date(
                                        selectedOrder.created_at,
                                    ).toLocaleDateString("en-GB", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </span>
                                <h2 className="ao-drawer__title">
                                    Order #{selectedOrder.order_number || selectedOrder.id}
                                    <span
                                        className={`ao-status ao-status--${statusVariant(
                                            selectedOrder.order_status,
                                        )}`}
                                    >
                                        {titleCase(selectedOrder.order_status)}
                                    </span>
                                </h2>
                            </div>

                            <button
                                className="ao-drawer__close"
                                onClick={closeOrderDetail}
                                aria-label="Close order details"
                            >
                                <Icon name="close" size={18} />
                            </button>
                        </div>

                        {/* Drawer Body */}
                        <div className="ao-drawer__body">
                            {/* Stepper tracker */}
                            {["rejected", "cancelled"].includes(
                                selectedOrder.order_status,
                            ) ? (
                                <div className="ao-cancelled-banner">
                                    <Icon name="alert" size={24} />
                                    <div>
                                        <strong>
                                            Order is {titleCase(selectedOrder.order_status)}
                                        </strong>
                                        <p>
                                            This order was terminated and will not be
                                            fulfilled. Stock reservations have been
                                            released.
                                        </p>
                                        {selectedOrder.cancellation && (
                                            <p>
                                                {titleCase(selectedOrder.order_status)} by{" "}
                                                <strong>
                                                    {selectedOrder.cancellation.actor_type === "system"
                                                        ? "System"
                                                        : selectedOrder.cancellation.actor_name ||
                                                          (selectedOrder.cancellation.actor_type === "customer" ? "Customer" : "Administrator")}
                                                </strong>
                                                {selectedOrder.cancellation.cancelled_at
                                                    ? ` on ${formatDateTime(selectedOrder.cancellation.cancelled_at)}`
                                                    : ""}
                                                .
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="ao-stepper">
                                    <div className="ao-stepper__track" />
                                    <div
                                        className="ao-stepper__progress"
                                        style={{
                                            width: `${Math.max(
                                                0,
                                                ORDER_STATUS_FLOW.indexOf(
                                                    selectedOrder.order_status,
                                                ) * 25,
                                            )}%`,
                                        }}
                                    />
                                    {ORDER_STATUS_FLOW.map((step, idx) => {
                                        const currentIdx = ORDER_STATUS_FLOW.indexOf(
                                            selectedOrder.order_status,
                                        );
                                        const isCompleted = idx < currentIdx;
                                        const isActive = idx === currentIdx;
                                        return (
                                            <div
                                                key={step}
                                                className={`ao-step ${
                                                    isCompleted
                                                        ? "ao-step--completed"
                                                        : isActive
                                                          ? "ao-step--active"
                                                          : ""
                                                }`}
                                            >
                                                <div className="ao-step__circle">
                                                    {isCompleted ? (
                                                        <Icon name="check" size={14} />
                                                    ) : (
                                                        idx + 1
                                                    )}
                                                </div>
                                                <span className="ao-step__label">
                                                    {titleCase(step)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Dealer Profile Card */}
                            <div className="ao-card">
                                <div className="ao-card__head">
                                    <h3 className="ao-card__title">
                                        <Icon name="user" size={15} />
                                        Dealer Information
                                    </h3>
                                    {selectedOrder.user?.phone && (
                                        <a
                                            href={`tel:${selectedOrder.user.phone}`}
                                            className="ao-btn ao-btn--outline ao-btn--sm"
                                        >
                                            <Icon name="phone" size={12} />
                                            Call Dealer
                                        </a>
                                    )}
                                </div>

                                <div className="ao-grid-2">
                                    <div className="ao-meta-item">
                                        <span className="ao-meta-label">Contact Name</span>
                                        <span className="ao-meta-value">
                                            {selectedOrder.user?.name || "Unknown"}
                                        </span>
                                    </div>
                                    <div className="ao-meta-item">
                                        <span className="ao-meta-label">Company / Firm</span>
                                        <span className="ao-meta-value">
                                            {selectedOrder.user?.company_name || "—"}
                                        </span>
                                    </div>
                                    <div className="ao-meta-item">
                                        <span className="ao-meta-label">Phone</span>
                                        <span className="ao-meta-value ao-meta-value--mono">
                                            {selectedOrder.user?.phone || "—"}
                                        </span>
                                    </div>
                                    <div className="ao-meta-item">
                                        <span className="ao-meta-label">Email</span>
                                        <span className="ao-meta-value">
                                            {selectedOrder.user?.email || "—"}
                                        </span>
                                    </div>
                                    {selectedOrder.user?.gst_number && (
                                        <div className="ao-meta-item">
                                            <span className="ao-meta-label">GSTIN</span>
                                            <span className="ao-meta-value ao-meta-value--mono">
                                                {selectedOrder.user.gst_number}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Shipping & Delivery Card */}
                            <div className="ao-card">
                                <div className="ao-card__head">
                                    <h3 className="ao-card__title">
                                        <Icon name="mapPin" size={15} />
                                        Shipping & Fulfillment
                                    </h3>
                                    {selectedOrder.tracking_number && (
                                        <span className="ao-order-num">
                                            AWB: {selectedOrder.tracking_number}
                                        </span>
                                    )}
                                </div>

                                <div className="ao-grid-2">
                                    <div className="ao-meta-item">
                                        <span className="ao-meta-label">
                                            Shipping Address
                                        </span>
                                        <span className="ao-meta-value">
                                            {selectedOrder.shipping_address ||
                                                selectedOrder.user?.address ||
                                                "Not specified"}
                                        </span>
                                    </div>

                                    {selectedOrder.billing_address && (
                                        <div className="ao-meta-item">
                                            <span className="ao-meta-label">
                                                Billing Address
                                            </span>
                                            <span className="ao-meta-value">
                                                {selectedOrder.billing_address}
                                            </span>
                                        </div>
                                    )}

                                    {selectedOrder.shipping_partner && (
                                        <div className="ao-meta-item">
                                            <span className="ao-meta-label">
                                                Carrier / Logistics
                                            </span>
                                            <span className="ao-meta-value">
                                                {selectedOrder.shipping_partner}
                                            </span>
                                        </div>
                                    )}

                                    {selectedOrder.tracking_number && (
                                        <div className="ao-meta-item">
                                            <span className="ao-meta-label">
                                                Tracking ID
                                            </span>
                                            <span className="ao-meta-value ao-meta-value--mono">
                                                {selectedOrder.tracking_number}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Items Card */}
                            <div className="ao-card">
                                <div className="ao-card__head">
                                    <h3 className="ao-card__title">
                                        <Icon name="box" size={15} />
                                        Ordered Items (
                                            {selectedOrder.items?.length || 0}
                                        )
                                    </h3>
                                </div>

                                <table className="ao-drawer-items">
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th style={{ textAlign: "right" }}>Rate</th>
                                            <th style={{ textAlign: "center" }}>Qty</th>
                                            <th style={{ textAlign: "right" }}>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(selectedOrder.items || []).map((item, idx) => {
                                            const p = item.product;
                                            const photo =
                                                p?.images?.[0]?.image_path ||
                                                (typeof p?.images?.[0] === "string"
                                                    ? p.images[0]
                                                    : null);
                                            return (
                                                <tr key={item.id || idx}>
                                                    <td>
                                                        <div className="ao-item-row">
                                                            {photo ? (
                                                                <img
                                                                    src={photo}
                                                                    alt={p?.name || ""}
                                                                    className="ao-item-thumb"
                                                                />
                                                            ) : (
                                                                <div className="ao-item-thumb">
                                                                    <Icon name="box" size={20} />
                                                                </div>
                                                            )}
                                                            <div className="ao-item-info">
                                                                <span className="ao-item-name">
                                                                    {p?.name ||
                                                                        item.product_name ||
                                                                        `Item #${item.product_id}`}
                                                                </span>
                                                                <span className="ao-item-variant">
                                                                    {[
                                                                        p?.sku,
                                                                        item.variant?.sku,
                                                                    ]
                                                                        .filter(Boolean)
                                                                        .join(" · ")}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td
                                                        style={{
                                                            textAlign: "right",
                                                            fontFamily: "var(--font-mono)",
                                                            fontSize: 12.5,
                                                        }}
                                                    >
                                                        {formatCurrency(
                                                            item.unit_price || item.price,
                                                        )}
                                                    </td>
                                                    <td
                                                        style={{
                                                            textAlign: "center",
                                                            fontFamily: "var(--font-mono)",
                                                            fontWeight: 700,
                                                        }}
                                                    >
                                                        {item.quantity}
                                                    </td>
                                                    <td
                                                        style={{
                                                            textAlign: "right",
                                                            fontFamily: "var(--font-mono)",
                                                            fontWeight: 700,
                                                            fontSize: 13,
                                                        }}
                                                    >
                                                        {formatCurrency(
                                                            item.total_price || item.total,
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Financials Breakdown */}
                            <div className="ao-card">
                                <div className="ao-card__head">
                                    <h3 className="ao-card__title">
                                        Payment & Financials
                                    </h3>
                                    <span
                                        className={`ao-pay-badge ao-pay-badge--${paymentBadgeVariant(
                                            selectedOrder.payment_status,
                                        )}`}
                                    >
                                        Payment:{" "}
                                        {titleCase(
                                            selectedOrder.payment_status || "unpaid",
                                        )}
                                    </span>
                                </div>

                                <div className="ao-financial-row">
                                    <span>Payment Method</span>
                                    <strong style={{ textTransform: "uppercase" }}>
                                        {selectedOrder.payment_method || "COD"}
                                    </strong>
                                </div>
                                <div className="ao-financial-row">
                                    <span>Items Subtotal</span>
                                    <strong>
                                        {formatCurrency(
                                            selectedOrder.total_amount ||
                                                selectedOrder.grand_total,
                                        )}
                                    </strong>
                                </div>
                                {Number(selectedOrder.discount_amount) > 0 && (
                                    <div className="ao-financial-row">
                                        <span>Discount</span>
                                        <strong style={{ color: "var(--ledger-green)" }}>
                                            -{" "}
                                            {formatCurrency(
                                                selectedOrder.discount_amount,
                                            )}
                                        </strong>
                                    </div>
                                )}
                                {Number(selectedOrder.tax_amount) > 0 && (
                                    <div className="ao-financial-row">
                                        <span>Taxes (GST)</span>
                                        <strong>
                                            {formatCurrency(selectedOrder.tax_amount)}
                                        </strong>
                                    </div>
                                )}
                                <div className="ao-financial-row ao-financial-row--total">
                                    <span>Grand Total</span>
                                    <strong>
                                        {formatCurrency(selectedOrder.grand_total)}
                                    </strong>
                                </div>
                            </div>

                            {/* Customer Notes */}
                            {selectedOrder.notes && (
                                <div className="ao-card">
                                    <h3 className="ao-card__title">Dealer Notes</h3>
                                    <p
                                        style={{
                                            fontSize: 13,
                                            lineHeight: 1.5,
                                            color: "var(--ink)",
                                            margin: 0,
                                        }}
                                    >
                                        {selectedOrder.notes}
                                    </p>
                                </div>
                            )}

                            {/* Status Audit Trail / History */}
                            {selectedOrder.status_history?.length > 0 && (
                                <div className="ao-card">
                                    <h3 className="ao-card__title">
                                        Status Audit Trail
                                    </h3>
                                    <div className="ao-timeline">
                                        {selectedOrder.status_history.map(
                                            (h, index) => (
                                                <div
                                                    key={h.id || index}
                                                    className="ao-timeline-item"
                                                >
                                                    <div className="ao-timeline-dot" />
                                                    <div className="ao-timeline-content">
                                                        <div className="ao-timeline-header">
                                                            <span>
                                                                {h.status_from
                                                                    ? `${titleCase(
                                                                          h.status_from,
                                                                      )} → `
                                                                    : ""}
                                                                {titleCase(h.status_to)}
                                                            </span>
                                                            <span className="ao-timeline-time">
                                                                {new Date(
                                                                    h.created_at,
                                                                ).toLocaleString(
                                                                    "en-GB",
                                                                    {
                                                                        day: "2-digit",
                                                                        month: "short",
                                                                        hour: "2-digit",
                                                                        minute: "2-digit",
                                                                    },
                                                                )}
                                                            </span>
                                                        </div>
                                                        {h.reason_text && (
                                                            <div className="ao-timeline-reason">
                                                                {h.reason_text}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Drawer Footer */}
                        <div className="ao-drawer__footer">
                            <div style={{ display: "flex", gap: 8 }}>
                                <button
                                    className="ao-btn ao-btn--outline"
                                    onClick={(e) =>
                                        downloadInvoice(selectedOrder.id, e)
                                    }
                                    disabled={
                                        downloadingInvoiceId === selectedOrder.id
                                    }
                                >
                                    {downloadingInvoiceId === selectedOrder.id ? (
                                        <span className="ao-spinner" />
                                    ) : (
                                        <Icon name="download" size={14} />
                                    )}
                                    Download Invoice
                                </button>
                                <button
                                    className="ao-btn ao-btn--outline"
                                    onClick={() => window.print()}
                                    title="Print order sheet"
                                >
                                    <Icon name="printer" size={14} />
                                    Print
                                </button>
                            </div>

                            <div style={{ display: "flex", gap: 8 }}>
                                {selectedOrder.order_status === "pending" && (
                                    <>
                                        <button
                                            className="ao-btn ao-btn--danger"
                                            onClick={(e) =>
                                                handleRejectClick(selectedOrder, e)
                                            }
                                        >
                                            Reject Order
                                        </button>
                                        <button
                                            className="ao-btn ao-btn--primary"
                                            onClick={(e) =>
                                                handleAdvanceStatus(selectedOrder, e)
                                            }
                                        >
                                            Approve Order
                                        </button>
                                    </>
                                )}

                                {selectedOrder.order_status === "approved" && (
                                    <button
                                        className="ao-btn ao-btn--teal"
                                        onClick={(e) =>
                                            handleAdvanceStatus(selectedOrder, e)
                                        }
                                    >
                                        Mark as Packing
                                    </button>
                                )}

                                {selectedOrder.order_status === "packing" && (
                                    <button
                                        className="ao-btn ao-btn--primary"
                                        onClick={(e) =>
                                            handleAdvanceStatus(selectedOrder, e)
                                        }
                                    >
                                        Dispatch Order...
                                    </button>
                                )}

                                {selectedOrder.order_status === "dispatched" && (
                                    <button
                                        className="ao-btn ao-btn--success"
                                        onClick={(e) =>
                                            handleAdvanceStatus(selectedOrder, e)
                                        }
                                    >
                                        Mark as Delivered
                                    </button>
                                )}
                            </div>
                        </div>
                    </aside>
                </>
            )}

            {/* ============================================================
               DISPATCH MODAL DIALOG
               ============================================================ */}
            {activeModal?.type === "dispatch" && (
                <div
                    className="ao-modal-backdrop"
                    onClick={() => setActiveModal(null)}
                >
                    <div className="ao-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="ao-modal__head">
                            <h3 className="ao-modal__title">
                                <Icon name="truck" size={18} />
                                Dispatch Order #{activeModal.order.order_number}
                            </h3>
                            <button
                                className="ao-search-clear"
                                onClick={() => setActiveModal(null)}
                            >
                                <Icon name="close" size={16} />
                            </button>
                        </div>

                        <div className="ao-modal__body">
                            <div className="ao-form-group">
                                <label className="ao-form-label">
                                    Shipping Partner / Courier
                                </label>
                                <div className="ao-reason-chips">
                                    {CARRIERS.map((carrier) => (
                                        <button
                                            key={carrier}
                                            type="button"
                                            className={`ao-chip ${
                                                dispatchCarrier === carrier
                                                    ? "ao-chip--active"
                                                    : ""
                                            }`}
                                            onClick={() => setDispatchCarrier(carrier)}
                                        >
                                            {carrier}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="ao-form-group">
                                <label className="ao-form-label">
                                    Airway Bill / Tracking Number
                                </label>
                                <input
                                    type="text"
                                    className="ao-form-input"
                                    placeholder="e.g. DEL-1092837482"
                                    value={dispatchTracking}
                                    onChange={(e) =>
                                        setDispatchTracking(e.target.value)
                                    }
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="ao-modal__foot">
                            <button
                                className="ao-btn ao-btn--outline"
                                onClick={() => setActiveModal(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="ao-btn ao-btn--primary"
                                onClick={() =>
                                    updateStatus(
                                        activeModal.order.id,
                                        "dispatched",
                                        {
                                            shipping_partner: dispatchCarrier,
                                            tracking_number: dispatchTracking,
                                        },
                                    )
                                }
                            >
                                Confirm Dispatch
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================
               REJECT / CANCEL MODAL DIALOG
               ============================================================ */}
            {activeModal?.type === "reject" && (
                <div
                    className="ao-modal-backdrop"
                    onClick={() => setActiveModal(null)}
                >
                    <div className="ao-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="ao-modal__head">
                            <h3 className="ao-modal__title" style={{ color: "var(--rust)" }}>
                                <Icon name="alert" size={18} />
                                Reject Order #{activeModal.order.order_number}
                            </h3>
                            <button
                                className="ao-search-clear"
                                onClick={() => setActiveModal(null)}
                            >
                                <Icon name="close" size={16} />
                            </button>
                        </div>

                        <div className="ao-modal__body">
                            <p
                                style={{
                                    fontSize: 13,
                                    color: "var(--ink-soft)",
                                    margin: 0,
                                }}
                            >
                                Rejecting this order will release all reserved inventory
                                back to stock and notify the dealer.
                            </p>

                            <div className="ao-form-group">
                                <label className="ao-form-label">Common Reasons</label>
                                <div className="ao-reason-chips">
                                    {REJECT_REASONS.map((r) => (
                                        <button
                                            key={r}
                                            type="button"
                                            className={`ao-chip ${
                                                rejectReason === r
                                                    ? "ao-chip--active"
                                                    : ""
                                            }`}
                                            onClick={() => setRejectReason(r)}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="ao-form-group">
                                <label className="ao-form-label">
                                    Reason or Explanation (Optional)
                                </label>
                                <textarea
                                    className="ao-form-textarea"
                                    rows={3}
                                    placeholder="Enter additional details for dealer notification..."
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="ao-modal__foot">
                            <button
                                className="ao-btn ao-btn--outline"
                                onClick={() => setActiveModal(null)}
                            >
                                Never Mind
                            </button>
                            <button
                                className="ao-btn ao-btn--danger"
                                onClick={() =>
                                    updateStatus(activeModal.order.id, "rejected", {
                                        reason: rejectReason,
                                    })
                                }
                            >
                                Confirm Rejection
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
