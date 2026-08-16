import { useState } from "react";
import {
  Check,
  Crown,
  Sparkles,
  Zap,
} from "lucide-react";

const API =
  import.meta.env.VITE_API_BASE_URL ||
  "https://api.sportsjedi.com";

export default function Pricing() {
  const [loading, setLoading] =
    useState("");

  async function checkout(plan) {
    try {
      setLoading(plan);

      const response = await fetch(
        `${API}/api/billing/checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            plan,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to start checkout"
        );
      }

      window.location.href =
        result.url;
    } catch (error) {
      alert(error.message);
      setLoading("");
    }
  }

  return (
    <main className="shell pricing-page">
      <section className="page-banner pricing-hero">
        <div>
          <span className="eyebrow">
            <Crown size={14} />
            Sports Jedi Pro
          </span>

          <h1>
            Find the signal.
            <br />
            <em>Cut through the noise.</em>
          </h1>

          <p>
            Start free. Upgrade when
            you want the complete
            Sports Jedi experience.
          </p>
        </div>

        <Sparkles size={70} />
      </section>

      <section className="pricing-grid">
        <article className="price-card">
          <span className="plan-label">
            FREE
          </span>

          <h2>$0</h2>
          <p>Forever</p>

          <ul>
            <li>
              <Check /> Live game board
            </li>
            <li>
              <Check /> Basic market data
            </li>
            <li>
              <Check /> Limited Jedi signals
            </li>
            <li>
              <Check /> Selected player props
            </li>
            <li>
              <Check /> Parlay Lab preview
            </li>
          </ul>

          <a
            className="secondary-btn price-button"
            href="/"
          >
            Use Sports Jedi Free
          </a>
        </article>

        <article className="price-card featured">
          <div className="popular">
            MOST POPULAR
          </div>

          <span className="plan-label">
            PRO MONTHLY
          </span>

          <h2>
            $19.99
            <small>/mo</small>
          </h2>

          <p>
            Full Sports Jedi intelligence
          </p>

          <ul>
            <li>
              <Check /> Full Jedi Picks
            </li>
            <li>
              <Check /> Confidence rankings
            </li>
            <li>
              <Check /> Multi-book consensus
            </li>
            <li>
              <Check /> No-vig probabilities
            </li>
            <li>
              <Check /> Full player props
            </li>
            <li>
              <Check /> Advanced Parlay Lab
            </li>
            <li>
              <Check /> Future Pro features
            </li>
          </ul>

          <button
            className="primary-btn price-button"
            disabled={!!loading}
            onClick={() =>
              checkout("monthly")
            }
          >
            <Zap size={18} />
            {loading === "monthly"
              ? "Opening checkout…"
              : "Start Pro"}
          </button>
        </article>

        <article className="price-card">
          <span className="plan-label">
            PRO ANNUAL
          </span>

          <h2>
            $149
            <small>/yr</small>
          </h2>

          <p>
            Save compared with monthly
          </p>

          <ul>
            <li>
              <Check /> Everything in Pro
            </li>
            <li>
              <Check /> One annual payment
            </li>
            <li>
              <Check /> Best launch value
            </li>
            <li>
              <Check /> Future Pro features
            </li>
          </ul>

          <button
            className="secondary-btn price-button"
            disabled={!!loading}
            onClick={() =>
              checkout("annual")
            }
          >
            {loading === "annual"
              ? "Opening checkout…"
              : "Choose Annual"}
          </button>
        </article>
      </section>

      <p className="pricing-disclaimer">
        Sports Jedi provides sports
        analytics and probability
        estimates for informational
        purposes. No outcome is
        guaranteed.
      </p>
    </main>
  );
}
