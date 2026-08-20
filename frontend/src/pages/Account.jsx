import {
  Crown,
  LogOut,
  CreditCard,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import {
  Navigate,
} from "react-router-dom";

import {
  useAuth,
} from "../context/AuthContext";

const API =
  import.meta.env.VITE_API_BASE_URL ||
  "https://api.sportsjedi.com";

export default function Account() {
  const {
    user,
    account,
    loading,
    getToken,
    logout,
  } = useAuth();

  if (loading) {
    return (
      <main className="shell">
        <div className="loading">
          Loading account…
        </div>
      </main>
    );
  }

  if (!user || !account) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  async function manageBilling() {
    const response =
      await fetch(
        `${API}/api/account/billing-portal`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${getToken()}`,
          },
        }
      );

    const result =
      await response.json();

    if (!response.ok) {
      alert(
        result.error ||
          "Billing portal unavailable."
      );

      return;
    }

    window.location.href =
      result.url;
  }

  const admin =
    account.isAdmin === true;

  const pro =
    account.isPro === true;

  return (
    <main className="shell account-page">
      <section className="page-banner">
        <div>
          <span className="eyebrow">
            COMMAND PROFILE
          </span>

          <h1>
            Sports Jedi
            <br />
            <em>Account</em>
          </h1>

          <p>
            Manage your access, subscription,
            billing and advanced builder
            privileges.
          </p>
        </div>

        <Sparkles size={64} />
      </section>

      <section className="account-grid">
        <article className="account-card">
          <span className="eyebrow">
            IDENTITY
          </span>

          <h2>{account.email}</h2>

          <div className="access-badge">
            {admin ? (
              <>
                <ShieldCheck size={18} />
                ADMIN
              </>
            ) : pro ? (
              <>
                <Crown size={18} />
                SPORTS JEDI PRO
              </>
            ) : (
              "FREE PREVIEW"
            )}
          </div>

          <div className="account-detail">
            <span>Plan</span>
            <strong>
              {account.plan || "free"}
            </strong>
          </div>

          <div className="account-detail">
            <span>Status</span>
            <strong>
              {account.status || "free"}
            </strong>
          </div>
        </article>

        <article className="account-card">
          <span className="eyebrow">
            BUILDER ACCESS
          </span>

          <h2>
            {pro
              ? "Full arsenal unlocked"
              : "Preview access"}
          </h2>

          <div className="feature-access-list">
            <span>
              {pro ? "✓" : "🔒"}
              Unlimited Jedi Picks
            </span>

            <span>
              {pro ? "✓" : "🔒"}
              Full Player Props
            </span>

            <span>
              {pro ? "✓" : "🔒"}
              Player Parlay Builder
            </span>

            <span>
              {pro ? "✓" : "🔒"}
              Safer Builder
            </span>

            <span>
              {pro ? "✓" : "🔒"}
              Balanced Builder
            </span>

            <span>
              {pro ? "✓" : "🔒"}
              Long Shot Builder
            </span>
          </div>
        </article>

        <article className="account-card">
          <span className="eyebrow">
            BILLING
          </span>

          <h2>
            Subscription management
          </h2>

          {admin ? (
            <p>
              Administrator access is enabled.
              Billing is not required for this
              account.
            </p>
          ) : account.stripeCustomerId ? (
            <button
              className="primary-btn account-action"
              onClick={manageBilling}
            >
              <CreditCard size={18} />
              Manage Billing
            </button>
          ) : (
            <a
              href="/pricing"
              className="primary-btn account-action"
            >
              <Crown size={18} />
              Unlock Pro
            </a>
          )}

          <button
            className="secondary-btn account-action"
            onClick={logout}
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </article>
      </section>
    </main>
  );
}
