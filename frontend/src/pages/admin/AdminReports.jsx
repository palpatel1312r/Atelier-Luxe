import { useEffect, useMemo, useState } from "react";
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    PieChart, Pie, Cell, LabelList,
} from "recharts";
import AdminLayout from "../../components/AdminLayout";
import api from "../../api/client";
import AdminDataTableControls, {
    useAdminDataTable,
} from "../../components/ui/AdminDataTableControls";
import "../../styles/admin-common.css";
import "../../styles/admin-reports.css";

// Each report is config-driven: which field is the chart label/value, what
// chart type fits the data shape, and how to format the KPI strip above it.
// This is what "deep reporting" actually means here — not just a table dump,
// but the same data rendered as something a manager can read in 3 seconds.
const REPORTS = [
    { key: "seller-wise-sales", label: "Seller Wise Sales", chart: "bar", labelField: "seller_name", valueField: "total_sales", valueLabel: "Sales (₹)" },
    { key: "city-wise-sales", label: "City Wise Sales", chart: "bar", labelField: "city", valueField: "total_sales", valueLabel: "Sales (₹)" },
    { key: "product-wise-sales", label: "Product Wise Sales", chart: "bar", labelField: "name", valueField: "revenue", valueLabel: "Revenue (₹)" },
    { key: "group-wise-sales", label: "Group Wise Sales", chart: "pie", labelField: "group_name", valueField: "total_sales", valueLabel: "Sales (₹)" },
    { key: "top-buyers", label: "Top Buyers", chart: "bar", labelField: "name", valueField: "total_spent", valueLabel: "Spent (₹)" },
    { key: "pending-payments", label: "Pending Payments", chart: "none" },
];

const PIE_COLORS = ["#c08a1e", "#1a2e44", "#1f7a4d", "#a6650f", "#b3401f", "#4a5b70"];

