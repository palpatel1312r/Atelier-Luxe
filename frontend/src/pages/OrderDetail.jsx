import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../api/client";
import {
    ORDER_STATUS_FLOW,
    ORDER_STATUS_TERMINAL_FAIL,
} from "../constants/orderStatus";
import Icon from "../components/ui/Icon";
import ProductResultThumbnail from "../components/ProductResultThumbnail";
import "../styles/order-detail.css";

const formatCurrency = (value) =>
    `₹${Number(value ?? 0).toLocaleString("en-IN")}`;

const formatDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const STATUS_TONE = {
    pending: "neutral",
    approved: "info",
    packing: "info",
    dispatched: "warn",
    delivered: "success",
    cancelled: "danger",
    rejected: "danger",
};

export default function OrderDetail() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [cancelling, setCancelling] = useState(false);
    const [error, setError] = useState("");
    const [flash, setFlash] = useState("");

    const loadOrder = async () => {
        try {
            const { data } = await api.get(`/orders/${id}`);
            setOrder(data.data);
        } catch {
            setError("Could not load order. Please refresh the page.");
        }
    };

    useEffect(() => {
        loadOrder();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    if (!order) {
        return (
            <Layout>
                <div className="order-detail order-detail--loading">
                    <div className="od-skeleton-head" />
                    <div className="od-skeleton-tracker" />
                    <div className="od-skeleton-card" />
                    <div className="od-skeleton-card od-skeleton-card--short" />
                </div>
            </Layout>
        );
    }

    const currentStepIndex = ORDER_STATUS_FLOW.indexOf(order.order_status);
    const isTerminalFail = ORDER_STATUS_TERMINAL_FAIL.includes(
        order.order_status,
    );
    const statusTone = STATUS_TONE[order.order_status] ?? "neutral";
    const canCancel = order.order_status === "pending";
    const cancellationActor = order.cancellation?.actor_type === "customer"
        ? "you"
        : order.cancellation?.actor_type === "admin"
          ? `an administrator${order.cancellation.actor_name ? ` (${order.cancellation.actor_name})` : ""}`
          : "the system";

    const cancelOrder = async () => {
        if (!window.confirm("Are you sure you want to cancel this order?"))
            return;

        setCancelling(true);
        setError("");
        try {
            await api.patch(`/orders/${id}/cancel`);
            await loadOrder();
            setFlash("Order cancelled successfully.");
            setTimeout(() => setFlash(""), 4000);
        } catch (err) {
            setError(err.response?.data?.message || "Could not cancel order.");
        } finally {
            setCancelling(false);
        }
    };

    const justPlaced = Boolean(searchParams.get("placed"));

    return (
        <Layout>
            <div className="order-detail">
                {/* ---------- Success / cancel flash ---------- */}
                {justPlaced && (
                    <div className="od-banner od-banner--success" role="status">
                        <span className="od-banner__icon">
                            <Icon name="check" size={16} />
                        </span>
                        <div>
                            <strong>Order placed successfully</strong>
                            <p>
                                We've received your order and will notify you
                                when it ships.
                            </p>
                        </div>
                    </div>
                )}

                {flash && (
                    <div className="od-banner od-banner--info" role="status">
                        <span className="od-banner__icon">
                            <Icon name="check" size={16} />
                        </span>
                        <div>
                            <strong>{flash}</strong>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="od-banner od-banner--error" role="alert">
                        <span className="od-banner__icon">
                            <Icon name="alert" size={16} />
                        </span>
                        <div>
                            <strong>{error}</strong>
                        </div>
                    </div>
                )}

                {/* ---------- Header ---------- */}
                <header className="od-head">
                    <div className="od-head__left">
                        <button
                            type="button"
                            className="od-back"
                            onClick={() => navigate("/orders")}
                        >
                            <Icon name="arrow-left" size={16} />
                            <span>All orders</span>
                        </button>
                        <h1 className="od-head__title">
                            Order{" "}
                            <span className="od-head__number">
                                {order.order_number}
                            </span>
                        </h1>
                        <p className="od-head__date">
                            Placed {formatDate(order.created_at)}
                        </p>
                    </div>
                    <span className={`od-status od-status--${statusTone}`}>
                        <span className="od-status__dot" />
                        {order.order_status}
                    </span>
                </header>

                {/* ---------- Tracker ---------- */}
                {!isTerminalFail ? (
                    <section className="od-tracker" aria-label="Order progress">
                        {ORDER_STATUS_FLOW.map((step, i) => {
                            const done = i <= currentStepIndex;
                            const current = i === currentStepIndex;
                            return (
                                <div
                                    key={step}
                                    className={`od-tracker__step ${
                                        done ? "is-done" : ""
                                    } ${current ? "is-current" : ""}`}
                                >
                                    <span className="od-tracker__dot">
                                        {done && (
                                            <Icon name="check" size={11} />
                                        )}
                                    </span>
                                    <span className="od-tracker__label">
                                        {step.charAt(0).toUpperCase() +
                                            step.slice(1)}
                                    </span>
                                </div>
                            );
                        })}
                    </section>
                ) : (
                    <div
                        className={`od-fail-banner od-fail-banner--${order.order_status}`}
                    >
                        <Icon name="alert" size={18} />
                        <div>
                            <strong>Order {order.order_status}</strong>
                            <p>
                                {order.order_status === "cancelled"
                                    ? `Cancelled by ${cancellationActor}${order.cancellation?.cancelled_at ? ` on ${formatDate(order.cancellation.cancelled_at)}` : ""}.`
                                    : `Rejected by ${cancellationActor}${order.cancellation?.cancelled_at ? ` on ${formatDate(order.cancellation.cancelled_at)}` : ""}. Contact support if you need help.`}
                            </p>
                        </div>
                    </div>
                )}

                {/* ---------- Tracking ---------- */}
                {order.tracking_number && (
                    <div className="od-tracking">
                        <Icon name="truck" size={18} />
                        <div className="od-tracking__body">
                            <span className="od-tracking__label">
                                Tracking number
                            </span>
                            <span className="od-tracking__value">
                                {order.tracking_number}
                            </span>
                        </div>
                        {order.shipping_partner && (
                            <span className="od-tracking__carrier">
                                via {order.shipping_partner}
                            </span>
                        )}
                    </div>
                )}

                <div className="od-grid">
                    {/* ---------- Left column ---------- */}
                    <div className="od-main">
                        {/* Items */}
                        <section className="od-card">
                            <header className="od-card__head">
                                <h2>Items</h2>
                                <span className="od-card__meta">
                                    {order.items?.length ?? 0} item
                                    {(order.items?.length ?? 0) === 1
                                        ? ""
                                        : "s"}
                                </span>
                            </header>
                            <ul className="od-items">
                                {order.items?.map((item) => (
                                    <li key={item.id} className="od-item">
                                        <ProductResultThumbnail
                                            product={item.product}
                                            size="md"
                                        />
                                        <div className="od-item__main">
                                            <span className="od-item__name">
                                                {item.product?.name ??
                                                    "Product"}
                                            </span>
                                            <span className="od-item__meta">
                                                Qty {item.quantity}
                                                {item.unit_price != null && (
                                                    <>
                                                        {" · "}
                                                        {formatCurrency(
                                                            item.unit_price,
                                                        )}{" "}
                                                        each
                                                    </>
                                                )}
                                            </span>
                                        </div>
                                        <span className="od-item__price">
                                            {formatCurrency(item.total_price)}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            <div className="od-totals">
                                <div className="od-totals__row">
                                    <span>Subtotal</span>
                                    <span>
                                        {formatCurrency(order.total_amount)}
                                    </span>
                                </div>
                                <div className="od-totals__row">
                                    <span>Tax</span>
                                    <span>
                                        {formatCurrency(order.tax_amount)}
                                    </span>
                                </div>
                                {Number(order.discount_amount) > 0 && (
                                    <div className="od-totals__row od-totals__row--discount">
                                        <span>Discount</span>
                                        <span>
                                            −
                                            {formatCurrency(
                                                order.discount_amount,
                                            )}
                                        </span>
                                    </div>
                                )}
                                <div className="od-totals__row od-totals__row--total">
                                    <span>Grand total</span>
                                    <span>
                                        {formatCurrency(order.grand_total)}
                                    </span>
                                </div>
                            </div>
                        </section>

                        {/* Shipping */}
                        <section className="od-card">
                            <header className="od-card__head">
                                <h2>Shipping address</h2>
                            </header>
                            <p className="od-address">
                                {order.shipping_address}
                            </p>
                        </section>

                        {/* Billing (only if different) */}
                        {order.billing_address &&
                            order.billing_address !==
                                order.shipping_address && (
                                <section className="od-card">
                                    <header className="od-card__head">
                                        <h2>Billing address</h2>
                                    </header>
                                    <p className="od-address">
                                        {order.billing_address}
                                    </p>
                                </section>
                            )}
                    </div>

                    {/* ---------- Right column ---------- */}
                    <aside className="od-aside">
                        <div className="od-summary">
                            <h3 className="od-summary__title">Order summary</h3>

                            <dl className="od-summary__list">
                                <div className="od-summary__row">
                                    <dt>Status</dt>
                                    <dd>
                                        <span
                                            className={`od-status od-status--sm od-status--${statusTone}`}
                                        >
                                            <span className="od-status__dot" />
                                            {order.order_status}
                                        </span>
                                    </dd>
                                </div>
                                <div className="od-summary__row">
                                    <dt>Payment</dt>
                                    <dd className="od-summary__value">
                                        {order.payment_method ?? "—"}
                                    </dd>
                                </div>
                                <div className="od-summary__row">
                                    <dt>Payment status</dt>
                                    <dd className="od-summary__value">
                                        {order.payment_status ?? "—"}
                                    </dd>
                                </div>
                                <div className="od-summary__row">
                                    <dt>Placed on</dt>
                                    <dd className="od-summary__value">
                                        {formatDate(order.created_at)}
                                    </dd>
                                </div>
                                {isTerminalFail && order.cancellation && (
                                    <div className="od-summary__row od-summary__row--cancellation">
                                        <dt>{order.order_status === "rejected" ? "Rejected by" : "Cancelled by"}</dt>
                                        <dd className="od-summary__value">
                                            {order.cancellation.actor_type === "customer"
                                                ? "You"
                                                : order.cancellation.actor_type === "admin"
                                                  ? order.cancellation.actor_name || "Administrator"
                                                  : "System"}
                                        </dd>
                                    </div>
                                )}
                                {order.tracking_number && (
                                    <div className="od-summary__row">
                                        <dt>Tracking</dt>
                                        <dd className="od-summary__value od-summary__mono">
                                            {order.tracking_number}
                                        </dd>
                                    </div>
                                )}
                            </dl>

                            <div className="od-summary__total">
                                <span>Total paid</span>
                                <span>{formatCurrency(order.grand_total)}</span>
                            </div>

                            <section className="enterprise-invoice-summary" aria-label="GST invoice and payment summary">
                                <div><strong>Invoice & tax summary</strong><span className={`enterprise-payment-pill ${String(order.payment_status || '').toLowerCase() === 'paid' ? 'is-paid' : 'is-pending'}`}>{order.payment_status || 'Status pending'}</span></div>
                                <dl>
                                    <div><dt>Taxable subtotal</dt><dd>{formatCurrency(order.total_amount)}</dd></div>
                                    <div><dt>Tax (as recorded)</dt><dd>{formatCurrency(order.tax_amount)}</dd></div>
                                    <div><dt>Discount</dt><dd>− {formatCurrency(order.discount_amount)}</dd></div>
                                    <div><dt>Invoice total</dt><dd>{formatCurrency(order.grand_total)}</dd></div>
                                </dl>
                                {order.gst_invoice_url ? <a className="enterprise-invoice-link" href={order.gst_invoice_url} target="_blank" rel="noopener noreferrer">Open GST invoice PDF ↗</a> : <p className="enterprise-smallprint">The GST invoice PDF will be available here after your administrator generates it.</p>}
                            </section>

                            {canCancel && (
                                <button
                                    type="button"
                                    className="od-cancel"
                                    onClick={cancelOrder}
                                    disabled={cancelling}
                                >
                                    {cancelling ? (
                                        <>
                                            <span className="od-cancel__spin" />
                                            Cancelling…
                                        </>
                                    ) : (
                                        <>
                                            <Icon name="x" size={15} />
                                            Cancel order
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </aside>
                </div>
            </div>
        </Layout>
    );
}
