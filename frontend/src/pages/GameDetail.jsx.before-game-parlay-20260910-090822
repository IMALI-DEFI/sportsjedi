import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  ArrowLeft,
  BrainCircuit,
  Clock,
  Gauge,
  Target,
  TrendingUp,
  Building2,
} from "lucide-react";

import { api } from "../lib/api";

export default function GameDetail() {
  const { id } = useParams();

  const [game, setGame] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.game(id),
      api.analysis(id),
    ])
      .then(([gameData, analysisData]) => {
        setGame(gameData);
        setAnalysis(analysisData);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <main className="shell">
        <div className="error">{error}</div>
      </main>
    );
  }

  if (!game || !analysis) {
    return (
      <main className="shell">
        <div className="loading">
          Jedi Engine is analyzing the market…
        </div>
      </main>
    );
  }

  return (
    <main className="shell detail-page">
      <Link to="/" className="back">
        <ArrowLeft />
        Back to board
      </Link>

      <section className="matchup-hero">
        <div className="matchup-top">
          <span className="league-pill">
            {game.league}
          </span>

          <span className={`status ${game.status}`}>
            {game.status}
          </span>
        </div>

        <div className="matchup-teams">
          <div>
            <small>AWAY</small>
            <strong>{game.away.abbr}</strong>
            <span>{game.away.name}</span>
          </div>

          <div className="versus">VS</div>

          <div>
            <small>HOME</small>
            <strong>{game.home.abbr}</strong>
            <span>{game.home.name}</span>
          </div>
        </div>

        <div className="matchup-meta">
          <span>
            <Clock />
            {new Date(
              game.startTime
            ).toLocaleString()}
          </span>

          <span>
            <TrendingUp />
            {game.spread
              ? `${game.spread.favorite} ${game.spread.line}`
              : "Spread unavailable"}
            {" · "}O/U {game.total ?? "—"}
          </span>

          {game.bookmaker && (
            <span>
              <Building2 />
              {game.bookmaker.title}
            </span>
          )}
        </div>
      </section>

      <section className="analysis-grid">
        <div className="analysis-main">
          <div className="analysis-title">
            <BrainCircuit />

            <div>
              <span className="eyebrow">
                Jedi Market Read
              </span>

              <h2>
                {analysis.pick
                  ? `${analysis.pick} leads consensus`
                  : "No qualified signal"}
              </h2>
            </div>
          </div>

          <p>{analysis.summary}</p>

          {analysis.awayWinProbability != null &&
            analysis.homeWinProbability != null && (
              <div className="probability">
                <div>
                  <span>{game.away.abbr}</span>
                  <b>
                    {analysis.awayWinProbability}%
                  </b>
                </div>

                <div className="bar">
                  <i
                    style={{
                      width:
                        `${analysis.awayWinProbability}%`,
                    }}
                  />
                </div>

                <div>
                  <span>{game.home.abbr}</span>
                  <b>
                    {analysis.homeWinProbability}%
                  </b>
                </div>
              </div>
            )}
        </div>

        <div className="metric-card">
          <Gauge />
          <span>Confidence</span>
          <strong>
            {analysis.confidence}%
          </strong>
        </div>

        <div className="metric-card">
          <Target />
          <span>Market strength</span>
          <strong>
            {analysis.edge ?? "—"}%
          </strong>
        </div>

        <div className="metric-card">
          <Building2 />
          <span>Books analyzed</span>
          <strong>
            {analysis.consensusBooks || 1}
          </strong>
        </div>
      </section>

      <section className="factor-card">
        <h3>
          Why Sports Jedi sees this signal
        </h3>

        {(analysis.factors || []).map(
          (factor) => (
            <div
              className="factor"
              key={factor.label}
            >
              <span>{factor.label}</span>
              <b>{factor.impact}</b>
            </div>
          )
        )}
      </section>

      <div className="responsible-note">
        Market probabilities and confidence scores are
        estimates, not guaranteed outcomes.
      </div>
    </main>
  );
}
