import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { setToken } from "../lib/api";
import Loader from "./Loader";

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    const userJson = searchParams.get("user");

    if (!token || !userJson) {
      setError("Sign-in failed. Missing credentials.");
      setTimeout(
        () => navigate("/login?error=google_failed", { replace: true }),
        2000,
      );
      return;
    }

    // Persist the token, then refresh auth context so the app picks up the user
    setToken(token);
    refresh()
      .then(() => {
        // Head home. If you ever need to bounce to a specific page (checkout),
        // read `state` from searchParams and route there instead.
        navigate("/", { replace: true });
      })
      .catch((err: any) => {
        setError(err?.message || "Sign-in failed.");
        setTimeout(
          () => navigate("/login?error=google_failed", { replace: true }),
          2000,
        );
      });
  }, [searchParams, navigate, refresh]);

  if (error) {
    return (
      <div className="max-w-md mx-auto py-24 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <p className="text-sm text-stone-500">Redirecting to login…</p>
      </div>
    );
  }

  return <Loader label="Finishing sign-in…" />;
}
