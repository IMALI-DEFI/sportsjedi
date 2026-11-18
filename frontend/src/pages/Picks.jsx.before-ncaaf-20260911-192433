import {
  useEffect,
  useState,
} from "react";

import {
  BrainCircuit,
  ChevronRight,
  Target,
  UserRound,
} from "lucide-react";

import { Link } from "react-router-dom";
import { api } from "../lib/api";

const leagues = ["ALL", "NFL", "NBA", "MLB"];

export default function Picks() {
  const [league, setLeague] = useState("ALL");
  const [picks, setPicks] = useState([]);
  const [props, setProps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const selected =
      league === "ALL" ? "" : league;

    setLoading(true);
    setError("");

    Promise.all([
      api.picks(selected),
      api.props(selected),
    ])
      .then(([pickData, propData]) => {
        setPicks(pickData.slice(0, 20));
        setProps(propData.slice(0, 24));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [league]);

  return (
    <main className="shell">
      <section className="page-banner">
        <div>
          <span className="eyebrow">
            <BrainCircuit size={14} />
            Jedi Picks
          </span>

          <h1>Strongest market signals</h1>

          <p>
            Ranked using no-vig probabilities,
            sportsbook agreement and market depth.
          </p>
        </div>

        <Target size={64} />
      </section>

      <div className="disclosure-strip">
        Consensus strength is not guaranteed profit.
        Always review the underlying market.
      </div>

      <div className="league-tabs standalone">
        {leagues.map((item) => (
          <button
            key={item}
            className={
              league === item ? "active" : ""
            }
            onClick={() => setLeague(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {error && (
        <div className="error">{error}</div>
      )}

      {loading ? (
        <div className="loading">
          Ranking market signals…
        </div>
      ) : (
        <>
          <section>
            <div className="section-head">
              <div>
                <span className="eyebrow">
                  Ranked Board
                </span>
                <h2>Top Jedi signals</h2>
              </div>
            </div>

            <div className="pick-grid">
              {picks.map(
                ({ game, analysis }, index) => (
                  <Link
                    to={`/game/${game.id}`}
                    className="pick-card"
                    key={game.id}
                  >
                    <div className="rank">
                      #{index + 1}
                    </div>

                    <div className="pick-main">
                      <span>
                        {game.league} ·{" "}
                        {game.away.abbr} @{" "}
                        {game.home.abbr}
                      </span>

                      <div className="pick-title-row">
                        <h3>{analysis.pick}</h3>

                        <span
                          className={`grade grade-${(
                            analysis.grade || "lean"
                          ).toLowerCase()}`}
                        >
                          {analysis.grade || "LEAN"}
                        </span>
                      </div>

                      <p>{analysis.summary}</p>

                      <div className="pick-metrics">
                        <span>
                          {analysis.consensusBooks || 1}
                          {" "}books
                        </span>

                        <span>
                          {analysis.marketAgreement ?? "—"}%
                          {" "}agreement
                        </span>

                        <span>
                          {analysis.edge ?? "—"}%
                          {" "}market strength
                        </span>
                      </div>
                    </div>

                    <div className="confidence-ring">
                      <strong>
                        {analysis.confidence}%
                      </strong>
                      <span>confidence</span>
                    </div>

                    <ChevronRight />
                  </Link>
                )
              )}
            </div>
          </section>

          <section className="props-section">
            <div className="section-head">
              <div>
                <span className="eyebrow">
                  Player Props
                </span>
                <h2>Live prop markets</h2>
              </div>
            </div>

            <div className="props-grid">
              {props.map((prop) => (
                <article
                  className="prop-card"
                  key={prop.id}
                >
                  <div className="prop-icon">
                    <UserRound />
                  </div>

                  <span>
                    {prop.league}
                    {prop.bookmaker
                      ? ` · ${prop.bookmaker}`
                      : ""}
                  </span>

                  <h3>{prop.player}</h3>

                  <p>
                    {String(prop.market)
                      .replaceAll("_", " ")}
                  </p>

                  <div className="prop-line">
                    <b>
                      {prop.pick}{" "}
                      {prop.line ?? ""}
                    </b>

                    <span>
                      {prop.price
                        ? `Odds ${prop.price > 0 ? "+" : ""}${prop.price}`
                        : "Market"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
