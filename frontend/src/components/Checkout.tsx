import { useEffect, useRef, useState } from "react";
import { CartItem } from "../types";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatPrice } from "../lib/format";
import { FREE_SHIPPING_THRESHOLD, FLAT_SHIPPING_FEE } from "../lib/constants";
import { priceForSize } from "../lib/pricing";

export interface CheckoutFormData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;
  state: string;
  coupon_code?: string;
  payment_method: string;
  payment_id?: string;
  discount: number;
  shipping: number;
  subtotal: number;
  total: number;
}

interface SavedAddress {
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  zip?: string;
  country: string;
  phone?: string;
  is_default?: boolean;
}

interface CheckoutProps {
  items: CartItem[];
  onConfirm: (data: CheckoutFormData) => void | Promise<void>;
  onBack: () => void;
}

const UPI_VPA_REGEX = /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/;

function normalizeAddresses(raw: unknown): SavedAddress[] {
  if (!raw) return [];
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value.filter(
    (a): a is SavedAddress =>
      !!a && typeof a === "object" && typeof (a as any).line1 === "string",
  );
}

function addressMatchesForm(
  addr: SavedAddress,
  form: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  },
): boolean {
  return (
    addr.line1.trim() === form.address.trim() &&
    addr.city.trim() === form.city.trim() &&
    (addr.state ?? "").trim() === form.state.trim() &&
    (addr.zip ?? "").trim() === form.zipCode.trim() &&
    addr.country.trim() === form.country.trim()
  );
}

