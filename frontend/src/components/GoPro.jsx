import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Plans that already have full access. Anyone else sees the upgrade prompts.
const PAID_PLANS = ["pro", "pro_monthly", "pro_annual", "annual", "premium", "vip"];

export function useIsPro() {
  const { account } = useAuth() || {};
  const plan = String(account?.plan || "free").toLowerCase();
  return PAID_PLANS.includes(plan);
}

// Free vs Pro side by side. Used on the home page.
export function PlanCompare() {
  const isPro = useIsPro();
  if (isPro) return null;
  return (
    <section className="sj-plan-compare">
      <h2>Free gets you started. Pro builds smarter parlays.</h2>
      <p className="sj-plan-sub">Fewer slips busted by one leg. No sportsbook, no betting through us, just better picks.</p>
      <div className="sj-plan-grid">
        <div className="sj-plan-card">
          <span className="sj-plan-name">Free</span>
          <strong className="sj-plan-price">$0</strong>
          <ul>
            <li>3 Jedi Picks a day</li>
            <li>5 player props a day</li>
            <li>1 auto parlay a day</li>
          </ul>
          <Link to="/login?mode=signup&next=%2Fpicks" className="secondary-btn">Join Free</Link>
        </div>
        <div className="sj-plan-card sj-plan-pro">
          <span className="sj-plan-badge">Most popular</span>
          <span className="sj-plan-name">Pro</span>
          <strong className="sj-plan-price">$19.95<small>/mo</small></strong>
          <ul>
            <li>Unlimited picks and player props</li>
            <li>Careful, Balanced and Long Shot builders, unlimited</li>
            <li>Advanced player and multi-game parlay builders</li>
            <li>Full Parlay Grader: see which leg to cut</li>
          </ul>
          <Link to="/pricing" className="primary-btn">Go Pro</Link>
          <p className="sj-plan-annual">Or $149/yr: that's $12.42 a month, and you save $90.</p>
        </div>
      </div>
    </section>
  );
}

// Small upgrade prompt for Picks, Parlay and game pages. Hidden for Pro members.
export function GoProNudge({ title, text, cta = "Go Pro — $19.95/mo" }) {
  const isPro = useIsPro();
  if (isPro) return null;
  return (
    <div className="sj-gopro-nudge">
      <div>
        <strong>🔒 {title}</strong>
        <span>{text}</span>
      </div>
      <Link to="/pricing" className="primary-btn">{cta}</Link>
    </div>
  );
}
