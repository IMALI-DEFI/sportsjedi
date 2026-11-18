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
import { GoProNudge } from "../components/GoPro";
import { teamShort, pickName, friendlyTime, plainSummary, plainFactor, propLabel } from "../lib/plain";

const leagues = ["ALL", "NFL", "NCAAF", "NBA", "MLB"];

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

          <h1>Today's top picks</h1>

          <p>
            Ranked by how strongly the sportsbooks agree. The higher the
            confidence, the more the market leans that way.
          </p>
        </div>

        <Target size={64} />
      </section>

      <div className="disclosure-strip">
        No pick is ever a sure thing. Have fun and bet responsibly (21+).
      </div>

      <details className="sj-pick-guide" style={{margin:"14px 0",padding:"14px 18px",border:"1px solid rgba(150,170,210,.35)",borderRadius:14}} open>
        <summary style={{cursor:"pointer",fontWeight:700}}>ⓘ What do Strong, Play, Lean and Pass mean?</summary>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12,marginTop:12,fontSize:"0.92rem"}}>
          <span><b>Strong:</b> Higher-confidence model pick, not a guarantee.</span>
          <span><b>Play:</b> A pick the model considers worth considering.</span>
          <span><b>Lean:</b> Slight preference, with less confidence.</span>
          <span><b>Pass:</b> Not enough advantage to recommend a bet.</span>
        </div>
        <small style={{display:"block",marginTop:10,opacity:0.8}}>These are model ratings, not guaranteed results or betting instructions.</small>
      </details>

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
                <h2>Strongest leans right now</h2>
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
                        {game.league} · {teamShort(game.away)} at{" "}
                        {teamShort(game.home)} · {friendlyTime(game.startTime)}
                      </span>

                      <div className="pick-title-row">
                        <h3>{pickName(game, analysis.pick)}</h3>

                        <span
                          className={`grade grade-${(
                            analysis.grade || "lean"
                          ).toLowerCase()}`}
                        >
                          {analysis.grade || "LEAN"}
                        </span>
                      </div>

                      <p>{plainSummary(game, analysis)}</p>

                      <div className="pick-metrics">
                        <span>
                          {analysis.consensusBooks || 1}
                          {" "}sportsbooks
                        </span>

                        <span>
                          {analysis.marketAgreement ?? "—"}%
                          {" "}agree
                        </span>

                        <span>
                          lean strength {analysis.edge ?? "—"}%
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
            <GoProNudge title="Want every pick on the board?" text="Free shows 3 Jedi Picks a day. Pro unlocks unlimited picks and player props for every game." />
          </section>

          <section className="props-section">
            <div className="section-head">
              <div>
                <span className="eyebrow">
                  Player Props
                </span>
                <h2>Player props</h2>
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
                    {propLabel(prop.market)}
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
            {props.length > 0 && (
              <GoProNudge title="More props on Pro" text="Free shows 5 player props a day. Pro shows them all, plus our own long-shot props." />
            )}
            {!props.length && (
              <div className="sj-empty-note">
                🏀 Player props show up on game day, usually a few hours before tip-off. Check back then!
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
