import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import ProductCard from "../components/ProductCard";
import TradeSteps from "../components/TradeSteps";
import TradeHero from "../components/TradeHero";
import Reveal from "../components/ui/Reveal";
import "../styles/dashboard.css";
import Icon from "../components/ui/Icon";
import Skeleton from "../components/ui/Skeleton";
import { Link } from "react-router-dom";

export default function Dashboard() {
    const { isDealer } = useAuth();
    const dealer = isDealer();
    const navigate = useNavigate();
    const location = useLocation();

    const [dash, setDash] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchDashboard = async () => {
        try {
            const { data } = await api.get("/dashboard");
            setDash(data.data);
        } catch (err) {
            console.error("Failed to fetch dashboard:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
        const handleProductChanged = () => {
            fetchDashboard();
        };

        // Optional: refresh only when tab was hidden a long time
        let lastHidden = 0;
        const onVisibility = () => {
            if (document.visibilityState === "hidden") {
                lastHidden = Date.now();
            } else if (Date.now() - lastHidden > 60_000) {
                // refresh if away > 1 minute
                fetchDashboard();
            }
        };

        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("product-deleted", handleProductChanged);
        window.addEventListener("product-created", handleProductChanged);
        window.addEventListener("product-updated", handleProductChanged);

        return () => {
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("product-deleted", handleProductChanged);
            window.removeEventListener("product-created", handleProductChanged);
            window.removeEventListener("product-updated", handleProductChanged);
        };
    }, []);

    if (loading && !dash) {
        return (
            <Layout>
                <div className="dashboard">
                    <Skeleton variant="cards" count={4} />
                </div>
            </Layout>
        );
    }

    if (!dash) {
        return (
            <Layout>
                <div className="dashboard__loading">
                    Could not load dashboard.
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="dashboard">
                {dealer ? (
                    <DealerDashboard dash={dash} navigate={navigate} />
                ) : (
                    <AdminDashboard dash={dash} />
                )}
            </div>
        </Layout>
    );
}

function DealerDashboard({ dash, navigate }) {
    const {
        greeting,
        cards,
        new_products = [],
        recently_viewed = [],
        popular_products = [],
        suggestions = [],
    } = dash;

    return (
        <>
            <TradeHero
                eyebrow="WELCOME TO YOUR TRADE WORKSPACE"
                title={greeting || "Build better business"}
                emphasis="with smarter sourcing."
                description="Everything you need to source, compare, order, and restock with confidence. Tailored to your business, every time."
                count={cards?.available_products}
                countLabel="products available to source"
                products={new_products.length ? new_products : popular_products}
            />
            <div
                className="trade-v12-pulse"
                aria-label="Trade workspace shortcuts"
            >
                <div className="trade-v12-pulse__status">
                    <span
                        className="trade-v12-pulse__ping"
                        aria-hidden="true"
                    />{" "}
                    BUYER WORKSPACE <b>READY</b>
                </div>
                <div className="trade-v12-pulse__copy">
                    <strong>
                        From discovery to delivery, all in one place.
                    </strong>
                    <span>
                        Search live stock, review your trade rates, and build
                        your next restock order.
                    </span>
                </div>
                <Link to="/fast-order" className="trade-v12-pulse__cta">
                    <Icon name="orders" size={17} /> Start a quick order{" "}
                    <Icon name="arrow" size={15} />
                </Link>
            </div>
            <section className="studio-actions" aria-label="Your next actions">
                <div className="studio-actions__intro">
                    <span>01 / START HERE</span>
                    <h2>
                        Everything in
                        <br />
                        <em>motion.</em>
                    </h2>
                    <p>What would you like to do today?</p>
                </div>
                <Link
                    to="/products"
                    className="studio-actions__tile studio-actions__tile--violet"
                >
                    <span>DISCOVER / 01</span>
                    <Icon name="box" size={32} />
                    <strong>
                        Find your next
                        <br />
                        bestseller.
                    </strong>
                    <span className="studio-actions__arrow">
                        <Icon name="arrow" size={18} />
                    </span>
                </Link>
                <Link
                    to="/orders"
                    className="studio-actions__tile studio-actions__tile--orange"
                >
                    <span>MANAGE / 02</span>
                    <Icon name="orders" size={32} />
                    <strong>
                        Keep your orders
                        <br />
                        moving.
                    </strong>
                    <span className="studio-actions__arrow">
                        <Icon name="arrow" size={18} />
                    </span>
                </Link>
                <Link
                    to="/wishlist"
                    className="studio-actions__tile studio-actions__tile--butter"
                >
                    <span>SAVE / 03</span>
                    <Icon name="heart" size={32} />
                    <strong>
                        Pick up where
                        <br />
                        you left off.
                    </strong>
                    <span className="studio-actions__arrow">
                        <Icon name="arrow" size={18} />
                    </span>
                </Link>
            </section>

            {/* <div className="dashboard__editorial">
                <Reveal className="dashboard__editorial-copy">
                    <p className="section-overline">THE TRADE EDIT</p>
                    <h2>
                        Discover more. <span>Spend less time searching.</span>
                    </h2>
                    <p>
                        From new arrivals to familiar favorites, your next great
                        order is only a few clicks away.
                    </p>
                </Reveal>
                <Link className="dashboard__editorial-link" to="/products">
                    Shop the collection <Icon name="arrow" size={17} />
                </Link>
            </div> */}

            {new_products.length > 0 && (
                <ProductSlider
                    title="New Products"
                    products={new_products}
                    navigate={navigate}
                    sortKey="new-arrivals"
                />
            )}

            {recently_viewed.length > 0 && (
                <ProductSlider
                    title="Recently Viewed"
                    products={recently_viewed}
                    navigate={navigate}
                    sortKey="recently-viewed"
                />
            )}

            {suggestions.length > 0 && (
                <ProductSlider
                    title="Picked For You"
                    products={suggestions}
                    navigate={navigate}
                    sortKey="suggestions"
                />
            )}

            {popular_products.length > 0 && (
                <ProductSlider
                    title="Popular Products"
                    products={popular_products}
                    navigate={navigate}
                    sortKey="best-selling"
                />
            )}
            <TradeSteps />
        </>
    );
}

function AdminDashboard({ dash }) {
    const { cards, top_selling_products = [], recent_orders = [] } = dash;

    return (
        <>
            <h1 className="dashboard__greeting">Admin Dashboard</h1>

            <div className="dashboard__cards">
                <StatCard label="Today's Orders" value={cards?.todays_orders} />
                <StatCard
                    label="Pending Orders"
                    value={cards?.pending_orders}
                />
                <StatCard label="Total Sellers" value={cards?.total_sellers} />
                <StatCard
                    label="Active Sellers"
                    value={cards?.active_sellers}
                />
                <StatCard
                    label="Out of Stock"
                    value={cards?.out_of_stock}
                    icon="layers"
                />
                <StatCard label="Low Stock" value={cards?.low_stock} />
                <StatCard
                    label="Today's Revenue"
                    value={`₹${cards?.todays_revenue ?? 0}`}
                />
            </div>

            {top_selling_products.length > 0 && (
                <>
                    <h2 className="dashboard__section-title">
                        Top Selling Products
                    </h2>
                    <div className="dashboard__top-products">
                        {top_selling_products.map((p, i) => (
                            <div key={i} className="dashboard__top-product-row">
                                <span>{p.name}</span>
                                <span>{p.units_sold} units</span>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {recent_orders.length > 0 && (
                <>
                    <h2 className="dashboard__section-title">Recent Orders</h2>
                    <div className="dashboard__recent-orders">
                        {recent_orders.map((order) => (
                            <div
                                key={order.id}
                                className="dashboard__order-row"
                            >
                                <span>#{order.order_number}</span>
                                <span>{order.customer}</span>
                                <span>₹{order.total}</span>
                                <span className={`status-${order.status}`}>
                                    {order.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </>
    );
}

function StatCard({ label, value, icon = "chart" }) {
    return (
        <div className="stat-card">
            <span className="stat-card__icon">
                <Icon name={icon} size={18} />
            </span>
            <p className="stat-card__label">{label}</p>
            <p className="stat-card__value">{value ?? "—"}</p>
        </div>
    );
}

function ProductSlider({ title, products, navigate, sortKey }) {
    const productList = Array.isArray(products) ? products : [];

    const handleViewAll = () => {
        navigate(`/products?sort=${sortKey || "all"}`);
    };

    if (productList.length === 0) {
        return null;
    }

    return (
        <Reveal as="section" className="product-slider">
            <div className="dashboard__section-header">
                <h2 className="dashboard__section-title">{title}</h2>
                <button
                    className="dashboard__view-all-btn"
                    onClick={handleViewAll}
                >
                    View All →
                </button>
            </div>

            <div className="product-slider__track">
                {productList.map((p) => (
                    <ProductCard key={p.id} product={p} compact />
                ))}
            </div>
        </Reveal>
    );
}