export default function Checkout({ items, onConfirm, onBack }: CheckoutProps) {
  const { user } = useAuth();
  const toast = useToast();

  const [formData, setFormData] = useState({
    email: user?.email ?? "",
    firstName: "",
    lastName: "",
    phone: user?.phone ?? "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "India",
    cardNumber: "",
    expiry: "",
    cvv: "",
    upi_vpa: "",
    coupon: "",
    payment_method: "card",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [discount, setDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const savedAddresses = normalizeAddresses(user?.addresses);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      email: prev.email || user?.email || "",
      phone: prev.phone || user?.phone || "",
    }));
  }, [user?.email, user?.phone]);

  const didPreselect = useRef(false);
  useEffect(() => {
    if (didPreselect.current) return;
    if (!user) return;
    if (savedAddresses.length === 0) return;

    const preferred =
      savedAddresses.find((a) => a.is_default) ?? savedAddresses[0];
    setFormData((prev) => ({
      ...prev,
      address: prev.address || preferred.line1 || "",
      city: prev.city || preferred.city || "",
      state: prev.state || preferred.state || "",
      zipCode: prev.zipCode || preferred.zip || "",
      country:
        prev.country && prev.country !== "India"
          ? prev.country
          : preferred.country || prev.country,
      phone: prev.phone || preferred.phone || "",
    }));
    didPreselect.current = true;
  }, [user, savedAddresses]);

  const subtotal = items.reduce(
    (sum, item) =>
      sum + priceForSize(item.product, item.selectedSize) * item.quantity,
    0,
  );
  const shipping = subtotal > FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_FEE;
  const total = Math.max(0, subtotal + shipping - discount);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const pickAddress = (addr: SavedAddress) => {
    setFormData((prev) => ({
      ...prev,
      address: addr.line1 || "",
      city: addr.city || "",
      state: addr.state || "",
      zipCode: addr.zip || "",
      country: addr.country || prev.country,
      phone: prev.phone || addr.phone || "",
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.address;
      delete next.city;
      delete next.zipCode;
      return next;
    });
  };

  const clearAddress = () => {
    setFormData((prev) => ({
      ...prev,
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: prev.country || "India",
    }));
  };

  const applyCoupon = async () => {
    if (!formData.coupon.trim()) return;
    try {
      const res = await api.validateCoupon(formData.coupon.trim(), subtotal);
      setDiscount(res.discount);
      setCouponMsg(`Coupon applied: −${formatPrice(res.discount)}`);
    } catch (err: any) {
      setDiscount(0);
      setCouponMsg(err.message || "Invalid coupon");
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.email) newErrors.email = "Required";
    if (!formData.firstName) newErrors.firstName = "Required";
    if (!formData.lastName) newErrors.lastName = "Required";
    if (!formData.address) newErrors.address = "Required";
    if (!formData.city) newErrors.city = "Required";
    if (!formData.zipCode) newErrors.zipCode = "Required";

    if (formData.payment_method === "card") {
      if (!formData.cardNumber) newErrors.cardNumber = "Required";
      if (!formData.expiry) newErrors.expiry = "Required";
      if (!formData.cvv) newErrors.cvv = "Required";
    }

    if (formData.payment_method === "upi") {
      const vpa = formData.upi_vpa.trim();
      if (!vpa) newErrors.upi_vpa = "Enter your UPI ID";
      else if (!UPI_VPA_REGEX.test(vpa))
        newErrors.upi_vpa = "Format: yourname@okhdfcbank";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      let payment_id = `mock_pay_${Date.now()}`;

      if (formData.payment_method === "card") {
        const intent = await api.createPaymentIntent(Math.round(total * 100));
        if (intent.payment_id) {
          const conf = await api.confirmPayment(intent.payment_id);
          payment_id = conf.payment_id || intent.payment_id;
        }
      } else if (formData.payment_method === "upi") {
        const intent = await api.createUpiIntent(
          total,
          formData.upi_vpa.trim(),
        );
        if (intent.payment_id) {
          const conf = await api.confirmUpiPayment(intent.payment_id);
          payment_id = conf.payment_id || intent.payment_id;
        }
      }

      await onConfirm({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        country: formData.country,
        coupon_code: discount > 0 ? formData.coupon.trim() : undefined,
        payment_method: formData.payment_method,
        payment_id,
        discount,
        shipping,
        subtotal,
        total,
      });
    } catch (err: any) {
      setErrors({ form: err.message || "Checkout failed" });
      toast.error(err.message || "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full px-4 py-3 border rounded-md text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800 transition-colors ${
      errors[field] ? "border-red-400" : "border-stone-200"
    }`;

  const hasSavedAddresses = !!user && savedAddresses.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-stone-600 hover:text-amber-800 transition-colors mb-8 group"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 group-hover:-translate-x-1 transition-transform"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        <span className="text-sm tracking-wider uppercase">Back to Cart</span>
      </button>

      <h1 className="text-2xl sm:text-3xl font-light tracking-wide text-stone-800 mb-8">
        Checkout
      </h1>

      {errors.form && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
          {errors.form}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-5 gap-10"
      >
        <div className="lg:col-span-3 space-y-8">
          <section>
            <h2 className="text-sm tracking-wider uppercase text-stone-500 mb-4">
              Contact
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <input
                  type="email"
                  name="email"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={handleChange}
                  className={inputClass("email")}
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
              </div>
              <div>
                <input
                  name="firstName"
                  placeholder="First name"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={inputClass("firstName")}
                />
                {errors.firstName && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.firstName}
                  </p>
                )}
              </div>
              <div>
                <input
                  name="lastName"
                  placeholder="Last name"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={inputClass("lastName")}
                />
                {errors.lastName && (
                  <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <input
                  name="phone"
                  placeholder="Phone (optional)"
                  value={formData.phone}
                  onChange={handleChange}
                  className={inputClass("phone")}
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm tracking-wider uppercase text-stone-500 mb-4">
              Shipping Address
            </h2>

            {hasSavedAddresses && (
              <div className="mb-5">
                <p className="text-xs text-stone-500 mb-3">
                  Choose a saved address
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {savedAddresses.map((addr, i) => {
                    const selected = addressMatchesForm(addr, formData);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => pickAddress(addr)}
                        className={`text-left p-4 rounded-lg border-2 transition-colors ${
                          selected
                            ? "border-amber-800 bg-amber-50/40"
                            : "border-stone-200 bg-white hover:border-stone-400"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          {addr.label && (
                            <span className="text-[10px] tracking-wider uppercase text-amber-800">
                              {addr.label}
                            </span>
                          )}
                          {addr.is_default && (
                            <span className="text-[10px] tracking-wider uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                              Default
                            </span>
                          )}
                          {selected && (
                            <span className="ml-auto text-amber-800 text-xs">
                              ✓ Selected
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-stone-800 leading-snug">
                          {addr.line1}
                          {addr.line2 ? `, ${addr.line2}` : ""}
                        </p>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {[addr.city, addr.state, addr.zip]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                        <p className="text-xs text-stone-500">{addr.country}</p>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={clearAddress}
                    className="text-left p-4 rounded-lg border-2 border-dashed border-stone-300 hover:border-amber-800 transition-colors flex flex-col justify-center items-center min-h-[100px]"
                  >
                    <span className="text-2xl text-stone-400 leading-none">
                      +
                    </span>
                    <span className="text-xs tracking-wider uppercase text-stone-500 mt-2">
                      New Address
                    </span>
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <input
                  name="address"
                  placeholder="Street address"
                  value={formData.address}
                  onChange={handleChange}
                  className={inputClass("address")}
                />
                {errors.address && (
                  <p className="text-red-500 text-xs mt-1">{errors.address}</p>
                )}
              </div>
              <div>
                <input
                  name="city"
                  placeholder="City"
                  value={formData.city}
                  onChange={handleChange}
                  className={inputClass("city")}
                />
                {errors.city && (
                  <p className="text-red-500 text-xs mt-1">{errors.city}</p>
                )}
              </div>
              <div>
                <input
                  name="state"
                  placeholder="State / Province"
                  value={formData.state}
                  onChange={handleChange}
                  className={inputClass("state")}
                />
              </div>
              <div>
                <input
                  name="zipCode"
                  placeholder="PIN code"
                  value={formData.zipCode}
                  onChange={handleChange}
                  className={inputClass("zipCode")}
                />
                {errors.zipCode && (
                  <p className="text-red-500 text-xs mt-1">{errors.zipCode}</p>
                )}
              </div>
              <div>
                <input
                  name="country"
                  placeholder="Country"
                  value={formData.country}
                  onChange={handleChange}
                  className={inputClass("country")}
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm tracking-wider uppercase text-stone-500 mb-4">
              Payment
            </h2>

            <div className="flex flex-wrap gap-5 mb-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="payment_method"
                  value="card"
                  checked={formData.payment_method === "card"}
                  onChange={handleChange}
                />
                Card
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="payment_method"
                  value="upi"
                  checked={formData.payment_method === "upi"}
                  onChange={handleChange}
                />
                UPI
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="payment_method"
                  value="cod"
                  checked={formData.payment_method === "cod"}
                  onChange={handleChange}
                />
                Cash on Delivery
              </label>
            </div>

            {formData.payment_method === "card" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-3">
                  <input
                    name="cardNumber"
                    placeholder="Card number"
                    value={formData.cardNumber}
                    onChange={handleChange}
                    className={inputClass("cardNumber")}
                  />
                  {errors.cardNumber && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.cardNumber}
                    </p>
                  )}
                </div>
                <div>
                  <input
                    name="expiry"
                    placeholder="MM/YY"
                    value={formData.expiry}
                    onChange={handleChange}
                    className={inputClass("expiry")}
                  />
                  {errors.expiry && (
                    <p className="text-red-500 text-xs mt-1">{errors.expiry}</p>
                  )}
                </div>
                <div>
                  <input
                    name="cvv"
                    placeholder="CVV"
                    value={formData.cvv}
                    onChange={handleChange}
                    className={inputClass("cvv")}
                  />
                  {errors.cvv && (
                    <p className="text-red-500 text-xs mt-1">{errors.cvv}</p>
                  )}
                </div>
              </div>
            )}

            {formData.payment_method === "upi" && (
              <div className="border border-stone-200 rounded-lg p-5 bg-stone-50/50">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
                  <p className="text-sm text-stone-800">
                    Pay{" "}
                    <span className="font-medium">{formatPrice(total)}</span>{" "}
                    via UPI
                  </p>
                  <p className="text-xs text-stone-500">
                    GPay · PhonePe · Paytm · BHIM
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-5">
                  <div className="w-full sm:w-40 flex-shrink-0">
                    <div className="aspect-square bg-white border border-stone-200 rounded-lg flex flex-col items-center justify-center text-center p-4">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-10 w-10 text-stone-400 mb-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 3h3v3h-3v-3zm3-3h3v3h-3v-3z"
                        />
                      </svg>
                      <p className="text-[10px] text-stone-500 leading-tight">
                        Scan with any UPI app
                      </p>
                    </div>
                  </div>

                  <div className="flex-1">
                    <label className="block text-sm text-stone-700 mb-1">
                      Your UPI ID *
                    </label>
                    <input
                      name="upi_vpa"
                      placeholder="yourname@okhdfcbank"
                      value={formData.upi_vpa}
                      onChange={handleChange}
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      className={inputClass("upi_vpa")}
                    />
                    {errors.upi_vpa && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.upi_vpa}
                      </p>
                    )}
                    <p className="text-xs text-stone-500 mt-3 leading-relaxed">
                      On placing the order you'll receive a payment request in
                      your UPI app. Approve it to complete your purchase.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs text-stone-400 mt-4">
              Demo mode: payments are simulated. Add STRIPE_SECRET_KEY (card) or
              RAZORPAY_KEY_ID (UPI) on the server for live charges.
            </p>
          </section>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-stone-50 rounded-lg p-6 border border-stone-200 sticky top-24 space-y-4">
            <h2 className="text-sm tracking-wider uppercase text-stone-500">
              Your Order
            </h2>
            <ul className="space-y-3 max-h-64 overflow-y-auto">
              {items.map((item) => (
                <li
                  key={`${item.product.id}-${item.selectedSize}`}
                  className="flex justify-between text-sm"
                >
                  <span className="text-stone-700">
                    {item.product.name} × {item.quantity}
                    <span className="text-stone-400 block text-xs">
                      {item.selectedSize}
                    </span>
                  </span>
                  <span className="text-stone-800">
                    {formatPrice(
                      priceForSize(item.product, item.selectedSize) *
                        item.quantity,
                    )}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex gap-2">
              <input
                name="coupon"
                placeholder="Coupon code"
                value={formData.coupon}
                onChange={handleChange}
                className="flex-1 px-3 py-2 border border-stone-200 rounded-md text-sm"
              />
              <button
                type="button"
                onClick={applyCoupon}
                className="px-3 py-2 text-sm bg-stone-800 text-white rounded-md hover:bg-stone-700"
              >
                Apply
              </button>
            </div>
            {couponMsg && (
              <p
                className={`text-xs ${
                  discount > 0 ? "text-green-700" : "text-red-500"
                }`}
              >
                {couponMsg}
              </p>
            )}
            <p className="text-xs text-stone-400">Try: WELCOME10 or LUXE25</p>

            <div className="space-y-2 text-sm border-t border-stone-200 pt-4">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Shipping</span>
                <span>{shipping === 0 ? "Free" : formatPrice(shipping)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Discount</span>
                  <span>−{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-800 font-medium text-base pt-2 border-t border-stone-200">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || items.length === 0}
              className="w-full py-3.5 bg-amber-900 text-white text-sm tracking-wider uppercase rounded-md hover:bg-amber-800 transition-colors disabled:opacity-50"
            >
              {submitting
                ? "Processing…"
                : formData.payment_method === "upi"
                  ? `Pay ${formatPrice(total)} via UPI`
                  : `Place Order — ${formatPrice(total)}`}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
