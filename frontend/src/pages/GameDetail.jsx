import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
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
import LiveGamecast from "../components/LiveGamecast";

export default function GameDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [game, setGame] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [gamecast, setGamecast] = useState(null);
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

  useEffect(() => {
    let cancelled = false;
    let timer;

    async function refreshGamecast() {
      try {
        const data = await api.gamecast(id);

        if (!cancelled) {
          setGamecast(data);

          if (
            data?.score &&
            data?.status
          ) {
            setGame((current) => {
              if (!current) return current;

              return {
                ...current,
                status:
                  data.status ||
                  current.status,
                inning:
                  data.inning ??
                  current.inning,
                inningState:
                  data.inningState ??
                  current.inningState,
                inningOrdinal:
                  data.inningOrdinal ??
                  current.inningOrdinal,
                away: {
                  ...current.away,
                  score:
                    data.score.away ??
                    current.away.score,
                },
                home: {
                  ...current.home,
                  score:
                    data.score.home ??
                    current.home.score,
                },
              };
            });
          }
        }
      } catch (err) {
        /*
         * Gamecast is supplemental.
         * Never break Game Detail if the
         * live feed is temporarily unavailable.
         */
        console.warn(
          "Gamecast refresh failed:",
          err.message
        );
      }

      if (!cancelled) {
        timer = window.setTimeout(
          refreshGamecast,
          7000
        );
      }
    }

    refreshGamecast();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
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

  function buildThisGameParlay() {
    const params = new URLSearchParams({
      league: game.league,
      eventId: id,
      gameMode: "same_game",
    });

    navigate(
      `/parlay?${params.toString()}`
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
            {game.status === "live"
              ? "LIVE"
              : game.status === "final"
                ? "FINAL"
                : game.status}
          </span>
        </div>

        <div className="matchup-teams">
          <div>
            <small>AWAY</small>
            <strong>{game.away.abbr}</strong>
            <span>{game.away.name}</span>
          </div>

          <div className="versus">
            {game.status === "live" ||
            game.status === "final" ? (
              <>
                <strong>
                  {game.away.score ?? 0}
                  {" – "}
                  {game.home.score ?? 0}
                </strong>

                {game.status === "live" &&
                  game.inning && (
                    <small>
                      {game.inningState
                        ? `${game.inningState} `
                        : ""}
                      {game.inningOrdinal ||
                        `Inning ${game.inning}`}
                    </small>
                  )}
              </>
            ) : (
              "VS"
            )}
          </div>

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

      {game.league === "MLB" && gamecast && (
        <LiveGamecast gamecast={gamecast} />
      )}

      <section className="game-parlay-cta">
        <div>
          <span className="eyebrow">
            {game.status === "live"
              ? "LIVE PARLAY BUILDER"
              : "SAME-GAME BUILDER"}
          </span>

          <h2>
            {game.status === "live"
              ? "Build a live parlay for this game"
              : "Build a parlay for this game"}
          </h2>

          <p>
            {game.status === "live"
              ? "Sports Jedi will only use qualifying markets that remain available for this live matchup."
              : "Sports Jedi will only use qualifying picks and player props from this matchup."}
          </p>
        </div>

        <button
          type="button"
          className="primary-button game-parlay-button"
          onClick={buildThisGameParlay}
        >
          {game.status === "live"
            ? "Build Live Parlay"
            : "Build This Game Parlay"}
        </button>
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
