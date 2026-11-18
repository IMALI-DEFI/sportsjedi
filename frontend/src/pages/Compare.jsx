import { Link, useLocation } from "react-router-dom";

const COMPARISONS = {
  "/compare/oddsjam": {
    competitor: "OddsJam",
    title: "Sports Jedi vs OddsJam",
    subtitle: "Two different approaches to sports betting research",
    competitorFocus: "OddsJam is built heavily around real-time odds comparison, positive expected value opportunities, arbitrage, line shopping and betting-market tools.",
    sportsJediFocus: "Sports Jedi centers the experience on AI-assisted matchup analysis, picks, confidence scoring, player props and parlay research.",
    chooseCompetitor: "You may prefer OddsJam if your priority is real-time sportsbook pricing, +EV scanning and arbitrage-style workflows.",
    chooseUs: "You may prefer Sports Jedi if you want a simpler AI-guided research experience built around matchup context, confidence and pick analysis."
  },
  "/compare/rithmm": {
    competitor: "Rithmm",
    title: "Sports Jedi vs Rithmm",
    subtitle: "AI sports research tools compared",
    competitorFocus: "Rithmm emphasizes predictive models, live-line comparisons, model-building tools, player props, parlays and an AI research assistant.",
    sportsJediFocus: "Sports Jedi focuses on streamlined AI-assisted picks, confidence scoring, matchup analysis, player props and parlay insights.",
    chooseCompetitor: "You may prefer Rithmm if you want deeper model customization and a broader modeling toolkit.",
    chooseUs: "You may prefer Sports Jedi if you want a more direct workflow for finding and reviewing picks without building your own models."
  },
  "/compare/action-network": {
    competitor: "Action Network",
    title: "Sports Jedi vs Action Network",
    subtitle: "Sports picks, odds and analytics compared",
    competitorFocus: "Action Network combines expert picks, live odds, betting tools, wager tracking and personalized betting analytics.",
    sportsJediFocus: "Sports Jedi is designed around AI-assisted matchup analysis, probability context, confidence scoring and simplified pick research.",
    chooseCompetitor: "You may prefer Action Network if expert content, live odds and bet tracking are your main priorities.",
    chooseUs: "You may prefer Sports Jedi if you want AI-assisted analysis and confidence-driven research in a focused workflow."
  }
};

export default function Compare() {
  const { pathname } = useLocation();
  const page = COMPARISONS[pathname] || COMPARISONS["/compare/oddsjam"];

  return (
    <main className="page-shell" style={{maxWidth: 1100, margin: "0 auto", padding: "64px 20px"}}>
      <p style={{letterSpacing: 2, opacity: .7, fontWeight: 700}}>SPORTS JEDI COMPARISON</p>
      <h1 style={{fontSize: "clamp(2.2rem,6vw,4.5rem)", lineHeight: 1.05}}>{page.title}</h1>
      <p style={{fontSize: "1.2rem", opacity: .8, maxWidth: 800}}>{page.subtitle}</p>

      <div style={{display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", marginTop: 36}}>
        <section style={{padding: 24, border: "1px solid rgba(255,255,255,.14)", borderRadius: 18}}>
          <h2>{page.competitor}</h2>
          <p style={{lineHeight: 1.7, opacity: .82}}>{page.competitorFocus}</p>
        </section>
        <section style={{padding: 24, border: "1px solid rgba(255,255,255,.14)", borderRadius: 18}}>
          <h2>Sports Jedi</h2>
          <p style={{lineHeight: 1.7, opacity: .82}}>{page.sportsJediFocus}</p>
        </section>
      </div>

      <section style={{marginTop: 28}}>
        <h2>Which one may fit you better?</h2>
        <p style={{lineHeight: 1.7}}><strong>{page.competitor}:</strong> {page.chooseCompetitor}</p>
        <p style={{lineHeight: 1.7}}><strong>Sports Jedi:</strong> {page.chooseUs}</p>
      </section>

      <section style={{marginTop: 30}}>
        <h2>Why Sports Jedi is different</h2>
        <p style={{lineHeight: 1.7, opacity: .82}}>
          Sports Jedi is built to make sports research easier to understand. Instead of forcing every user into a complex modeling workflow, it brings picks, matchup context, confidence scoring, player props and parlay analysis into one streamlined experience.
        </p>
      </section>

      <div style={{display: "flex", gap: 14, flexWrap: "wrap", marginTop: 34}}>
        <Link to="/picks">See Sports Jedi Picks</Link>
        <Link to="/methodology">How Sports Jedi Works</Link>
        <Link to="/pricing">View Pricing</Link>
      </div>

      <p style={{marginTop: 38, opacity: .55, fontSize: ".9rem"}}>
        Product features can change over time. This comparison is based on publicly described product positioning and is intended for general informational purposes.
      </p>
    </main>
  );
}
