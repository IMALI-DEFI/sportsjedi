import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BarChart3,
  BrainCircuit,
  Radio,
  ShieldCheck,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";

import { Link } from "react-router-dom";
import GameCard from "../components/GameCard";
import { api } from "../lib/api";

const leagues = ["ALL", "NFL", "NBA", "MLB"];

export default function Dashboard() {
  const [games, setGames] = useState([]);
  const [picks, setPicks] = useState([]);
  const [league, setLeague] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const selected =
      league === "ALL" ? "" : league;

    setLoading(true);
    setError("");

    Promise.all([
      api.games(selected),
      api.picks(selected),
    ])
      .then(([gameData, pickData]) => {
        setGames(gameData);
        setPicks(pickData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [league]);

  const sortedGames = useMemo(
    () =>
      [...games].sort(
        (a, b) =>
          new Date(a.startTime) -
          new Date(b.startTime)
      ),
    [games]
  );

  const visibleGames =
    sortedGames.slice(0, 24);

  const live =
    games.filter(
      (game) => game.status === "live"
    ).length;

  const maxConfidence =
    picks.length
      ? Math.max(
          ...picks.map(
            (p) => p.analysis?.confidence || 0
          )
        )
      : 0;

  const books = new Set(
    games.flatMap((game) =>
      (game.bookmakers || []).map(
        (book) => book.key
      )
    )
  ).size;

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <Sparkles size={14} />
            Live sports market intelligence
          </span>

          <h1>
            See the market.
            <br />
            <em>Think like a Jedi.</em>
          </h1>

          <p>
            Compare sportsbook consensus, no-vig probabilities,
            spreads, totals and ranked market signals across NFL,
            NBA and MLB.
          </p>

          <div className="hero-actions">
            <Link
              className="primary-btn"
              to="/picks"
            >
              <Zap size={18} />
              Today&apos;s Jedi Picks
            </Link>

            <Link
              className="secondary-btn"
              to="/parlay"
            >
              Open Parlay Lab
            </Link>
          </div>

          <div className="trust-row">
            <span>
              <ShieldCheck /> Multi-book consensus
            </span>
            <span>
              <BrainCircuit /> No-vig probabilities
            </span>
            <span>
              <BarChart3 /> Built for clarity
            </span>
          </div>
        </div>

        <div className="hero-visual">
          <div className="logo-glow" />
          <img
            src="/sports-jedi-logo.webp"
            alt="Sports Jedi"
          />

          <div className="floating-chip chip-one">
            <Radio size={14} />
            LIVE MARKET
          </div>

          <div className="floating-chip chip-two">
            <BrainCircuit size={14} />
            JEDI CONSENSUS
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <div className="stat">
          <Trophy />
          <span>
            <b>{games.length}</b>
            Games available
          </span>
        </div>

        <div className="stat">
          <Radio />
          <span>
            <b>{live}</b>
            Live now
          </span>
        </div>

        <div className="stat">
          <BrainCircuit />
          <span>
            <b>{maxConfidence || "—"}{maxConfidence ? "%" : ""}</b>
            Top confidence
          </span>
        </div>

        <div className="stat">
          <BarChart3 />
          <span>
            <b>{books || "—"}</b>
            Market sources
          </span>
        </div>
      </section>

      <section className="games-section">
        <div className="section-head">
          <div>
            <span className="eyebrow">
              Game Center
            </span>
            <h2>Upcoming board</h2>
            <p>
              Showing the next {visibleGames.length}
              {" "}matchups.
            </p>
          </div>

          <div className="league-tabs">
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
        </div>

        {error && (
          <div className="error">
            Unable to load the live board: {error}
          </div>
        )}

        {loading ? (
          <div className="loading">
            Scanning sportsbook markets…
          </div>
        ) : (
          <div className="game-grid">
            {visibleGames.map((game) => (
              <GameCard
                key={game.id}
                game={game}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
