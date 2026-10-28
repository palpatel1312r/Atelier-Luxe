import { useState } from "react";
import { useAuth } from "../context/AuthContext";

interface RegisterProps {
  onSuccess: () => void;
  onGoToLogin: () => void;
  onBack: () => void;
}

export default function Register({
  onSuccess,
  onGoToLogin,
  onBack,
}: RegisterProps) {
  const { register } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await register({
        name: `${firstName} ${lastName}`.trim(),
        email,
        password,
        password_confirmation: confirm,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800";

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-stone-600 hover:text-amber-800 transition-colors mb-8 group"
      >
        <span className="text-sm tracking-wider uppercase">← Back</span>
      </button>

      <h1 className="text-3xl font-light text-stone-800 mb-2">
        Create Account
      </h1>
      <p className="text-stone-500 mb-8">
        Join Atelier Luxe for a personalized experience.
      </p>

      {/* 👇 FIXED href */}
      <a
        href="http://localhost:5000/api/auth/google?state=login"
        className="w-full flex items-center justify-center gap-3 border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 py-3 text-sm tracking-wider uppercase rounded-md transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 48 48"
          className="h-5 w-5"
        >
          <path
            fill="#FFC107"
            d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
          />
          <path
            fill="#FF3D00"
            d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
          />
          <path
            fill="#4CAF50"
            d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
          />
          <path
            fill="#1976D2"
            d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
          />
        </svg>
        Continue with Google
      </a>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-stone-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wider text-stone-400 bg-white px-3">
          or
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-stone-700 mb-1">
              First name
            </label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-stone-700 mb-1">
              Last name
            </label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-stone-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            required
          />
        </div>

        <div>
          <label className="block text-sm text-stone-700 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            required
            minLength={6}
          />
        </div>

        <div>
          <label className="block text-sm text-stone-700 mb-1">
            Confirm password
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
            required
            minLength={6}
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-stone-800 text-white py-3.5 text-sm tracking-[0.15em] uppercase hover:bg-amber-900 transition-colors disabled:bg-stone-400"
        >
          {submitting ? "Creating…" : "Create Account"}
        </button>
      </form>

      <p className="text-center text-sm text-stone-600 mt-6">
        Already have an account?{" "}
        <button
          onClick={onGoToLogin}
          className="text-amber-800 hover:underline"
        >
          Sign in
        </button>
      </p>
    </div>
  );
}
