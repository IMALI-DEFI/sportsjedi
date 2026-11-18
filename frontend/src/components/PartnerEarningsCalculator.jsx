import { useState } from "react";

// Sports Jedi Partner Program earnings calculator (2026-11-17).
// Terms match the backend: 25% of the $19.95/mo subscription for up to 12 months.
const PRICE = 19.95;
const RATE = 0.25;
const MONTHS = 12;
const money = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

const box = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(247,201,73,0.35)",
  borderRadius: 16,
  padding: "14px 12px",
  textAlign: "center",
};

export default function PartnerEarningsCalculator() {
  const [count, setCount] = useState(25);
  const monthly = count * PRICE * RATE;
  const yearly = monthly * MONTHS;

  return (
    <section className="referral-join-card partner-calc">
      <span className="eyebrow">PARTNER EARNINGS CALCULATOR</span>
      <h2>See what you could earn</h2>
      <p>Earn 25% of every $19.95/month subscription you refer, every month, for up to 12 months.</p>

      <label htmlFor="sj-partner-count" style={{ display: "block", marginTop: 16, fontWeight: 700 }}>
        Paid referrals: <span style={{ color: "#f7c949" }}>{count}</span>
      </label>
      <input
        id="sj-partner-count"
        type="range"
        min="1"
        max="200"
        value={count}
        onChange={(e) => setCount(Number(e.target.value))}
        style={{ width: "100%", marginTop: 8, accentColor: "#f7c949" }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
        <div style={box}>
          <small>Per month</small>
          <strong style={{ display: "block", fontSize: 28, color: "#f7c949" }}>{money(monthly)}</strong>
        </div>
        <div style={box}>
          <small>Over 12 months</small>
          <strong style={{ display: "block", fontSize: 28, color: "#f7c949" }}>{money(yearly)}</strong>
        </div>
      </div>

      <p style={{ fontSize: 12, opacity: 0.75, marginTop: 14 }}>
        Example only, not a guarantee. Earnings depend on how many people you refer and how long they stay
        subscribed. Commissions apply to eligible paid subscriptions and follow the partner-program terms.
      </p>
    </section>
  );
}
