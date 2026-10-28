import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import Icon from "../../components/ui/Icon";
import Skeleton from "../../components/ui/Skeleton";
import api from "../../api/client";
import "../../styles/admin-common.css";

const money = (v) =>
    "₹" + Number(v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function AdminDashboard() {
    const [dash, setDash] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        api.get("/dashboard")
            .then(({ data }) => {
                if (!cancelled) setDash(data.data);
            })
            .catch(() => {
                if (!cancelled)
                    setError(
                        "Unable to load the dashboard. Please refresh the page.",
                    );
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    if (loading)
        return (
            <AdminLayout>
                <div className="admin-page__header">
                    <div>
                        <p className="page-kicker">Workspace / Overview</p>
                        <h1 className="admin-page__title">Business overview</h1>
                    </div>
                </div>
                <Skeleton variant="cards" count={8} />
            </AdminLayout>
        );
    if (!dash)
        return (
            <AdminLayout>
                <div className="admin-empty" role="alert">
                    {error || "Dashboard data is unavailable."}
                </div>
            </AdminLayout>
        );

    const cards = dash.cards || {};
    const topProducts = dash.top_selling_products || [];
    const recentOrders = dash.recent_orders || [];
    const maxSales = Math.max(
        1,
        ...topProducts.map((p) => Number(p.units_sold || 0)),
    );

    return (
        <AdminLayout>
            <div className="admin-page__header">
                <div>
                    <p className="page-kicker">
                        <span className="commerce-dot" /> COMMAND CENTER
                    </p>
                    <h1 className="admin-page__title">
                        Your business, at a glance.
                    </h1>
                    <p className="admin-page__subtitle">
                        Live operational data to keep your catalog, partners,
                        and orders in sync.
                    </p>
                </div>
                <Link
                    className="admin-btn admin-btn--outline"
                    to="/admin/reports"
                >
                    <Icon name="chart" size={17} /> View reports{" "}
                    <Icon name="arrow" size={15} />
                </Link>
            </div>

            <div className="admin-dashboard__banner">
                <div>
                    <span className="admin-dashboard__banner-kicker">
                        <Icon name="sparkles" size={15} /> OPERATIONAL OVERVIEW
                    </span>
                    <h2>
                        Better decisions.
                        <br />
                        <em>Stronger commerce.</em>
                    </h2>
                    <p>
                        One powerful view of orders, performance, and
                        stock—designed for the pace of wholesale.
                    </p>
                </div>
                <div className="admin-dashboard__banner-actions">
                    <Link
                        to="/admin/orders"
                        className="admin-dashboard__banner-btn"
                    >
                        <Icon name="orders" size={17} /> Manage orders
                    </Link>
                    <Link
                        to="/admin/products"
                        className="admin-dashboard__banner-btn admin-dashboard__banner-btn--light"
                    >
                        <Icon name="box" size={17} /> View inventory
                    </Link>
                </div>
            </div>

            <div className="studio-admin-spotlight">
                <div>
                    <span>THE OPERATIONS DESK / TODAY</span>
                    <h2>
                        Focus on the work
                        <br />
                        <em>that moves business.</em>
                    </h2>
                </div>
                <div className="studio-admin-spotlight__links">
                    <Link to="/admin/orders">
                        Review the queue <Icon name="arrow" size={18} />
                    </Link>
                    <Link to="/admin/products">
                        Check inventory <Icon name="arrow" size={18} />
                    </Link>
                </div>
            </div>
            <div className="admin-stat-grid">
                <StatCard
                    label="Orders today"
                    value={cards.todays_orders}
                    icon="bag"
                />
                <StatCard
                    label="Pending orders"
                    value={cards.pending_orders}
                    icon="orders"
                    tone="coral"
                />
                <StatCard
                    label="Today's revenue"
                    value={money(cards.todays_revenue)}
                    icon="chart"
                    tone="teal"
                />
                <StatCard
                    label="Active sellers"
                    value={cards.active_sellers}
                    icon="people"
                    tone="purple"
                />
                <StatCard
                    label="Total sellers"
                    value={cards.total_sellers}
                    icon="people"
                />
                <StatCard
                    label="Out of stock"
                    value={cards.out_of_stock}
                    icon="box"
                    tone="coral"
                />
                <StatCard
                    label="Low stock"
                    value={cards.low_stock}
                    icon="layers"
                    tone="amber"
                />
            </div>

            {/* <section className="arc-ops-board" aria-label="Today's operations">
                <div className="arc-ops-board__heading">
                    <div>
                        <span className="arc-kicker">THE DAILY BRIEF</span>
                        <h2>Stay in command.</h2>
                        <p>
                            Everything that needs your attention, in a single
                            operational view.
                        </p>
                    </div>
                    <Link to="/admin/reports">
                        Full reporting <Icon name="arrow" size={17} />
                    </Link>
                </div>
                <div className="arc-ops-board__grid">
                    <Link
                        to="/admin/orders"
                        className="arc-ops-card arc-ops-card--ink"
                    >
                        <span className="arc-ops-card__top">
                            <span>01 / ORDER QUEUE</span>
                            <Icon name="arrow" size={19} />
                        </span>
                        <strong>{cards.pending_orders ?? "—"}</strong>
                        <h3>Pending decisions</h3>
                        <p>Review orders and keep fulfillment moving.</p>
                        <span className="arc-ops-card__bottom">
                            Review orders <Icon name="arrow" size={15} />
                        </span>
                    </Link>
                    <Link
                        to="/admin/products"
                        className="arc-ops-card arc-ops-card--peach"
                    >
                        <span className="arc-ops-card__top">
                            <span>02 / STOCK WATCH</span>
                            <Icon name="box" size={20} />
                        </span>
                        <strong>{cards.low_stock ?? "—"}</strong>
                        <h3>Products running low</h3>
                        <p>
                            Spot replenishment opportunities before they become
                            stockouts.
                        </p>
                        <span className="arc-ops-card__bottom">
                            Open inventory <Icon name="arrow" size={15} />
                        </span>
                    </Link>
                    <Link
                        to="/admin/sellers"
                        className="arc-ops-card arc-ops-card--mint"
                    >
                        <span className="arc-ops-card__top">
                            <span>03 / PARTNER NETWORK</span>
                            <Icon name="people" size={20} />
                        </span>
                        <strong>{cards.active_sellers ?? "—"}</strong>
                        <h3>Active trade partners</h3>
                        <p>
                            Your wholesale relationships, all in one workspace.
                        </p>
                        <span className="arc-ops-card__bottom">
                            Manage partners <Icon name="arrow" size={15} />
                        </span>
                    </Link>
                </div>
            </section> */}

            <section
                className="admin-focus"
                aria-label="Recommended admin tasks"
            >
                <div className="admin-focus__heading">
                    <div>
                        <p className="section-overline">YOUR NEXT MOVE</p>
                        <h2>Stay ahead of the day.</h2>
                        <p>
                            Open the tools behind the numbers to keep trade
                            moving.
                        </p>
                    </div>
                    <span className="admin-focus__pill">
                        <Icon name="shield" size={15} /> Workspace tools
                    </span>
                </div>
                <div className="admin-focus__grid">
                    <Link
                        to="/admin/orders"
                        className="admin-focus__task admin-focus__task--blue"
                    >
                        <span className="admin-focus__task-icon">
                            <Icon name="orders" size={22} />
                        </span>
                        <div>
                            <small>Order queue</small>
                            <strong>
                                {cards.pending_orders ?? "—"} pending orders
                            </strong>
                            <span>
                                Review and update fulfillment{" "}
                                <Icon name="arrow" size={14} />
                            </span>
                        </div>
                    </Link>
                    <Link
                        to="/admin/products"
                        className="admin-focus__task admin-focus__task--coral"
                    >
                        <span className="admin-focus__task-icon">
                            <Icon name="box" size={22} />
                        </span>
                        <div>
                            <small>Stock attention</small>
                            <strong>
                                {cards.low_stock ?? "—"} low stock items
                            </strong>
                            <span>
                                Review inventory levels{" "}
                                <Icon name="arrow" size={14} />
                            </span>
                        </div>
                    </Link>
                    <Link
                        to="/admin/sellers"
                        className="admin-focus__task admin-focus__task--teal"
                    >
                        <span className="admin-focus__task-icon">
                            <Icon name="people" size={22} />
                        </span>
                        <div>
                            <small>Trade partners</small>
                            <strong>
                                {cards.active_sellers ?? "—"} active sellers
                            </strong>
                            <span>
                                Manage your seller network{" "}
                                <Icon name="arrow" size={14} />
                            </span>
                        </div>
                    </Link>
                </div>
            </section>

            <div className="admin-dashboard__panels">
                <section className="admin-dashboard__panel">
                    <div className="admin-dashboard__panel-title">
                        <div>
                            <h2>Top selling products</h2>
                            <p>Best performers by units sold</p>
                        </div>
                        <span className="admin-dashboard__panel-icon">
                            <Icon name="chart" size={20} />
                        </span>
                    </div>
                    {topProducts.length > 0 ? (
                        <div className="admin-dashboard__bar-list">
                            {topProducts.slice(0, 6).map((p, i) => (
                                <div
                                    key={`${p.name}-${i}`}
                                    className="admin-dashboard__bar-row"
                                >
                                    <div className="admin-dashboard__bar-label">
                                        <span className="admin-dashboard__rank">
                                            {String(i + 1).padStart(2, "0")}
                                        </span>
                                        <strong title={p.name}>{p.name}</strong>
                                        <b>
                                            {Number(
                                                p.units_sold || 0,
                                            ).toLocaleString("en-IN")}
                                        </b>
                                    </div>
                                    <div className="admin-dashboard__bar-track">
                                        <span
                                            style={{
                                                width: `${Math.max(2, (Number(p.units_sold || 0) / maxSales) * 100)}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="admin-dashboard__empty">
                            Sales insights will appear here once orders are
                            completed.
                        </div>
                    )}
                </section>
                <section className="admin-dashboard__panel">
                    <div className="admin-dashboard__panel-title">
                        <div>
                            <h2>Recent orders</h2>
                            <p>Latest purchases from your dealers</p>
                        </div>
                        <Link
                            to="/admin/orders"
                            className="premium-inline-link"
                        >
                            See all <Icon name="arrow" size={15} />
                        </Link>
                    </div>
                    {recentOrders.length > 0 ? (
                        <div className="admin-dashboard__order-list">
                            {recentOrders.slice(0, 6).map((o) => (
                                <div
                                    className="admin-dashboard__order-item"
                                    key={o.id}
                                >
                                    <span className="admin-dashboard__order-icon">
                                        <Icon name="bag" size={18} />
                                    </span>
                                    <div className="admin-dashboard__order-main">
                                        <strong>#{o.order_number}</strong>
                                        <small>
                                            {o.customer || "Dealer order"}
                                        </small>
                                    </div>
                                    <div className="admin-dashboard__order-end">
                                        <strong>{money(o.total)}</strong>
                                        <small className="admin-dashboard__order-status">
                                            {String(o.status || "").replaceAll(
                                                "_",
                                                " ",
                                            )}
                                        </small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="admin-dashboard__empty">
                            Your latest wholesale orders will appear here.
                        </div>
                    )}
                </section>
            </div>
        </AdminLayout>
    );
}

function StatCard({ label, value, icon, tone = "blue" }) {
    return (
        <div className={`admin-stat-card admin-stat-card--${tone}`}>
            <span className="admin-stat-card__icon">
                <Icon name={icon} size={19} />
            </span>
            <p className="admin-stat-card__label">{label}</p>
            <p className="admin-stat-card__value">{value ?? "—"}</p>
        </div>
    );
}
