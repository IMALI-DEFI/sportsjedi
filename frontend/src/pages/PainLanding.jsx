import { Link, useLocation } from "react-router-dom";
import { trackMarketingEvent } from "../utils/marketingAttribution";

// Pain-point landing pages for social posts.
// Each page: name the pain -> show the Sports Jedi tool that fixes it -> free signup -> Pro.
// Only list features that appear on /pricing.
export const PAIN_PAGES = {
  "/lost-by-one-leg": {
    eyebrow: "BUSTED BY ONE LEG?",
    title: "Lost your parlay by one leg… again?",
    intro:
      "It's the worst feeling in sports. Sports Jedi helps you spot the shaky leg before you lock it in.",
    pains: [
      "You hit 4 out of 5 legs and still get $0.",
      "You add one more leg for a bigger payout, and that's the one that loses.",
      "You can't tell which pick is the risky one until it's too late.",
    ],
    helps: [
      ["🔍", "See the shaky leg", "Every Jedi Pick shows how confident our model is, so the weak leg stands out."],
      ["🛡️", "Safer Builder", "Builds parlays from the legs our model likes most, not just the biggest payout."],
      ["🎯", "True odds", "See each leg's real chance to hit, with the sportsbook's cut taken out."],
    ],
    cta: { label: "Build a free parlay", next: "/parlay" },
  },
  "/too-many-tabs": {
    eyebrow: "STOP JUGGLING APPS",
    title: "Checking 10 sportsbook apps before every game?",
    intro:
      "Sports Jedi puts the odds, the picks and the matchup on one screen, so you can decide in minutes.",
    pains: [
      "You flip between apps just to compare odds.",
      "By the time you finish researching, the line has moved.",
      "You still don't know which side the books actually agree on.",
    ],
    helps: [
      ["📊", "10+ sportsbooks, one view", "See what 10+ sportsbooks agree on without opening a single app."],
      ["⭐", "Free Jedi Picks every day", "The games worth a closer look, picked for you each day."],
      ["📺", "Live game board", "Every game on one board, with scores and odds as they change."],
    ],
    cta: { label: "Get my free picks", next: "/picks" },
  },
  "/real-odds": {
    eyebrow: "KNOW THE REAL ODDS",
    title: "The sportsbook takes a cut on every bet. Do you know how much?",
    intro:
      "Odds include a hidden fee (people call it the vig). Sports Jedi removes it so you see the true chance of a win.",
    pains: [
      "-110 on both sides means the book gets paid either way.",
      "A \"sure thing\" at short odds might not be worth it.",
      "Every book prices the same game differently, so it's hard to compare.",
    ],
    helps: [
      ["🎯", "True odds", "See each pick's real chance with the sportsbook's cut taken out."],
      ["🤝", "What the books agree on", "Free shows basic market consensus. Pro shows what 10+ sportsbooks agree on."],
      ["⭐", "Jedi Picks", "Our model's top picks for the day, with how confident it is in each one."],
    ],
    cta: { label: "See today's free picks", next: "/picks" },
  },
};

const card = {
  padding: 22,
  border: "1px solid rgba(255,255,255,.14)",
  borderRadius: 18,
  background: "rgba(255,255,255,.04)",
};

export default function PainLanding() {
  const { pathname } = useLocation();
  const page = PAIN_PAGES[pathname] || PAIN_PAGES["/lost-by-one-leg"];
  const signupHref = `/login?mode=signup&next=${encodeURIComponent(page.cta.next)}`;

  const track = (cta) =>
    trackMarketingEvent("cta_click", { metadata: { path: pathname, cta } });

  return (
    <main className="page-shell" style={{ maxWidth: 1000, margin: "0 auto", padding: "56px 20px 80px" }}>
      <p style={{ letterSpacing: 2, opacity: 0.75, fontWeight: 800 }}>{page.eyebrow}</p>
      <h1 style={{ fontSize: "clamp(2.1rem,6vw,4rem)", lineHeight: 1.06, maxWidth: 860, margin: "8px 0 16px" }}>
        {page.title}
      </h1>
      <p style={{ fontSize: "1.2rem", lineHeight: 1.6, maxWidth: 760, opacity: 0.88 }}>{page.intro}</p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 26 }}>
        <a className="primary-btn" href={signupHref} onClick={() => track("hero_signup")}>
          {page.cta.label} — free
        </a>
        <Link className="secondary-btn" to="/pricing" onClick={() => track("hero_pricing")}>
          See Pro
        </Link>
      </div>
      <p style={{ marginTop: 10, fontSize: ".9rem", opacity: 0.65 }}>Free account. No credit card.</p>

      <section style={{ ...card, marginTop: 40 }}>
        <h2 style={{ marginTop: 0 }}>Sound familiar?</h2>
        <ul style={{ lineHeight: 1.8, paddingLeft: 20, margin: 0 }}>
          {page.pains.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>

      <h2 style={{ marginTop: 44 }}>How Sports Jedi helps</h2>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
        {page.helps.map(([icon, heading, body]) => (
          <section key={heading} style={card}>
            <div style={{ fontSize: 30 }}>{icon}</div>
            <h3 style={{ margin: "8px 0" }}>{heading}</h3>
            <p style={{ lineHeight: 1.6, opacity: 0.82, margin: 0 }}>{body}</p>
          </section>
        ))}
      </div>

      <h2 style={{ marginTop: 44 }}>Start free. Go Pro when you're ready.</h2>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
        <section style={card}>
          <h3 style={{ marginTop: 0 }}>Free — $0</h3>
          <ul style={{ lineHeight: 1.8, paddingLeft: 20, margin: 0 }}>
            <li>3 Jedi Picks a day</li>
            <li>5 player props a day</li>
            <li>1 Auto Parlay a day + the Parlay Lab</li>
            <li>Live game board</li>
          </ul>
        </section>
        <section style={{ ...card, borderColor: "rgba(255,214,90,.55)" }}>
          <h3 style={{ marginTop: 0 }}>Pro — $19.95/mo</h3>
          <ul style={{ lineHeight: 1.8, paddingLeft: 20, margin: 0 }}>
            <li>Unlimited Jedi Picks, props and Auto Parlays</li>
            <li>Safer, Balanced and Long Shot builders</li>
            <li>What 10+ sportsbooks agree on</li>
            <li>True odds with the sportsbook's cut removed</li>
          </ul>
          <p style={{ margin: "10px 0 0", opacity: 0.7, fontSize: ".9rem" }}>Or $149/year — save $90. Cancel anytime.</p>
        </section>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 30 }}>
        <a className="primary-btn" href={signupHref} onClick={() => track("bottom_signup")}>
          {page.cta.label} — free
        </a>
        <Link className="secondary-btn" to="/pricing" onClick={() => track("bottom_pricing")}>
          Compare plans
        </Link>
      </div>

      <p style={{ marginTop: 40, fontSize: ".85rem", opacity: 0.6, lineHeight: 1.6 }}>
        Sports Jedi provides research tools and probability estimates. No sporting outcome or profit is guaranteed.
        For adults 21+. If betting stops being fun, call or text 1-800-GAMBLER.
      </p>
    </main>
  );
}
