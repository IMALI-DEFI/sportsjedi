import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { LogIn, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const {
    user,
    account,
    loading,
    loginWithGoogle,
  } = useAuth();

  const navigate = useNavigate();

  const [working, setWorking] =
    useState(false);

  const [error, setError] =
    useState("");

  if (!loading && user && account) {
    return <Navigate to="/account" replace />;
  }

  async function handleGoogle() {
    try {
      setWorking(true);
      setError("");

      await loginWithGoogle();

      navigate("/account");
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
          "Google sign-in failed."
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="shell auth-page">
      <section className="auth-card">
        <div className="auth-glow" />

        <span className="eyebrow">
          SPORTS JEDI ACCESS
        </span>

        <h1>
          Enter the
          <br />
          <em>Jedi Command Center</em>
        </h1>

        <p>
          Sign in to access your Sports Jedi
          picks, player props, advanced parlay
          builders and subscription.
        </p>

        <button
          className="google-signin-btn"
          onClick={handleGoogle}
          disabled={working}
        >
          <span className="google-mark">
            G
          </span>

          {working
            ? "Connecting..."
            : "Continue with Google"}
        </button>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <div className="auth-security">
          <ShieldCheck size={17} />

          <span>
            Secure authentication through
            your IMALI account
          </span>
        </div>

        <div className="auth-pro-note">
          <LogIn size={17} />

          <span>
            Pro features require an active
            Sports Jedi subscription.
          </span>
        </div>
      </section>
    </main>
  );
}
