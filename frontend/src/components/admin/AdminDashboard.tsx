import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { api } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { formatPrice, formatDate } from "../../lib/format";
import { resolveImageUrl, PLACEHOLDER } from "../../lib/images";
import AnalyticsCard from "./analytics/AnalyticsCard";
import KpiCard from "./analytics/KpiCard";
import RangePicker from "./analytics/RangePicker";

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  paid: "#3b82f6",
  shipped: "#6366f1",
  delivered: "#10b981",
  completed: "#059669",
  cancelled: "#ef4444",
};

export default function AdminDashboard() {
  const toast = useToast();

  // Range state
  const [days, setDays] = useState(30);
  const [from, setFrom] = useState<string | undefined>(undefined);
  const [to, setTo] = useState<string | undefined>(undefined);

  const rangeParams = useCallback(
    () => (from && to ? { from, to } : { days }),
    [days, from, to],
  );

  // Data
  const [summary, setSummary] = useState<any>(null);
  const [series, setSeries] = useState<Array<any>>([]);
  const [topProducts, setTopProducts] = useState<Array<any>>([]);
  const [topCustomers, setTopCustomers] = useState<Array<any>>([]);
  const [statuses, setStatuses] = useState<Array<any>>([]);
  const [categories, setCategories] = useState<Array<any>>([]);
  const [lowStock, setLowStock] = useState<Array<any>>([]);
  const [recentOrders, setRecentOrders] = useState<Array<any>>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      api.adminAnalyticsSummary(rangeParams()),
      api.adminAnalyticsRevenueSeries(rangeParams()),
      api.adminAnalyticsTopProducts({ ...rangeParams(), limit: 8 }),
      api.adminAnalyticsTopCustomers({ ...rangeParams(), limit: 8 }),
      api.adminAnalyticsStatusBreakdown(rangeParams()),
      api.adminAnalyticsCategoryPerformance(rangeParams()),
      api.adminDashboard(),
    ])
      .then(([s, rs, tp, tc, sb, cp, dash]) => {
        if (cancelled) return;
        setSummary(s);
        setSeries(rs.series || []);
        setTopProducts(tp.products || []);
        setTopCustomers(tc.customers || []);
        setStatuses(sb.statuses || []);
        setCategories(cp.categories || []);
        setLowStock(dash.low_stock || []);
        setRecentOrders(dash.recent_orders || []);
      })
      .catch((e: any) => toast.error(e.message || "Failed to load analytics"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rangeParams, toast]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm tracking-wider text-amber-800 uppercase mb-1">
            Admin
          </p>
          <h1 className="text-3xl font-light text-stone-800">Dashboard</h1>
          {summary?.range && (
            <p className="text-xs text-stone-500 mt-1">
              Showing {summary.range.from} → {summary.range.to}
            </p>
          )}
        </div>
        <RangePicker
          days={days}
          from={from}
          to={to}
          onChange={(next) => {
            if (next.days) {
              setDays(next.days);
              setFrom(undefined);
              setTo(undefined);
            } else {
              setFrom(next.from || "");
              setTo(next.to || "");
            }
          }}
        />
      </div>

      {/* KPI row */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            label="Revenue"
            value={summary.revenue.value}
            changePct={summary.revenue.change_pct}
            prefix="₹"
          />
          <KpiCard
            label="Orders"
            value={summary.orders.value}
            changePct={summary.orders.change_pct}
          />
          <KpiCard
            label="Avg order value"
            value={summary.avg_order_value.value}
            prefix="₹"
          />
          <KpiCard label="Customers" value={summary.new_customers.value} />
        </div>
      )}

      {/* Revenue chart */}
      <AnalyticsCard
        title="Revenue over time"
        subtitle={
          series.length > 0
            ? `${series.length} days · total ₹${series
                .reduce((s, d) => s + d.revenue, 0)
                .toLocaleString("en-IN")}`
            : undefined
        }
      >
        {loading ? (
          <p className="text-sm text-stone-500 py-12 text-center">Loading…</p>
        ) : series.length === 0 ? (
          <p className="text-sm text-stone-500 py-12 text-center">
            No orders in this period.
          </p>
        ) : (
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#78716c" }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#78716c" }}
                  tickFormatter={(v) => `₹${v}`}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 6,
                    border: "1px solid #e7e5e4",
                  }}
                  formatter={(v: any) => formatPrice(Number(v))}
                  labelFormatter={(l) => `Date: ${l}`}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#92400e"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </AnalyticsCard>

      {/* Top products + status breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <AnalyticsCard
          title="Top products"
          subtitle="By revenue in range"
          className="xl:col-span-2"
        >
          {topProducts.length === 0 ? (
            <p className="text-sm text-stone-500 py-8 text-center">
              No sales yet.
            </p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {topProducts.map((p) => (
                <li
                  key={p.product_id}
                  className="flex items-center gap-3 py-2.5"
                >
                  <img
                    src={p.image ? resolveImageUrl(p.image) : PLACEHOLDER}
                    alt={p.name}
                    className="w-10 h-12 object-cover rounded bg-stone-100 flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = PLACEHOLDER;
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-800 truncate">{p.name}</p>
                    <p className="text-xs text-stone-500">
                      {p.units} unit{p.units === 1 ? "" : "s"}
                    </p>
                  </div>
                  <p className="text-sm text-stone-800 font-medium whitespace-nowrap">
                    {formatPrice(p.revenue)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </AnalyticsCard>

        <AnalyticsCard title="Order status" subtitle="In range">
          {statuses.length === 0 ? (
            <p className="text-sm text-stone-500 py-8 text-center">—</p>
          ) : (
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={statuses}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {statuses.map((s) => (
                      <Cell
                        key={s.status}
                        fill={STATUS_COLORS[s.status] || "#a8a29e"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 6,
                      border: "1px solid #e7e5e4",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 11, color: "#57534e" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </AnalyticsCard>
      </div>

      {/* Category performance + Top customers */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <AnalyticsCard title="Revenue by category" subtitle="In range">
          {categories.length === 0 ? (
            <p className="text-sm text-stone-500 py-8 text-center">—</p>
          ) : (
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={categories}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                  <XAxis
                    dataKey="category"
                    tick={{ fontSize: 11, fill: "#78716c" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#78716c" }}
                    tickFormatter={(v) => `₹${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 6,
                      border: "1px solid #e7e5e4",
                    }}
                    formatter={(v: any) => formatPrice(Number(v))}
                  />
                  <Bar dataKey="revenue" fill="#92400e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </AnalyticsCard>

        <AnalyticsCard title="Top customers" subtitle="By spend in range">
          {topCustomers.length === 0 ? (
            <p className="text-sm text-stone-500 py-8 text-center">—</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {topCustomers.map((c, i) => (
                <li
                  key={`${c.email}-${i}`}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-stone-800 truncate">{c.name}</p>
                    <p className="text-xs text-stone-500 truncate">
                      {c.email} · {c.orders} order
                      {c.orders === 1 ? "" : "s"}
                    </p>
                  </div>
                  <p className="text-sm text-stone-800 font-medium whitespace-nowrap">
                    {formatPrice(c.revenue)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </AnalyticsCard>
      </div>

      {/* Recent orders + low stock */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <AnalyticsCard title="Recent orders">
          {recentOrders.length === 0 ? (
            <p className="text-sm text-stone-500 py-6 text-center">
              No orders yet.
            </p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {recentOrders.map((o: any) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between py-2.5 text-sm"
                >
                  <Link
                    to="/admin/orders"
                    className="text-stone-800 hover:text-amber-800"
                  >
                    {o.order_number}
                  </Link>
                  <span className="text-stone-500 text-xs">
                    {formatDate(o.created_at)}
                  </span>
                  <span className="text-stone-800">{formatPrice(o.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </AnalyticsCard>

        <AnalyticsCard title="Low stock" subtitle="≤ 5 units remaining">
          {lowStock.length === 0 ? (
            <p className="text-sm text-stone-500 py-6 text-center">
              All products well-stocked.
            </p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {lowStock.map((p: any) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 py-2.5 text-sm"
                >
                  <img
                    src={p.image ? resolveImageUrl(p.image) : PLACEHOLDER}
                    alt={p.name}
                    className="w-8 h-10 object-cover rounded bg-stone-100 flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = PLACEHOLDER;
                    }}
                  />
                  <span className="flex-1 text-stone-800 truncate">
                    {p.name}
                  </span>
                  <span className="text-red-600 text-xs font-medium">
                    {p.stock} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AnalyticsCard>
      </div>
    </div>
  );
}
