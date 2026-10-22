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
import RecentSocialShowcase from "../components/RecentSocialShowcase";
import { api } from "../lib/api";

const leagues = ["ALL", "NFL", "NCAAF", "NBA", "MLB"];

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
      <section aria-label="Sports Jedi skill missions" style={{padding:"20px",margin:"18px 0",border:"1px solid rgba(120,206,255,.4)",borderRadius:18,background:"linear-gradient(120deg,#172a48,#18213c)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <h2 style={{margin:0}}>🎮 Jedi Training Missions</h2>
          <span style={{fontSize:12,opacity:.85}}>Learn first · Practice only · No wager required</span>
        </div>
        <p style={{opacity:.84}}>Build your sports-analysis skills. These are learning missions—not verified wins or redeemable rewards.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12}}>
          {[{title:"Explore today's matchups",detail:"Compare teams and available markets",route:"/picks",action:"Explore picks"},{title:"Practice a parlay",detail:"Build a practice slip without real money",route:"/parlay",action:"Try practice"},{title:"Learn how scores work",detail:"Understand model limits and odds",route:"/methodology",action:"Read methodology"}].map((mission,i)=>(
            <div key={mission.route} style={{padding:14,borderRadius:12,background:"rgba(255,255,255,.06)"}}>
              <div style={{fontWeight:800}}>Mission {i+1}: {mission.title}</div>
              <p style={{fontSize:13,opacity:.8,minHeight:38}}>{mission.detail}</p>
              <Link className="primary-btn" to={mission.route}>{mission.action} →</Link>
            </div>
          ))}
        </div>
      </section>
      <section aria-label="Try Sports Jedi" style={{padding:"24px", margin:"24px 0", background:"linear-gradient(120deg,#14345c,#10243c)", border:"1px solid rgba(127,203,255,.36)", borderRadius:20}}>
        <p style={{letterSpacing:2,fontWeight:800,margin:"0 0 10px"}}>NEW TO SPORTS JEDI?</p>
        <h2 style={{fontSize:"clamp(1.6rem,4vw,2.6rem)",margin:"0 0 12px"}}>Your next practice parlay starts here.</h2>
        <p style={{maxWidth:720}}>Choose a sport, tap Add This Pick on two example games, and review a practice parlay. No account or real money needed.</p>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:18}}>
          <a className="primary-btn" href="https://api.sportsjedi.com/api/demo?utm_source=website&amp;utm_medium=homepage&amp;utm_campaign=free_demo">Build a Practice Parlay</a>
          <Link to="/login?mode=signup&amp;next=%2Fpicks">Create Free Account</Link>
        </div>
        <small style={{display:"block",marginTop:12,opacity:.76}}>Demo games, odds and picks are simulated. Every leg must win for a parlay to win.</small>
      </section>
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
            NCAAF, NBA and MLB.
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

          <Link
            to="/pricing"
            className="home-price-banner"
          >
            <span>
              SPORTS JEDI PRO
            </span>

            <strong>
              Starting at $19.95/month
            </strong>

            <small>
              Free access available · View plans →
            </small>
          </Link>

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

      <RecentSocialShowcase />

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
