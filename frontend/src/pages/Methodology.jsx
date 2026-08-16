import { BrainCircuit, BookOpen, ShieldCheck } from "lucide-react";

export default function Methodology() {
  return (
    <main className="shell legal-page">
      <section className="page-banner">
        <div>
          <span className="eyebrow">
            <BrainCircuit size={14} /> Methodology
          </span>
          <h1>How Sports Jedi reads the market</h1>
          <p>
            Sports Jedi converts sportsbook prices into normalized
            probabilities and compares consensus across available books.
          </p>
        </div>
        <BookOpen size={64} />
      </section>

      <section className="legal-card">
        <h2>Market consensus</h2>
        <p>
          Sports Jedi collects available moneyline, spread and total
          information from multiple sportsbook sources.
        </p>

        <h2>No-vig probabilities</h2>
        <p>
          Sportsbook margin is removed from two-sided moneyline markets
          to estimate a normalized market probability.
        </p>

        <h2>Confidence</h2>
        <p>
          Confidence reflects market strength, sportsbook agreement and
          available market depth. It is not a guarantee of an outcome.
        </p>

        <h2>Market edge</h2>
        <p>
          The current edge measurement describes distance from a 50/50
          matchup. It should not be interpreted as proven expected value
          against a sportsbook.
        </p>

        <div className="disclosure-box">
          <ShieldCheck />
          <p>
            Sports Jedi provides informational analytics. Sports outcomes
            are uncertain and all probabilities are estimates.
          </p>
        </div>
      </section>
    </main>
  );
}
