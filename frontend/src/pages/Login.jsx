import {
  useState,
} from "react";

import {
  Navigate,
  useNavigate,
} from "react-router-dom";

import {
  LogIn,
  UserPlus,
  ShieldCheck,
} from "lucide-react";

import {
  useAuth,
} from "../context/AuthContext";

export default function Login() {
  const {
    user,
    account,
    loading,
    login,
    signup,
  } = useAuth();

  const navigate =
    useNavigate();

  const [mode, setMode] =
    useState("login");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [working, setWorking] =
    useState(false);

  const [error, setError] =
    useState("");

  if (!loading && user && account) {
    return (
      <Navigate
        to="/account"
        replace
      />
    );
  }

  async function submit(e) {
    e.preventDefault();

    try {
      setWorking(true);
      setError("");

      if (mode === "login") {
        await login(
          email,
          password
        );
      } else {
        await signup(
          email,
          password
        );
      }

      navigate("/account");
    } catch (err) {
      setError(
        err.message ||
        "Authentication failed."
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
          Sign in or create an account to access
          Sports Jedi picks, player props,
          advanced builders and subscription
          features.
        </p>

        <div className="auth-mode-tabs">
          <button
            type="button"
            className={
              mode === "login"
                ? "active"
                : ""
            }
            onClick={() =>
              setMode("login")
            }
          >
            Sign In
          </button>

          <button
            type="button"
            className={
              mode === "signup"
                ? "active"
                : ""
            }
            onClick={() =>
              setMode("signup")
            }
          >
            Create Account
          </button>
        </div>

        <form
          className="auth-form"
          onSubmit={submit}
        >
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              required
              autoComplete="email"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              required
              minLength={8}
              autoComplete={
                mode === "login"
                  ? "current-password"
                  : "new-password"
              }
            />
          </label>

          <button
            type="submit"
            className="primary-btn auth-submit"
            disabled={working}
          >
            {mode === "login"
              ? <LogIn size={18} />
              : <UserPlus size={18} />
            }

            {working
              ? "Working..."
              : mode === "login"
                ? "Sign In"
                : "Create Account"
            }
          </button>
        </form>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <div className="auth-security">
          <ShieldCheck size={17} />
          <span>
            Secure IMALI account authentication
          </span>
        </div>
      </section>
    </main>
  );
}
