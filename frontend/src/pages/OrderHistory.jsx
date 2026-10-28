import TradeAccountNav from "../components/TradeAccountNav";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../api/client";
import { ORDER_STATUS_COLOR } from "../constants/orderStatus";
import "../styles/order-history.css";
import Icon from "../components/ui/Icon";
import EnterpriseEmpty from "../components/ui/EnterpriseEmpty";
import Skeleton from "../components/ui/Skeleton";
import ProductResultThumbnail from "../components/ProductResultThumbnail";

const CACHE_TTL = 60 * 1000; // 1 minute

function cacheKey(page) {
    return `orders_page_${page}`;
}

function getCached(page) {
    try {
        const raw = sessionStorage.getItem(cacheKey(page));
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts > CACHE_TTL) {
            sessionStorage.removeItem(cacheKey(page));
            return null;
        }
        return data;
    } catch {
        return null;
    }
}

function setCached(page, data) {
    try {
        sessionStorage.setItem(
            cacheKey(page),
            JSON.stringify({ data, ts: Date.now() }),
        );
    } catch {}
}

export default function OrderHistory() {
    const [orders, setOrders] = useState([]);
    const [meta, setMeta] = useState(null);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [statusTab, setStatusTab] = useState("all");

    useEffect(() => {
        let cancelled = false;

        const cached = getCached(page);
        if (cached) {
            setOrders(cached.data || []);
            setMeta(cached);
            setLoading(false);
        } else {
            setLoading(true);
        }

        api.get("/orders", { params: { page, per_page: 10 } })
            .then(({ data }) => {
                if (cancelled) return;
                setOrders(data.data || []);
                setMeta(data);
                setCached(page, data);
            })
            .catch((err) => console.error("Orders load failed:", err))
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [page]);

    const repeatOrder = async (orderId, e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const { data } = await api.post(`/orders/${orderId}/repeat`);

            alert(
                data.skipped?.length
                    ? `Added to cart. Skipped (out of stock): ${data.skipped.join(", ")}`
                    : "Added to cart!",
            );
        } catch (err) {
            alert(err.response?.data?.message || "Could not repeat order.");
        }
    };

    // These tools only filter the currently loaded page; server pagination remains unchanged.
    const visibleOrders = orders.filter((order) => {
        const matchStatus =
            statusTab === "all" ||
            String(order.order_status || "").toLowerCase() === statusTab;
        const matchQuery =
            !query.trim() ||
            `${order.order_number ?? ""} ${(order.items || []).map((i) => i.product?.name || "").join(" ")}`
                .toLowerCase()
                .includes(query.trim().toLowerCase());
        return matchStatus && matchQuery;
    });
    const statusOptions = [
        "all",
        ...new Set(
            orders
                .map((o) => String(o.order_status || "").toLowerCase())
                .filter(Boolean),
        ),
    ];

    return (
        <Layout>
            <TradeAccountNav />
            <div className="order-history">
                {/* <div className="order-history__intro">
                    <div>
                        <p className="page-kicker">
                            <span className="commerce-dot" /> YOUR PURCHASE
                            HISTORY
                        </p>
                        <h1 className="order-history__title">
                            Every order, <em>one place.</em>
                        </h1>
                        <p className="page-description">
                            From your first purchase to your next restock—follow
                            progress and repeat orders without the paperwork.
                        </p>
                    </div>
                    <Link to="/products" className="btn">
                        <Icon name="plus" size={17} /> Browse products
                    </Link>
                </div> */}

                <section className="order-workspace" aria-label="Order tools">
                    {/* <div className="order-workspace__intro">
                        <div>
                            <p className="section-overline">ORDER DESK</p>
                            <h2>Track, review, replenish.</h2>
                            <p>
                                Your most recent purchases are ready whenever
                                you need them.
                            </p>
                        </div>
                        <span className="order-workspace__count">
                            {meta?.meta?.total ?? meta?.total ?? orders.length}{" "}
                            orders
                        </span>
                    </div> */}
                    <div className="order-workspace__tools">
                        <label className="order-workspace__search">
                            <Icon name="search" size={17} />
                            <input
                                type="search"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Find an order on this page"
                                aria-label="Search orders on this page"
                            />
                        </label>
                        <div
                            className="order-workspace__tabs"
                            role="group"
                            aria-label="Filter orders on this page"
                        >
                            {statusOptions.map((status) => (
                                <button
                                    key={status}
                                    type="button"
                                    aria-pressed={statusTab === status}
                                    onClick={() => setStatusTab(status)}
                                >
                                    {status === "all"
                                        ? "All"
                                        : status.replaceAll("_", " ")}
                                </button>
                            ))}
                        </div>
                    </div>
                
                </section>

                {loading && orders.length === 0 ? (
                    <Skeleton variant="table" rows={5} columns={4} />
                ) : (
                    <>
                        <div className="order-history__list">
                            {visibleOrders.map((order) => (
                                <div key={order.id} className="order-card">
                                    <div className="order-card__top">
                                        <span className="order-card__icon">
                                            <Icon name="bag" size={21} />
                                        </span>
                                        <span className="order-card__number">
                                            {order.order_number}
                                        </span>
                                        <span
                                            className="order-card__status"
                                            style={{
                                                color: ORDER_STATUS_COLOR[
                                                    order.order_status
                                                ],
                                            }}
                                        >
                                            ●{" "}
                                            {order.order_status?.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="order-card__mid">
                                        <span>
                                            {new Date(
                                                order.created_at,
                                            ).toLocaleDateString()}
                                        </span>
                                        <span className="order-card__total">
                                            ₹{order.grand_total}
                                        </span>
                                    </div>
                                    <div className="order-card__items">
                                        {order.items?.slice(0, 2).map((item) => (
                                            <div
                                                className="order-card__item"
                                                key={item.id}
                                            >
                                                <ProductResultThumbnail
                                                    product={item.product}
                                                    size="sm"
                                                />
                                                <span className="order-card__item-copy">
                                                    <strong>
                                                        {item.product?.name ??
                                                            "Product"}
                                                    </strong>
                                                    <small>
                                                        Qty {item.quantity}
                                                    </small>
                                                </span>
                                            </div>
                                        ))}
                                        {order.items?.length > 2 && (
                                            <span className="order-card__more-items">
                                                +{order.items.length - 2} more
                                            </span>
                                        )}
                                    </div>
                                    <div className="order-card__actions">
                                        <Link
                                            to={`/orders/${order.id}`}
                                            className="order-card__view-link"
                                        >
                                            View details{" "}
                                            <Icon name="arrow" size={15} />
                                        </Link>
                                        <button
                                            type="button"
                                            className="order-card__repeat-btn"
                                            onClick={(e) =>
                                                repeatOrder(order.id, e)
                                            }
                                        >
                                            <Icon name="repeat" size={16} />{" "}
                                            Repeat order
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {visibleOrders.length === 0 && !loading && (
                            <EnterpriseEmpty
                                title={
                                    orders.length === 0
                                        ? "No wholesale orders yet"
                                        : "No orders match these filters"
                                }
                                description={
                                    orders.length === 0
                                        ? "Browse the marketplace and create your first order to begin tracking fulfillment here."
                                        : "Try another status or search term for this page."
                                }
                                to={
                                    orders.length === 0
                                        ? "/products"
                                        : undefined
                                }
                                action="Browse wholesale catalog"
                            />
                        )}

                        {meta && meta.last_page > 1 && (
                            <div className="order-history__pagination">
                                <button
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => p - 1)}
                                >
                                    Prev
                                </button>
                                <span>
                                    Page {page} of {meta.last_page}
                                </span>
                                <button
                                    disabled={page >= meta.last_page}
                                    onClick={() => setPage((p) => p + 1)}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
}
