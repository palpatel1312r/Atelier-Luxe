import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/client";
import "../styles/login.css";

function EyeIcon({ show }) {
    if (show) {
        return (
            <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
            </svg>
        );
    }
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
    );
}

export default function Register() {
    const navigate = useNavigate();
    const [step, setStep] = useState("form"); // 'form' | 'otp'
    const [form, setForm] = useState({
        name: "",
        phone: "",
        email: "",
        company_name: "",
        gst_number: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        password: "",
        password_confirmation: "",
    });

    // ✅ SEPARATE states for Password and Confirm Password
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [otp, setOtp] = useState("");
    const [showOtp, setShowOtp] = useState(false);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    const update = (field) => (e) => {
        let value = e.target.value;

        // ✅ Phone: only numbers, max 10 digits
        if (field === "phone") {
            value = value.replace(/\D/g, "").slice(0, 10);
        }

        // ✅ Pincode: only numbers, max 6 digits
        if (field === "pincode") {
            value = value.replace(/\D/g, "").slice(0, 6);
        }

        setForm({ ...form, [field]: value });
        // Clear field error when user starts typing
        if (fieldErrors[field]) {
            setFieldErrors({ ...fieldErrors, [field]: "" });
        }
    };

    const startCooldown = () => {
        setCooldown(60);
        const t = setInterval(() => {
            setCooldown((c) => {
                if (c <= 1) {
                    clearInterval(t);
                    return 0;
                }
                return c - 1;
            });
        }, 1000);
    };

    const register = async (e) => {
        e.preventDefault();
        setError("");
        setFieldErrors({});
        setLoading(true);

        // ✅ Frontend validation
        if (form.phone.length !== 10) {
            setFieldErrors({
                phone: "Phone number must be exactly 10 digits.",
            });
            setLoading(false);
            return;
        }

        try {
            // ✅ Just call register - it sends OTP automatically
            await api.post("/dealer/register", form);

            // ✅ Go to OTP step
            setStep("otp");
            startCooldown();
        } catch (err) {
            // ✅ Handle field-specific errors from backend
            if (err.response?.data?.errors) {
                setFieldErrors(err.response.data.errors);
            }
            setError(err.response?.data?.message || "Registration failed.");
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const { data } = await api.post("/dealer/verify-otp", {
                phone: form.phone,
                otp,
                is_registration: true,
            });

            // ✅ Store the token properly
            if (data.token) {
                localStorage.setItem("access_token", data.token);
                // Also store user data if available
                if (data.user) {
                    localStorage.setItem(
                        "user_data",
                        JSON.stringify(data.user),
                    );
                }
            }

            // ✅ Redirect to dashboard
            navigate("/dashboard", { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || "Invalid OTP.");
        } finally {
            setLoading(false);
        }
    };

    const resendOtp = async () => {
        try {
            await api.post("/dealer/send-otp", { phone: form.phone });
            startCooldown();
        } catch (err) {
            setError(err.response?.data?.message || "Could not resend OTP.");
        }
    };

    if (step === "otp") {
        return (
            <div className="login-page">
                <div className="login-card">
                    <p className="login-card__brand">B2b Wholesale</p>
                    <h1 className="login-card__title">Verify OTP</h1>
                    <p className="login-card__subtitle">
                        OTP sent to {form.phone}
                    </p>

                    <form onSubmit={verifyOtp} className="login-form">
                        <label className="login-form__label">Enter OTP</label>
                        <div className="password-wrapper">
                            <input
                                className="login-form__input login-form__input--otp"
                                inputMode="numeric"
                                maxLength={6}
                                type={showOtp ? "text" : "password"}
                                value={otp}
                                onChange={(e) =>
                                    setOtp(
                                        e.target.value
                                            .replace(/\D/g, "")
                                            .slice(0, 6),
                                    )
                                }
                                placeholder=""
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowOtp(!showOtp)}
                                aria-label={showOtp ? "Hide OTP" : "Show OTP"}
                            >
                                <EyeIcon show={showOtp} />
                            </button>
                        </div>

                        {error && <p className="login-form__error">{error}</p>}

                        <button
                            className="login-form__submit"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? "Verifying…" : "Verify & Login"}
                        </button>

                        <button
                            type="button"
                            className="login-form__resend"
                            disabled={cooldown > 0}
                            onClick={resendOtp}
                        >
                            {cooldown > 0
                                ? `Resend OTP in ${cooldown}s`
                                : "Resend OTP"}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="login-page">
            <div className="login-card login-card--register">
                <p className="login-card__brand">B2B Wholesale</p>
                <h1 className="login-card__title">Create Account</h1>
                <p className="login-card__subtitle">Register as a new dealer</p>

                <form onSubmit={register} className="login-form">
                    <label className="login-form__label">Full Name *</label>
                    <input
                        className={`login-form__input ${fieldErrors.name ? "login-form__input--error" : ""}`}
                        type="text"
                        value={form.name}
                        onChange={update("name")}
                        placeholder="Enter your full name"
                        required
                    />
                    {fieldErrors.name && (
                        <p className="login-form__field-error">
                            {fieldErrors.name}
                        </p>
                    )}

                    <label className="login-form__label">Mobile Number *</label>
                    <input
                        className={`login-form__input ${fieldErrors.phone ? "login-form__input--error" : ""}`}
                        type="tel"
                        value={form.phone}
                        onChange={update("phone")}
                        placeholder="9876543210"
                        maxLength={10}
                        required
                    />
                    {fieldErrors.phone && (
                        <p className="login-form__field-error">
                            {fieldErrors.phone}
                        </p>
                    )}

                    <label className="login-form__label">Email</label>
                    <input
                        className={`login-form__input ${fieldErrors.email ? "login-form__input--error" : ""}`}
                        type="email"
                        value={form.email}
                        onChange={update("email")}
                        placeholder="you@example.com"
                    />
                    {fieldErrors.email && (
                        <p className="login-form__field-error">
                            {fieldErrors.email}
                        </p>
                    )}

                    <label className="login-form__label">Company Name *</label>
                    <input
                        className={`login-form__input ${fieldErrors.company_name ? "login-form__input--error" : ""}`}
                        type="text"
                        value={form.company_name}
                        onChange={update("company_name")}
                        placeholder="Your business name"
                        required
                    />
                    {fieldErrors.company_name && (
                        <p className="login-form__field-error">
                            {fieldErrors.company_name}
                        </p>
                    )}

                    <label className="login-form__label">GST Number</label>
                    <input
                        className={`login-form__input ${fieldErrors.gst_number ? "login-form__input--error" : ""}`}
                        type="text"
                        value={form.gst_number}
                        onChange={update("gst_number")}
                        placeholder="24AAAAA0000A1Z5"
                        maxLength={15}
                    />
                    {fieldErrors.gst_number && (
                        <p className="login-form__field-error">
                            {fieldErrors.gst_number}
                        </p>
                    )}

                    <label className="login-form__label">Address</label>
                    <input
                        className={`login-form__input ${fieldErrors.address ? "login-form__input--error" : ""}`}
                        type="text"
                        value={form.address}
                        onChange={update("address")}
                        placeholder="Street address"
                    />
                    {fieldErrors.address && (
                        <p className="login-form__field-error">
                            {fieldErrors.address}
                        </p>
                    )}

                    <div className="login-form__row">
                        <div className="login-form__col">
                            <label className="login-form__label">City</label>
                            <input
                                className={`login-form__input ${fieldErrors.city ? "login-form__input--error" : ""}`}
                                type="text"
                                value={form.city}
                                onChange={update("city")}
                                placeholder="City"
                            />
                            {fieldErrors.city && (
                                <p className="login-form__field-error">
                                    {fieldErrors.city}
                                </p>
                            )}
                        </div>
                        <div className="login-form__col">
                            <label className="login-form__label">State</label>
                            <input
                                className={`login-form__input ${fieldErrors.state ? "login-form__input--error" : ""}`}
                                type="text"
                                value={form.state}
                                onChange={update("state")}
                                placeholder="State"
                            />
                            {fieldErrors.state && (
                                <p className="login-form__field-error">
                                    {fieldErrors.state}
                                </p>
                            )}
                        </div>
                    </div>

                    <label className="login-form__label">Pincode</label>
                    <input
                        className={`login-form__input ${fieldErrors.pincode ? "login-form__input--error" : ""}`}
                        type="text"
                        value={form.pincode}
                        onChange={update("pincode")}
                        placeholder="380001"
                        maxLength={6}
                    />
                    {fieldErrors.pincode && (
                        <p className="login-form__field-error">
                            {fieldErrors.pincode}
                        </p>
                    )}
                    <label className="login-form__label">Password *</label>
                    <div className="password-wrapper">
                        <input
                            className="login-form__input"
                            type={showPassword ? "text" : "password"}
                            value={form.password}
                            onChange={update("password")}
                            placeholder="Create a password"
                            minLength={8}
                            required
                        />
                        {/* ✅ Use showPassword state */}
                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={
                                showPassword ? "Hide password" : "Show password"
                            }
                        >
                            <EyeIcon show={showPassword} />
                        </button>
                    </div>

                    <label className="login-form__label">
                        Confirm Password *
                    </label>
                    <div className="password-wrapper">
                        <input
                            className="login-form__input"
                            type={showConfirmPassword ? "text" : "password"}
                            value={form.password_confirmation}
                            onChange={update("password_confirmation")}
                            placeholder="Confirm your password"
                            minLength={8}
                            required
                        />
                        {/* ✅ Use showConfirmPassword state - NOT showPassword */}
                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                            }
                            aria-label={
                                showConfirmPassword
                                    ? "Hide password"
                                    : "Show password"
                            }
                        >
                            <EyeIcon show={showConfirmPassword} />
                        </button>
                    </div>

                    {error && <p className="login-form__error">{error}</p>}

                    <button
                        className="login-form__submit"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? "Registering…" : "Register"}
                    </button>

                    <p className="login-form__hint">
                        Already have an account?{" "}
                        <Link to="/login">Sign in</Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
