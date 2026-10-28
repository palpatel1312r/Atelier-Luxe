import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import "../styles/login.css";
import Icon from "../components/ui/Icon";
import ThemeSwitcher from "../components/ui/ThemeSwitcher";

export default function Login() {
    const [mode, setMode] = useState("dealer"); // 'dealer' | 'admin'
    const navigate = useNavigate();
    const { login } = useAuth();

    return (
        <div className="login-page login-page--immersive studio-login">
            <div className="studio-login__shell">
                <aside
                    className="studio-login__art"
                    aria-label="Welcome to the wholesale network"
                >
                    <div className="studio-login__art-nav">
                        <span className="studio-login__logo">
                            W<span>✳</span>
                        </span>
                        <strong>
                            WHOLESALE
                            <br />
                            <small>B2B Wholesale / 2026</small>
                        </strong>
                        <span className="studio-login__edition">
                            EST. FOR BUSINESS
                        </span>
                    </div>
                    <div className="studio-login__art-copy">
                        <span>WELCOME TO THE NEW WAY OF BUYING</span>
                        <h2>
                            Trade smarter.
                            <br />
                            <em>Move faster.</em>
                        </h2>
                        <p>
                            A better business starts with better buying.
                            Discover, source and grow—all in your own commerce
                            workspace.
                        </p>
                    </div>
                    <div className="studio-login__artwork" aria-hidden="true">
                        <span className="studio-login__artwork-orbit" />
                        <div className="studio-login__artwork-disk">✳</div>
                        <div className="studio-login__artwork-card">
                            <small>THE COMMERCE EDITION</small>
                            <strong>
                                01
                                <br />
                                BETTER
                                <br />
                                TOGETHER
                            </strong>
                            <span>EVERY ORDER COUNTS ↗</span>
                        </div>
                        <span className="studio-login__artwork-ticket">
                            ✦ BUILT TO MOVE BUSINESS
                        </span>
                    </div>
                    <div className="studio-login__art-footer">
                        <span>PRODUCTS / PRICING / ORDERS</span>
                        <span>THE NEXT CHAPTER OF WHOLESALE ↗</span>
                    </div>
                </aside>
                <div className="login-card studio-login__form">
                    <div className="motion-login-theme">
                        <ThemeSwitcher />
                    </div>
                    <div className="studio-login__form-mark">✳</div>
                    <p className="login-card__brand">SECURE BUSINESS ACCESS</p>
                    <h1 className="login-card__title">Good to see you.</h1>
                    <p className="login-card__subtitle">
                        Your next opportunity is waiting. Sign in to your trade
                        workspace.
                    </p>
                    <div
                        className="login-tabs"
                        role="group"
                        aria-label="Account type"
                    >
                        <button
                            type="button"
                            className={`login-tabs__btn ${mode === "dealer" ? "login-tabs__btn--active" : ""}`}
                            onClick={() => setMode("dealer")}
                        >
                            I'm a dealer
                        </button>
                        <button
                            type="button"
                            className={`login-tabs__btn ${mode === "admin" ? "login-tabs__btn--active" : ""}`}
                            onClick={() => setMode("admin")}
                        >
                            I'm an admin
                        </button>
                    </div>
                    {mode === "dealer" ? (
                        <DealerOtpLogin
                            onSuccess={(t, u) => {
                                login(t, u);
                                navigate("/dashboard");
                            }}
                        />
                    ) : (
                        <AdminLogin
                            onSuccess={(t, u) => {
                                login(t, u);
                                navigate("/admin/dashboard");
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

function EyeIcon({ show }) {
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
            {/* Open eye - shown when show=true */}
            <path
                d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                style={{ display: show ? "block" : "none" }}
            />
            <circle
                cx="12"
                cy="12"
                r="3"
                style={{ display: show ? "block" : "none" }}
            />

            {/* Eye with slash - shown when show=false */}
            <g style={{ display: show ? "none" : "block" }}>
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
            </g>
        </svg>
    );
}
function AdminLogin({ onSuccess }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const { data } = await api.post("/admin/login", {
                email,
                password,
                remember,
            });
            onSuccess(data.token, data.user);
        } catch (err) {
            setError(err.response?.data?.message || "Login failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={submit} className="login-form">
            <label className="login-form__label">Email</label>
            <input
                className="login-form__input"
                type="email"
                value={email}
                placeholder="Enter your email"
                onChange={(e) => setEmail(e.target.value)}
                required
            />

            <label className="login-form__label">Password</label>
            <div className="password-wrapper">
                <input
                    className="login-form__input"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    placeholder="Enter your password"
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                {/* ✅ ONLY ONE BUTTON */}
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

            {/* <label className="login-form__remember">
                <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                />
                Remember me
            </label> */}

            {error && <p className="login-form__error">{error}</p>}

            <button
                className="login-form__submit"
                type="submit"
                disabled={loading}
            >
                {loading ? "Signing in…" : "Sign in"}
            </button>

            <a href="/forgot-password" className="login-form__forgot">
                Forgot password?
            </a>
        </form>
    );
}
function DealerOtpLogin({ onSuccess }) {
    const [step, setStep] = useState("phone"); // 'phone' | 'otp'
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [remember, setRemember] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    const sendOtp = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await api.post("/dealer/send-otp", { phone });
            setStep("otp");
            startCooldown();
        } catch (err) {
            setError(err.response?.data?.message || "Could not send OTP.");
        } finally {
            setLoading(false);
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

    const verifyOtp = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const { data } = await api.post("/dealer/verify-otp", {
                phone,
                otp,
                remember,
            });
            onSuccess(data.token, data.user);
        } catch (err) {
            setError(err.response?.data?.message || "Invalid OTP.");
        } finally {
            setLoading(false);
        }
    };

    if (step === "phone") {
        return (
            <form onSubmit={sendOtp} className="login-form">
                <label className="login-form__label">Mobile Number</label>
                <input
                    className="login-form__input"
                    type="tel"
                    value={phone}
                    maxLength={10}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                    required
                />
                {error && <p className="login-form__error">{error}</p>}
                <button
                    className="login-form__submit"
                    type="submit"
                    disabled={loading}
                >
                    {loading ? "Sending…" : "Send OTP"}
                </button>
                <p className="login-form__hint">
                    New here? <Link to="/register">Register</Link>
                </p>
            </form>
        );
    }

    return (
        <form onSubmit={verifyOtp} className="login-form">
            <label className="login-form__label">
                Enter OTP sent to {phone}
            </label>
            <input
                className="login-form__input login-form__input--otp"
                inputMode="numeric"
                maxLength={6}
                type="text" // ✅ Always visible - no hiding
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder=""
                required
            />

            <label className="login-form__remember">
                <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                />
                Remember me
            </label>

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
                onClick={sendOtp}
            >
                {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
            </button>
        </form>
    );
}