export default function AdminReports() {
    const [active, setActive] = useState("seller-wise-sales");
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [kpis, setKpis] = useState(null);

    const config = REPORTS.find((r) => r.key === active);

    useEffect(() => {
        api.get("/dashboard").then(({ data }) => setKpis(data.data)).catch(() => {});
    }, []);

    useEffect(() => {
        setLoading(true);
        api.get(`/admin/reports/${active}`)
            .then(({ data }) => setRows(data.data || []))
            .finally(() => setLoading(false));
    }, [active]);

    const chartData = useMemo(() => {
        if (config.chart === "none") return [];
        return rows
            .map((r) => ({
                label: String(r[config.labelField] ?? "—").slice(0, 18),
                value: Number(r[config.valueField]) || 0,
            }))
            .filter((r) => r.value > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 10); // top 10 keeps the chart readable, not a wall of bars
    }, [rows, config]);

    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    const table = useAdminDataTable(rows, {
        sortOptions: columns.flatMap((column) => [
            {
                value: `${column}_asc`,
                label: `${column.replace(/_/g, " ")}: A to Z`,
                getValue: (row) => {
                    const value = row[column];
                    return value && typeof value === "object"
                        ? value.name || value.email || value.phone || ""
                        : value;
                },
            },
            {
                value: `${column}_desc`,
                label: `${column.replace(/_/g, " ")}: Z to A`,
                getValue: (row) => {
                    const value = row[column];
                    return value && typeof value === "object"
                        ? value.name || value.email || value.phone || ""
                        : value;
                },
                direction: "desc",
            },
        ]),
    });

    const exportCsv = () => {
        if (rows.length === 0) return;
        const cols = Object.keys(rows[0]);
        const csvRows = [
            cols.join(","),
            ...rows.map((row) =>
                cols.map((c) => {
                    const v = row[c];
                    const flat = v && typeof v === "object" ? (v.name || v.email || "") : v;
                    return `"${String(flat ?? "").replace(/"/g, '""')}"`;
                }).join(",")
            ),
        ];
        const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${active}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <AdminLayout>
            <div className="admin-page__header">
                <div>
                    <h1 className="admin-page__title">Reports</h1>
                    <p className="admin-page__subtitle">Sales performance across sellers, cities, products, and groups.</p>
                </div>
                <button className="admin-btn admin-btn--outline admin-btn--sm" onClick={exportCsv} disabled={rows.length === 0}>
                    ⇩ Export CSV
                </button>
            </div>

            {kpis && (
                <div className="admin-stat-grid">
                    <div className="admin-stat-card">
                        <p className="admin-stat-card__label">Today's Revenue</p>
                        <p className="admin-stat-card__value tabular">₹{kpis.cards?.todays_revenue ?? 0}</p>
                    </div>
                    <div className="admin-stat-card">
                        <p className="admin-stat-card__label">Pending Orders</p>
                        <p className="admin-stat-card__value tabular">{kpis.cards?.pending_orders ?? 0}</p>
                    </div>
                    <div className="admin-stat-card">
                        <p className="admin-stat-card__label">Active Sellers</p>
                        <p className="admin-stat-card__value tabular">{kpis.cards?.active_sellers ?? 0}</p>
                    </div>
                    <div className="admin-stat-card">
                        <p className="admin-stat-card__label">Low Stock Items</p>
                        <p className="admin-stat-card__value tabular">{kpis.cards?.low_stock ?? 0}</p>
                    </div>
                </div>
            )}

            <div className="admin-page__toolbar">
                {REPORTS.map((r) => (
                    <button
                        key={r.key}
                        className={`admin-btn admin-btn--sm ${active === r.key ? "admin-btn--brass" : "admin-btn--outline"}`}
                        onClick={() => setActive(r.key)}
                    >
                        {r.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <p className="admin-empty">Loading…</p>
            ) : rows.length === 0 ? (
                <p className="admin-empty">No data for this report yet.</p>
            ) : (
                <>
                    {config.chart === "bar" && (
                        <div className="admin-card">
                            <p className="admin-card__title">{config.label} — Top {chartData.length}</p>
                            <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 36)}>
                                <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" horizontal={false} />
                                    <XAxis type="number" tick={{ fontSize: 11, fill: "var(--ink-soft)" }} />
                                    <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11, fill: "var(--ink)" }} />
                                    <Tooltip
                                        formatter={(v) => [`₹${Number(v).toLocaleString()}`, config.valueLabel]}
                                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--rule)" }}
                                    />
                                    <Bar dataKey="value" fill="var(--brass)" radius={[0, 6, 6, 0]}>
                                        <LabelList dataKey="value" position="right" formatter={(v) => `₹${Number(v).toLocaleString()}`} style={{ fontSize: 11, fill: "var(--ink-soft)" }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {config.chart === "pie" && (
                        <div className="admin-card">
                            <p className="admin-card__title">{config.label} — Share of Total</p>
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                    <Pie data={chartData} dataKey="value" nameKey="label" outerRadius={100} label={(d) => `${d.label} (${((d.value / chartData.reduce((s, r) => s + r.value, 0)) * 100).toFixed(0)}%)`}>
                                        {chartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    <AdminDataTableControls {...table} searchPlaceholder="Search report rows..." />
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    {columns.map((c) => (
                                        <th key={c}>{c.replace(/_/g, " ")}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {table.rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={columns.length}>
                                            No report rows match your search.
                                        </td>
                                    </tr>
                                ) : table.rows.map((row, i) => (
                                    <tr key={i}>
                                        {columns.map((c) => {
                                            let val = row[c];
                                            let display = String(val ?? "—");

                                            if (val && typeof val === "object" && !Array.isArray(val)) {
                                                display = val.name || val.email || val.phone || "—";
                                            } else if (typeof val === "string" && val.match(/^\d{4}-\d{2}-\d{2}T/)) {
                                                display = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(val));
                                            } else if (typeof val === "number") {
                                                display = val.toLocaleString();
                                            }

                                            return <td key={c} className={typeof val === "number" ? "tabular" : ""}>{display}</td>;
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </AdminLayout>
    );
}
