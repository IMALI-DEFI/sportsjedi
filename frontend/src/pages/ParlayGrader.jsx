import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Share2, Lock, Sparkles, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useIsPro } from "../components/GoPro";
import { gradeParlay, forTier } from "../lib/parlayGrader";
import "./ParlayGrader.css";

const IMALI_API =
  import.meta.env.VITE_IMALI_API_URL ||
  "https://api.imali-defi.com";

const MARKETS = [
  { value: "moneyline", label: "Moneyline" },
  { value: "spread", label: "Spread" },
  { value: "total", label: "Total (Over/Under)" },
  { value: "prop", label: "Player prop" },
];

const emptyLeg = () => ({ game: "", market: "moneyline", selection: "", odds: "" });

function shareLinkFor(code) {
  const url = new URL("/parlay-grader", "https://sportsjedi.com");
  if (code) url.searchParams.set("ref", code);
  url.searchParams.set("utm_source", "grade_share");
  url.searchParams.set("utm_medium", "social");
  url.searchParams.set("utm_campaign", "parlay_grader");
  return url.toString();
}

export default function ParlayGrader() {
  const { user, account, getToken } = useAuth() || {};
  const isPaid = useIsPro() || account?.isPro === true || account?.isAdmin === true;

  const [legs, setLegs] = useState([emptyLeg(), emptyLeg()]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refCode, setRefCode] = useState("");

  // Pull the user's partner code (if enrolled) so shared grades carry their referral link.
  useEffect(() => {
    if (!user || !getToken) return;
    const token = getToken();
    if (!token) return;
    fetch(`${IMALI_API}/api/referrals/partner/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setRefCode(j?.data?.partner?.referral_code || ""))
      .catch(() => {});
  }, [user]);

  const update = (i, key, val) =>
    setLegs((ls) => ls.map((l, j) => (j === i ? { ...l, [key]: val } : l)));

  function grade() {
    setError("");
    setNotice("");
    try {
      const clean = legs.map((l, i) => {
        const odds = Number(String(l.odds).replace("+", "").trim());
        if (!l.selection.trim()) throw new Error(`Leg ${i + 1}: add your pick.`);
        if (!Number.isFinite(odds) || (odds > -100 && odds < 100)) {
          throw new Error(`Leg ${i + 1}: enter odds like -110 or +150.`);
        }
        return { ...l, odds, game: l.game.trim() || `Game ${i + 1}` };
      });
      const full = gradeParlay(clean);
      setResult(forTier(full, { isPaid }));
      window.requestAnimationFrame(() =>
        document.getElementById("pg-result")?.scrollIntoView({ behavior: "smooth", block: "start" })
      );
    } catch (e) {
      setResult(null);
      setError(e.message);
    }
  }

  const shareLink = useMemo(() => shareLinkFor(refCode), [refCode]);

  async function share() {
    const article = ["A", "F"].includes(result.grade) ? "an" : "a";
    const text = `My parlay got ${article} ${result.grade} (${result.score}/100) on the Sports Jedi Parlay Grader. Grade yours before you lock it in:`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "My Sports Jedi parlay grade", text, url: shareLink });
      } else {
        await navigator.clipboard.writeText(`${text} ${shareLink}`);
        setNotice("Copied! Paste it anywhere.");
      }
    } catch {
      /* share sheet closed */
    }
  }

  const odds = (o) => (o > 0 ? `+${o}` : `${o}`);

  return (
    <main className="shell pg-page">
      <section className="page-banner">
        <div>
          <span className="eyebrow">PARLAY GRADER</span>
          <h1>
            Grade your parlay
            <br />
            <em>before the book does.</em>
          </h1>
          <p>
            Enter your legs and get an A–F grade, your real chance to cash, and
            which leg is most likely to bust you.
          </p>
        </div>
        <Sparkles size={72} />
      </section>

      <section className="pg-form">
        {legs.map((leg, i) => (
          <div key={i} className="pg-leg">
            <div className="pg-leg-head">
              <strong>Leg {i + 1}</strong>
              {legs.length > 2 && (
                <button
                  type="button"
                  className="pg-remove"
                  aria-label={`Remove leg ${i + 1}`}
                  onClick={() => setLegs((ls) => ls.filter((_, j) => j !== i))}
                >
                  <Trash2 size={16} /> Remove
                </button>
              )}
            </div>
            <label>
              <span>Game</span>
              <input
                placeholder="e.g. Lakers @ Celtics"
                value={leg.game}
                onChange={(e) => update(i, "game", e.target.value)}
              />
            </label>
            <div className="pg-row">
              <label className="pg-grow">
                <span>Bet type</span>
                <select value={leg.market} onChange={(e) => update(i, "market", e.target.value)}>
                  {MARKETS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </label>
              <label className="pg-odds">
                <span>Odds</span>
                <input
                  inputMode="numeric"
                  placeholder="-110"
                  value={leg.odds}
                  onChange={(e) => update(i, "odds", e.target.value)}
                />
              </label>
            </div>
            <label>
              <span>Your pick</span>
              <input
                placeholder="e.g. Celtics -4.5, Over 221.5, Tatum Over 27.5 pts"
                value={leg.selection}
                onChange={(e) => update(i, "selection", e.target.value)}
              />
            </label>
          </div>
        ))}

        <div className="pg-actions">
          {legs.length < 12 && (
            <button type="button" className="secondary-btn" onClick={() => setLegs((ls) => [...ls, emptyLeg()])}>
              <Plus size={17} /> Add leg
            </button>
          )}
          <button type="button" className="primary-btn" onClick={grade}>
            Grade my parlay
          </button>
        </div>
        {error && <p className="pg-error">{error}</p>}
      </section>

      {result && (
        <section id="pg-result" className="pg-result">
          <div className="pg-grade-row">
            <div className={`pg-badge pg-grade-${result.grade}`}>{result.grade}</div>
            <div>
              <div className="pg-score">{result.score}/100</div>
              <div className="pg-meta">
                Chance to cash: <b>{(result.hitProb * 100).toFixed(1)}%</b> (about 1 in {Math.max(1, Math.round(1 / result.hitProb))})
                <br />
                Pays: <b>{odds(result.payoutAmerican)}</b>
              </div>
            </div>
          </div>

          {result.tier === "full" ? (
            <>
              {result.breakdown && (
                <div className="pg-breakdown">
                  <div><span>Value</span><b>{result.breakdown.value}/40</b></div>
                  <div><span>Hit chance</span><b>{result.breakdown.hitChance}/25</b></div>
                  <div><span>Leg count</span><b>{result.breakdown.legCount}/15</b></div>
                  <div><span>Build</span><b>{result.breakdown.structure}/20</b></div>
                </div>
              )}
              <h2 className="pg-h2">Jedi suggestions</h2>
              {result.suggestions.map((sg, i) => (
                <div key={i} className={`pg-tip pg-tip-${sg.type}`}>
                  <strong>{sg.title}</strong>
                  <p>{sg.detail}</p>
                </div>
              ))}
            </>
          ) : (
            <div className="pg-locked">
              <strong>
                <Lock size={16} /> {result.lockedSuggestions} fix{result.lockedSuggestions === 1 ? "" : "es"} for this parlay
              </strong>
              {result.teaser && <p className="pg-blur" aria-hidden="true">{result.teaser}</p>}
              <p>See which leg to cut, what each change does to your grade, and the legs working against each other.</p>
              <Link to="/pricing" className="primary-btn">Unlock with Pro: $19.95/mo</Link>
              {!user && (
                <p className="pg-small">
                  New here? <Link to="/login?mode=signup&next=%2Fparlay-grader">Join free</Link> and get a 3-day Pro preview.
                </p>
              )}
            </div>
          )}

          <div className="pg-share">
            <button type="button" className="secondary-btn" onClick={share}>
              <Share2 size={17} /> Share my grade
            </button>
            {notice && <span className="pg-small">{notice}</span>}
          </div>
          <div className="pg-partner">
            <Users size={20} />
            <p>
              {refCode
                ? "Your shares include your partner link. Earn 25% recurring on every friend who goes Pro."
                : <>Turn your grades into income: <Link to="/referrals">join the Partner Program</Link> and earn 25% recurring on every friend who goes Pro.</>}
            </p>
          </div>
        </section>
      )}

      <p className="pg-fine">
        Sports Jedi is for analysis and entertainment, not a sportsbook. Grades use
        no-vig odds and are estimates, not guarantees. 21+. If gambling stops being
        fun, call 1-800-GAMBLER.
      </p>
    </main>
  );
}
