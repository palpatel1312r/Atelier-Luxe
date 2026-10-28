import PurchaseProgress from "../components/PurchaseProgress";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/ui/Icon";
import "../styles/checkout.css";

const PAYMENT_METHODS = [
    {
        id: "credit",
        label: "Credit (Pay Later)",
        hint: "Settle against your approved credit limit",
        icon: "credit-card",
    },
    {
        id: "cod",
        label: "Cash on Delivery",
        hint: "Pay when your order arrives",
        icon: "package",
    },
    {
        id: "online",
        label: "Online Payment",
        hint: "UPI, cards, net-banking via Razorpay",
        icon: "zap",
    },
];

const formatCurrency = (value) =>
    `₹${Number(value ?? 0).toLocaleString("en-IN")}`;

const emptyAddress = {
    label: "Office", recipient_name: "", phone: "", address_line: "",
    city: "", state: "", pincode: "", country: "India", is_default: false,
};

const formatAddress = (address) => [
    address.recipient_name, address.address_line, address.city, address.state,
    address.pincode, address.country, address.phone ? `Phone: ${address.phone}` : null,
].filter(Boolean).join(", ");

export default function Checkout() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const buyNowItem = location.state?.buyNow ?? null;

    const [cart, setCart] = useState(null);
    const [shippingAddress, setShippingAddress] = useState(user?.address ?? "");
    const [addresses, setAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [addressForm, setAddressForm] = useState(() => ({
        ...emptyAddress, recipient_name: user?.name ?? "", phone: user?.phone ?? "",
    }));
    const [savingAddress, setSavingAddress] = useState(false);
    const [billingAddress, setBillingAddress] = useState("");
    const [sameAsShipping, setSameAsShipping] = useState(true);
    const [paymentMethod, setPaymentMethod] = useState("credit");
    const [notes, setNotes] = useState("");
    const [placing, setPlacing] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        api.get("/addresses").then(({ data }) => {
            if (cancelled) return;
            const saved = data.data ?? [];
            setAddresses(saved);
            const preferred = saved.find((item) => item.is_default) ?? saved[0];
            if (preferred) {
                setSelectedAddressId(preferred.id);
                setShippingAddress(formatAddress(preferred));
            }
        }).catch(() => { /* Manual entry remains available. */ });
        return () => { cancelled = true; };
    }, []);

    const selectAddress = (address) => {
        setSelectedAddressId(address.id);
        setShippingAddress(formatAddress(address));
        setShowAddressForm(false);
    };

    const saveAddress = async () => {
        setError("");
        const required = ["label", "recipient_name", "address_line", "city", "state", "pincode"];
        if (required.some((key) => !addressForm[key].trim())) {
            setError("Please complete all required address fields.");
            return;
        }
        setSavingAddress(true);
        try {
            const { data } = await api.post("/addresses", addressForm);
            const saved = data.data;
            setAddresses((current) => [saved, ...current.map((item) =>
                saved.is_default ? { ...item, is_default: false } : item
            )]);
            selectAddress(saved);
            setAddressForm({ ...emptyAddress, recipient_name: user?.name ?? "", phone: user?.phone ?? "" });
        } catch (err) {
            setError(err.response?.data?.message || "Could not save the address.");
        } finally {
            setSavingAddress(false);
        }
    };

    const removeAddress = async (address) => {
        try {
            await api.delete(`/addresses/${address.id}`);
            const remaining = addresses.filter((item) => item.id !== address.id);
            setAddresses(remaining);
            if (selectedAddressId === address.id) {
                const next = remaining[0];
                setSelectedAddressId(next?.id ?? null);
                setShippingAddress(next ? formatAddress(next) : "");
            }
        } catch (err) {
            setError(err.response?.data?.message || "Could not remove the address.");
        }
    };

    useEffect(() => {
        if (buyNowItem) return;
        let cancelled = false;
        api.get("/cart")
            .then(({ data }) => !cancelled && setCart(data.data))
            .catch(
                () =>
                    !cancelled &&
                    setError("Could not load your cart. Please refresh."),
            );
        return () => {
            cancelled = true;
        };
    }, [buyNowItem]);

    const displayItems = useMemo(() => {
        if (buyNowItem) {
            return [
                {
                    id: `buynow-${buyNowItem.variant_id}`,
                    product_name: buyNowItem.product_name,
                    quantity: buyNowItem.quantity,
                    unit_price: buyNowItem.unit_price,
                    total_price: buyNowItem.total_price,
                },
            ];
        }
        return cart?.items ?? [];
    }, [buyNowItem, cart]);

    const grandTotal = buyNowItem
        ? buyNowItem.total_price
        : (cart?.grand_total ?? 0);

    const placeOrder = async (e) => {
        e.preventDefault();
        setError("");

        if (!shippingAddress.trim()) {
            setError("Please enter a shipping address.");
            return;
        }
        if (!sameAsShipping && !billingAddress.trim()) {
            setError("Please enter a billing address.");
            return;
        }

        setPlacing(true);
        try {
            const payload = {
                shipping_address: shippingAddress,
                billing_address: sameAsShipping
                    ? shippingAddress
                    : billingAddress,
                payment_method: paymentMethod,
                notes,
            };
            if (buyNowItem) {
                payload.buy_now = {
                    product_id: buyNowItem.product_id,
                    variant_id: buyNowItem.variant_id,
                    quantity: buyNowItem.quantity,
                };
            }

            const { data } = await api.post("/orders", payload);

            if (paymentMethod === "online") {
                await payOnline(data.data);
            } else {
                navigate(`/orders/${data.data.id}?placed=1`);
            }
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Could not place order. Please try again.",
            );
        } finally {
            setPlacing(false);
        }
    };

    const payOnline = async (order) => {
        const { data } = await api.post(`/orders/${order.id}/create-payment`);
        await loadRazorpayScript();

        const rzp = new window.Razorpay({
            key: data.razorpay_key,
            order_id: data.razorpay_order_id,
            amount: data.amount,
            currency: data.currency,
            name: "Order Payment",
            description: data.order_number,
            handler: async (response) => {
                try {
                    await api.post(`/orders/${order.id}/verify-payment`, {
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_signature: response.razorpay_signature,
                    });
                    navigate(`/orders/${order.id}?placed=1`);
                } catch {
                    setError(
                        "Payment verification failed. If money was deducted, contact support with your order number.",
                    );
                }
            },
            modal: { ondismiss: () => navigate(`/orders/${order.id}`) },
            theme: { color: "#b08d57" },
        });
        rzp.open();
    };

    const loadRazorpayScript = () =>
        new Promise((resolve, reject) => {
            if (window.Razorpay) return resolve();
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });

    /* ---------------- Loading state ---------------- */
    if (!buyNowItem && !cart) {
        return (
            <Layout>
                <div className="checkout checkout--loading">
                    <div className="checkout-skeleton-grid">
                        <div className="checkout-skeleton-col">
                            <div className="checkout-skeleton-line" />
                            <div className="checkout-skeleton-block" />
                            <div className="checkout-skeleton-block" />
                        </div>
                        <div className="checkout-skeleton-col">
                            <div className="checkout-skeleton-line checkout-skeleton-line--short" />
                            <div className="checkout-skeleton-block checkout-skeleton-block--tall" />
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    /* ---------------- Empty state ---------------- */
    if (!buyNowItem && cart.items.length === 0) {
        return (
            <Layout>
                <div className="checkout checkout--empty">
                    <div className="checkout-empty-icon">
                        <Icon name="shopping-bag" size={28} />
                    </div>
                    <h2>Your cart is empty</h2>
                    <p>Add products to your cart to proceed to checkout.</p>
                    <button
                        type="button"
                        className="checkout-cta"
                        onClick={() => navigate("/products")}
                    >
                        Browse Products
                        <Icon name="arrow-right" size={16} />
                    </button>
                </div>
            </Layout>
        );
    }

    /* ---------------- Main checkout ---------------- */
    return (
        <Layout>
            <PurchaseProgress stage="checkout" />
            <form className="checkout" onSubmit={placeOrder} noValidate>
                {/* Header */}
                <header className="checkout-head">
                    <div className="checkout-head__copy">
                        <p className="checkout-head__eyebrow">
                            CHECKOUT / 02
                        </p>
                        <h1 className="checkout-head__title">
                            Just one more step.
                            {buyNowItem && (
                                <span className="checkout-head__badge">
                                    Buy Now
                                </span>
                            )}
                        </h1>
                        <p className="checkout-head__sub">
                            Confirm your shipping details and choose how you'd
                            like to pay.
                        </p>
                    </div>
                    <div className="checkout-head__seal">
                        <Icon name="shield" size={18} />
                        <span>Encrypted</span>
                    </div>
                </header>

                {/* Stepper */}
                <ol className="checkout-steps">
                    <li className="is-done">
                        <span className="checkout-steps__dot">
                            <Icon name="check" size={12} />
                        </span>
                        <span className="checkout-steps__label">Cart</span>
                    </li>
                    <li className="is-current">
                        <span className="checkout-steps__dot">2</span>
                        <span className="checkout-steps__label">
                            Delivery &amp; payment
                        </span>
                    </li>
                    <li>
                        <span className="checkout-steps__dot">3</span>
                        <span className="checkout-steps__label">
                            Confirmation
                        </span>
                    </li>
                </ol>

                <div className="checkout-grid">
                    {/* LEFT: form */}
                    <div className="checkout-main">
                        {/* Shipping */}
                        <section className="checkout-card" data-step="1">
                            <header className="checkout-card__head">
                                <span className="checkout-card__step">1</span>
                                <div>
                                    <h2>Shipping address</h2>
                                    <p>Where should we deliver your order?</p>
                                </div>
                            </header>
                            {addresses.length > 0 && (
                                <div className="checkout-addresses" role="radiogroup" aria-label="Saved shipping addresses">
                                    {addresses.map((address) => (
                                        <div className={`checkout-address ${selectedAddressId === address.id ? "is-selected" : ""}`} key={address.id}>
                                            <label className="checkout-address__select">
                                                <input type="radio" name="saved-address" checked={selectedAddressId === address.id} onChange={() => selectAddress(address)} />
                                                <span className="checkout-address__mark" aria-hidden />
                                                <span className="checkout-address__body">
                                                    <span className="checkout-address__top">
                                                        <strong>{address.label}</strong>
                                                        {address.is_default && <small>Default</small>}
                                                    </span>
                                                    <span>{formatAddress(address)}</span>
                                                </span>
                                            </label>
                                            <button type="button" className="checkout-address__remove" onClick={(event) => { event.preventDefault(); removeAddress(address); }} aria-label={`Remove ${address.label} address`}>
                                                <Icon name="x" size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="checkout-address__actions">
                                <button type="button" className="checkout-address__add" onClick={() => setShowAddressForm((open) => !open)}>
                                    <Icon name={showAddressForm ? "x" : "plus"} size={15} />
                                    {showAddressForm ? "Cancel" : "Add new address"}
                                </button>
                            </div>
                            {showAddressForm && (
                                <div className="checkout-address-form">
                                    {[
                                        ["label", "Label", "Office / Warehouse"],
                                        ["recipient_name", "Recipient name", "Contact person"],
                                        ["phone", "Phone", "Delivery contact"],
                                        ["address_line", "Address", "Building, street and area"],
                                        ["city", "City", "City"],
                                        ["state", "State", "State"],
                                        ["pincode", "PIN code", "PIN code"],
                                        ["country", "Country", "Country"],
                                    ].map(([key, label, placeholder]) => (
                                        <label className={key === "address_line" ? "is-wide" : ""} key={key}>
                                            <span>{label}{key !== "phone" && " *"}</span>
                                            <input value={addressForm[key]} placeholder={placeholder} onChange={(e) => setAddressForm((current) => ({ ...current, [key]: e.target.value }))} />
                                        </label>
                                    ))}
                                    <label className="checkout-address-form__default is-wide">
                                        <input type="checkbox" checked={addressForm.is_default} onChange={(e) => setAddressForm((current) => ({ ...current, is_default: e.target.checked }))} />
                                        Make this my default address
                                    </label>
                                    <button type="button" className="checkout-address-form__save is-wide" onClick={saveAddress} disabled={savingAddress}>
                                        {savingAddress ? "Saving…" : "Save and use this address"}
                                    </button>
                                </div>
                            )}
                            <p className="checkout-address__manual-label">{addresses.length ? "Or adjust the selected address for this order" : "Enter an address for this order"}</p>
                            <textarea
                                className="checkout-textarea"
                                value={shippingAddress}
                                onChange={(e) => { setShippingAddress(e.target.value); setSelectedAddressId(null); }}
                                rows={4}
                                placeholder="Flat / building, street, area, city, state, PIN"
                            />
                        </section>

                        {/* Billing */}
                        <section className="checkout-card" data-step="2">
                            <header className="checkout-card__head">
                                <span className="checkout-card__step">2</span>
                                <div>
                                    <h2>Billing address</h2>
                                    <p>Used for your GST invoice.</p>
                                </div>
                            </header>
                            <label className="checkout-check">
                                <input
                                    type="checkbox"
                                    checked={sameAsShipping}
                                    onChange={(e) =>
                                        setSameAsShipping(e.target.checked)
                                    }
                                />
                                <span className="checkout-check__box" />
                                <span className="checkout-check__label">
                                    Same as shipping address
                                </span>
                            </label>

                            {!sameAsShipping && (
                                <textarea
                                    className="checkout-textarea checkout-textarea--reveal"
                                    value={billingAddress}
                                    onChange={(e) =>
                                        setBillingAddress(e.target.value)
                                    }
                                    rows={4}
                                    placeholder="Billing address"
                                />
                            )}
                        </section>

                        {/* Payment */}
                        <section className="checkout-card" data-step="3">
                            <header className="checkout-card__head">
                                <span className="checkout-card__step">3</span>
                                <div>
                                    <h2>Payment method</h2>
                                    <p>Choose how you'd like to pay.</p>
                                </div>
                            </header>
                            <div
                                className="checkout-pay"
                                role="radiogroup"
                                aria-label="Payment method"
                            >
                                {PAYMENT_METHODS.map((pm) => {
                                    const active = paymentMethod === pm.id;
                                    return (
                                        <label
                                            key={pm.id}
                                            className={`checkout-pay__opt ${
                                                active
                                                    ? "checkout-pay__opt--active"
                                                    : ""
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="payment"
                                                value={pm.id}
                                                checked={active}
                                                onChange={() =>
                                                    setPaymentMethod(pm.id)
                                                }
                                            />
                                            <span className="checkout-pay__icon">
                                                <Icon
                                                    name={pm.icon}
                                                    size={18}
                                                />
                                            </span>
                                            <span className="checkout-pay__body">
                                                <span className="checkout-pay__label">
                                                    {pm.label}
                                                </span>
                                                <span className="checkout-pay__hint">
                                                    {pm.hint}
                                                </span>
                                            </span>
                                            <span
                                                className="checkout-pay__radio"
                                                aria-hidden="true"
                                            />
                                        </label>
                                    );
                                })}
                            </div>
                        </section>

                        {/* Notes */}
                        <section className="checkout-card" data-step="4">
                            <header className="checkout-card__head">
                                <span className="checkout-card__step">4</span>
                                <div>
                                    <h2>
                                        Order notes{" "}
                                        <span className="checkout-card__opt">
                                            optional
                                        </span>
                                    </h2>
                                    <p>Anything we should know?</p>
                                </div>
                            </header>
                            <textarea
                                className="checkout-textarea"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                placeholder="Special instructions, delivery window…"
                            />
                        </section>
                    </div>

                    {/* RIGHT: order summary */}
                    <aside className="checkout-aside">
                        <div className="checkout-summary">
                            <header className="checkout-summary__head">
                                <h3>Order summary</h3>
                                <span className="checkout-summary__count">
                                    {displayItems.length} item
                                    {displayItems.length === 1 ? "" : "s"}
                                </span>
                            </header>

                            <ul className="checkout-summary__items">
                                {displayItems.map((item) => (
                                    <li
                                        key={item.id}
                                        className="checkout-summary__item"
                                    >
                                        <div className="checkout-summary__item-main">
                                            <span className="checkout-summary__item-name">
                                                {item.product_name}
                                            </span>
                                            <span className="checkout-summary__item-qty">
                                                Qty {item.quantity} ·{" "}
                                                {formatCurrency(
                                                    item.unit_price,
                                                )}{" "}
                                                each
                                            </span>
                                        </div>
                                        <span className="checkout-summary__item-price">
                                            {formatCurrency(item.total_price)}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            <div className="checkout-summary__totals">
                                <div className="checkout-summary__row">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(grandTotal)}</span>
                                </div>
                                <div className="checkout-summary__row">
                                    <span>Shipping</span>
                                    <span className="checkout-summary__muted">
                                        Calculated at dispatch
                                    </span>
                                </div>
                                <div className="checkout-summary__row checkout-summary__row--total">
                                    <span>Grand total</span>
                                    <span>{formatCurrency(grandTotal)}</span>
                                </div>
                            </div>

                            {error && (
                                <div className="checkout-alert" role="alert">
                                    <Icon name="alert" size={16} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                className="checkout-submit"
                                disabled={placing}
                            >
                                {placing ? (
                                    <>
                                        <span className="checkout-submit__spin" />
                                        Placing order…
                                    </>
                                ) : (
                                    <>
                                        <Icon name="lock" size={15} />
                                        Place order ·{" "}
                                        {formatCurrency(grandTotal)}
                                    </>
                                )}
                            </button>

                            <p className="checkout-summary__secure">
                                <Icon name="shield" size={13} />
                                Your details are transmitted securely.
                            </p>
                        </div>
                    </aside>
                </div>
            </form>
        </Layout>
    );
}
