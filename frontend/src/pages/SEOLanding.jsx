import { Link, useLocation } from "react-router-dom";

const PAGES = {
  "/ai-sports-picks": {
    eyebrow: "AI SPORTS PICKS",
    title: "AI Sports Picks with Matchup Analysis and Confidence Scores",
    intro: "Sports Jedi combines sports data, matchup context and probability analysis to surface AI-assisted picks with clear confidence scoring.",
    sections: [
      ["More than a pick", "Review the matchup, supporting signals and confidence behind each selection instead of relying on a bare prediction."],
      ["Built for daily research", "Use Sports Jedi to compare games, player props and opportunities across supported sports in one workflow."],
      ["Probability, not promises", "Sports outcomes are uncertain. Sports Jedi presents analytical estimates and context, not guaranteed results."]
    ]
  },
  "/sports-betting-analytics": {
    eyebrow: "SPORTS BETTING ANALYTICS",
    title: "Sports Betting Analytics for Smarter Matchup Research",
    intro: "Turn odds, matchup information, trends and probability estimates into a faster research process with Sports Jedi.",
    sections: [
      ["Matchup intelligence", "Bring relevant matchup signals together so you can evaluate an opportunity without jumping between multiple screens."],
      ["Confidence scoring", "Use confidence scores as one analytical input when comparing picks and deciding what deserves a closer look."],
      ["Decision support", "Sports Jedi is designed to support your research and judgment rather than replace it."]
    ]
  },
  "/parlay-analysis": {
    eyebrow: "AI PARLAY ANALYSIS",
    title: "AI Parlay Analysis and Confidence Insights",
    intro: "Evaluate potential parlay legs with matchup analysis, probability context and Sports Jedi confidence signals before making a decision.",
    sections: [
      ["Review each leg", "Analyze individual selections rather than treating the parlay as a single opaque bet."],
      ["Compare risk", "See how multiple selections can change the overall risk profile of a parlay."],
      ["Stay disciplined", "Use the analysis as information and avoid treating any projected outcome as guaranteed."]
    ]
  },
  "/player-prop-analysis": {
    eyebrow: "PLAYER PROP ANALYSIS",
    title: "AI Player Prop Analysis for Sports Research",
    intro: "Sports Jedi helps organize player prop research around matchup context, available data and confidence scoring.",
    sections: [
      ["Player-level context", "Evaluate player opportunities with game context and supporting analytical signals."],
      ["Faster comparison", "Compare potential props in a consistent workflow instead of researching each one from scratch."],
      ["Transparent uncertainty", "Confidence scores represent analytical estimates, not certainty."]
    ]
  }
};

export default function SEOLanding() {
  const { pathname } = useLocation();
  const page = PAGES[pathname] || PAGES["/ai-sports-picks"];

  return (
    <main className="page-shell" style={{maxWidth: 1100, margin: "0 auto", padding: "64px 20px"}}>
      <p style={{letterSpacing: 2, opacity: .7, fontWeight: 700}}>{page.eyebrow}</p>
      <h1 style={{fontSize: "clamp(2.2rem,6vw,4.5rem)", lineHeight: 1.05, maxWidth: 900}}>{page.title}</h1>
      <p style={{fontSize: "1.2rem", lineHeight: 1.7, maxWidth: 820, opacity: .85}}>{page.intro}</p>
      <div style={{display: "grid", gap: 18, marginTop: 38}}>
        {page.sections.map(([heading, body]) => (
          <section key={heading} style={{padding: 24, border: "1px solid rgba(255,255,255,.14)", borderRadius: 18}}>
            <h2>{heading}</h2><p style={{lineHeight: 1.7, opacity: .8}}>{body}</p>
          </section>
        ))}
      </div>
      <div style={{display: "flex", gap: 14, flexWrap: "wrap", marginTop: 34}}>
        <Link to="/picks">View Sports Jedi Picks</Link>
        <Link to="/methodology">How Sports Jedi Works</Link>
        <Link to="/pricing">View Pricing</Link>
      </div>
      <p style={{marginTop: 34, opacity: .6}}>Sports Jedi provides informational analytics and probability estimates. No sporting outcome is guaranteed.</p>
    </main>
  );
}
