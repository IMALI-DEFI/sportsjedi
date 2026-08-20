import { useState } from "react";
import {
  Check,
  Crown,
  Lock,
  Sparkles,
  WandSparkles,
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
            Unlock the full
            <br />
            <em>Jedi Builder Suite.</em>
          </h1>

          <p>
            Start free with limited daily access.
            Upgrade for unlimited picks, player props,
            advanced parlays and automatic builders.
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
          <p>Limited daily access</p>

          <ul>
            <li>
              <Check /> Live game board
            </li>

            <li>
              <Check /> 3 Jedi Picks per day
            </li>

            <li>
              <Check /> 5 player props per day
            </li>

            <li>
              <Check /> Manual Parlay Lab
            </li>

            <li>
              <Check /> 1 Auto Parlay per day
            </li>

            <li>
              <Check /> Basic market consensus
            </li>

            <li className="locked-feature">
              <Lock /> Advanced builder modes locked
            </li>

            <li className="locked-feature">
              <Lock /> Unlimited player parlays locked
            </li>

            <li className="locked-feature">
              <Lock /> Multi-game builder locked
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
            $19.95
            <small>/mo</small>
          </h2>

          <p>
            Full Sports Jedi builder access
          </p>

          <div className="builder-badge">
            <WandSparkles size={17} />
            ADVANCED BUILDER SUITE
          </div>

          <ul>
            <li>
              <Check /> Unlimited Jedi Picks
            </li>

            <li>
              <Check /> Unlimited player props
            </li>

            <li>
              <Check /> Unlimited Parlay Lab
            </li>

            <li>
              <Check /> Auto Parlay Generator
            </li>

            <li className="builder-option">
              <Zap /> Safer Builder
            </li>

            <li className="builder-option">
              <Zap /> Balanced Builder
            </li>

            <li className="builder-option">
              <Zap /> Long Shot Builder
            </li>

            <li>
              <Check /> Advanced Player Parlay Builder
            </li>

            <li>
              <Check /> Multi-game parlay builder
            </li>

            <li>
              <Check /> Full sportsbook consensus
            </li>

            <li>
              <Check /> No-vig probabilities
            </li>

            <li>
              <Check /> Future Pro alerts + saved parlays
            </li>
          </ul>

          <button
            className="primary-btn price-button"
            disabled={!!loading}
            onClick={() =>
              checkout("monthly")
            }
          >
            <Crown size={18} />

            {loading === "monthly"
              ? "Opening checkout…"
              : "Unlock Pro"}
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
            Full Pro access for less
          </p>

          <div className="builder-badge">
            <WandSparkles size={17} />
            ALL ADVANCED BUILDERS
          </div>

          <ul>
            <li>
              <Check /> Everything in Pro
            </li>

            <li>
              <Check /> Safer Builder
            </li>

            <li>
              <Check /> Balanced Builder
            </li>

            <li>
              <Check /> Long Shot Builder
            </li>

            <li>
              <Check /> Player Parlay Builder
            </li>

            <li>
              <Check /> Multi-game Builder
            </li>

            <li>
              <Check /> Unlimited usage
            </li>

            <li>
              <Check /> Best annual value
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

      <section className="builder-comparison">
        <span className="eyebrow">
          Builder Access
        </span>

        <h2>
          Free gives you a taste.
          Pro unlocks the full arsenal.
        </h2>

        <div className="builder-comparison-grid">
          <div>
            <strong>FREE</strong>
            <span>Manual builder</span>
            <span>1 auto parlay/day</span>
            <span>Limited props</span>
          </div>

          <div className="builder-comparison-pro">
            <strong>PRO</strong>
            <span>Unlimited Auto Parlays</span>
            <span>Safer / Balanced / Long Shot</span>
            <span>Advanced Player Builder</span>
            <span>Multi-game Builder</span>
          </div>
        </div>
      </section>

      <p className="pricing-disclaimer">
        Sports Jedi provides analytical tools
        and probability estimates. No sporting
        outcome or profit is guaranteed.
      </p>
    </main>
  );
}
