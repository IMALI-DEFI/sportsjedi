import { api } from "../lib/api";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  Plus,
  Trash2,
  Users,
  WandSparkles,
} from "lucide-react";

const API =
  import.meta.env.VITE_API_BASE_URL ||
  "https://api.sportsjedi.com";

const leagues = ["NFL", "NBA", "MLB"];

const advancedMarkets = {
  NFL: [
    ["player_pass_yds", "Passing Yards"],
    ["player_rush_yds", "Rushing Yards"],
    ["player_reception_yds", "Receiving Yards"],
  ],

  NBA: [
    ["player_points", "Points"],
    ["player_rebounds", "Rebounds"],
    ["player_assists", "Assists"],
    ["player_threes", "3-Pointers"],
  ],

  MLB: [
    ["batter_hits", "Hits"],
    ["batter_total_bases", "Total Bases"],
    ["batter_home_runs", "Home Runs"],
  ],
};

function formatMarket(value = "") {
  return value
    .replace(/^player_/, "")
    .replace(/^batter_/, "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatOdds(price) {
  const number = Number(price);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return number > 0
    ? `+${number}`
    : String(number);
}

export default function Parlay() {
  const [league, setLeague] = useState("NFL");
  const [props, setProps] = useState([]);
  const [selectedGame, setSelectedGame] = useState("ALL");
  const [legs, setLegs] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [advancedOpen, setAdvancedOpen] =
    useState(false);

  const [builderType, setBuilderType] =
    useState("player_props");

  const [builderLegs, setBuilderLegs] =
    useState(4);

  const [gameMode, setGameMode] =
    useState("diversified");

  const [minConfidence, setMinConfidence] =
    useState(70);

  const [minPrice, setMinPrice] =
    useState(-300);

  const [direction, setDirection] =
    useState("any");

  const [uniquePlayers, setUniquePlayers] =
    useState(true);

  const [maxSameGame, setMaxSameGame] =
    useState(1);

  const [selectedMarkets, setSelectedMarkets] =
    useState([]);

  useEffect(() => {
    setProps([]);
    setLegs([]);
    setAnalysis(null);
    setSelectedGame("ALL");
    setError("");

    fetch(
      `${API}/api/picks/props?league=${league}`
    )
      .then(async (response) => {
        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Unable to load props"
          );
        }

        setProps(result.data || []);
      })
      .catch((err) => setError(err.message));
  }, [league]);

  const games = useMemo(() => {
    const ids = new Map();

    for (const prop of props) {
      if (
        prop.eventId &&
        !ids.has(prop.eventId)
      ) {
        ids.set(
          prop.eventId,
          prop.matchup ||
            prop.eventId.slice(0, 8)
        );
      }
    }

    return [...ids.entries()];
  }, [props]);

  const visibleProps = useMemo(() => {
    const filtered =
      selectedGame === "ALL"
        ? props
        : props.filter(
            (prop) =>
              prop.eventId === selectedGame
          );

    /*
     * Odds providers frequently return the same prop
     * from multiple books. Show one version per
     * player/market/side/line for the initial UI.
     */
    const unique = new Map();

    for (const prop of filtered) {
      const key = [
        prop.eventId,
        prop.player,
        prop.market,
        prop.pick,
        prop.line,
      ].join("|");

      if (!unique.has(key)) {
        unique.set(key, prop);
      }
    }

    return [...unique.values()].slice(0, 100);
  }, [props, selectedGame]);

  function isSelected(prop) {
    return legs.some(
      (leg) => leg.id === prop.id
    );
  }

  function addLeg(prop) {
    if (isSelected(prop)) {
      return;
    }

    setLegs((current) => [
      ...current,
      prop,
    ]);

    setAnalysis(null);
  }

  function removeLeg(id) {
    setLegs((current) =>
      current.filter(
        (leg) => leg.id !== id
      )
    );

    setAnalysis(null);
  }

  function clearSlip() {
    setLegs([]);
    setAnalysis(null);
  }

  function toggleMarket(market) {
    setSelectedMarkets((current) =>
      current.includes(market)
        ? current.filter(
            (item) => item !== market
          )
        : [...current, market]
    );
  }

  async function generateAdvancedParlay() {
    try {
      setLoading(true);
      setError("");

      const result =
        await api.autoParlayAdvanced({
          league,
          type: builderType,
          legs: builderLegs,
          gameMode,
          minConfidence,
          minPrice,
          direction,
          uniquePlayers,
          maxSameGame,
          markets: selectedMarkets,
        });

      setLegs(result.selections || []);

      setAnalysis({
        impliedProbability:
          result.impliedProbability,
        combinedAmerican:
          result.combinedAmerican,
        combinedDecimal:
          result.combinedDecimal,
        risk:
          result.risk,
        sameGame:
          result.sameGame,
        warnings:
          result.warnings?.length
            ? result.warnings
            : result.warning
              ? [result.warning]
              : [],
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function generateAutoParlay(mode) {
    try {
      setLoading(true);
      setError("");

      const result =
        await api.autoParlay(
          league,
          mode
        );

      setLegs(result.selections || []);

      setAnalysis({
        impliedProbability: result.impliedProbability,
        combinedAmerican: result.combinedAmerican,
        combinedDecimal: result.combinedDecimal,
        risk: result.risk,
        sameGame: result.sameGame,
        warnings:
          result.warnings?.length
            ? result.warnings
            : result.warning
              ? [result.warning]
              : [],
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function analyze() {
    if (legs.length < 2) {
      setError(
        "Add at least two player props."
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result =
        await api.playerParlay(
          legs
        );

      setAnalysis(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell parlay-page">
      <section className="page-banner">
        <div>
          <span className="eyebrow">
            <WandSparkles size={14} />
            Parlay Lab
          </span>

          <h1>
            Build your player parlay
          </h1>

          <p>
            Select individual player props,
            build a same-game or multi-game
            card, and let Sports Jedi analyze
            the combined market risk.
          </p>
        </div>

        <Users size={64} />
      </section>

      <div className="league-tabs standalone">
        {leagues.map((item) => (
          <button
            key={item}
            className={
              league === item
                ? "active"
                : ""
            }
            onClick={() =>
              setLeague(item)
            }
          >
            {item}
          </button>
        ))}
      </div>

      <section className="auto-parlay-card">
        <div>
          <span className="eyebrow">
            Auto Parlay Generator
          </span>

          <h2>Build me a parlay</h2>

          <p>
            Use a quick Jedi preset or customize
            exactly how Sports Jedi builds your card.
          </p>
        </div>

        <div className="auto-parlay-buttons">
          <button
            onClick={() =>
              generateAutoParlay("safe")
            }
          >
            Safer
          </button>

          <button
            className="active"
            onClick={() =>
              generateAutoParlay("balanced")
            }
          >
            Balanced
          </button>

          <button
            onClick={() =>
              generateAutoParlay("longshot")
            }
          >
            Long Shot
          </button>
        </div>

        <button
          type="button"
          className="advanced-toggle"
          onClick={() =>
            setAdvancedOpen(
              (value) => !value
            )
          }
        >
          {advancedOpen
            ? "Hide Advanced Builder"
            : "Advanced Builder"}
        </button>

        {advancedOpen && (
          <div className="advanced-builder">
            <div className="advanced-field">
              <label>Bet Type</label>

              <div className="advanced-options">
                {[
                  ["mixed", "Mixed"],
                  [
                    "player_props",
                    "Player Props Only",
                  ],
                  [
                    "game_lines",
                    "Game Lines Only",
                  ],
                ].map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    className={
                      builderType === value
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setBuilderType(value)
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="advanced-grid">
              <div className="advanced-field">
                <label>Legs</label>

                <select
                  value={builderLegs}
                  onChange={(e) =>
                    setBuilderLegs(
                      Number(e.target.value)
                    )
                  }
                >
                  {[2,3,4,5,6,7,8].map(
                    (count) => (
                      <option
                        key={count}
                        value={count}
                      >
                        {count} legs
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="advanced-field">
                <label>
                  Game Strategy
                </label>

                <select
                  value={gameMode}
                  onChange={(e) =>
                    setGameMode(
                      e.target.value
                    )
                  }
                >
                  <option value="diversified">
                    Diversified
                  </option>

                  <option value="same_game">
                    Same Game
                  </option>

                  <option value="either">
                    Either
                  </option>
                </select>
              </div>

              <div className="advanced-field">
                <label>
                  Minimum Confidence
                </label>

                <select
                  value={minConfidence}
                  onChange={(e) =>
                    setMinConfidence(
                      Number(e.target.value)
                    )
                  }
                >
                  {[60,65,70,72,75,80,85,90]
                    .map((value) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {value}%+
                      </option>
                    ))}
                </select>
              </div>

              <div className="advanced-field">
                <label>
                  Minimum Odds
                </label>

                <select
                  value={minPrice}
                  onChange={(e) =>
                    setMinPrice(
                      Number(e.target.value)
                    )
                  }
                >
                  {[-400,-350,-300,-250,-200,-150,-110]
                    .map((value) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {value}
                      </option>
                    ))}
                </select>
              </div>

              <div className="advanced-field">
                <label>Direction</label>

                <select
                  value={direction}
                  onChange={(e) =>
                    setDirection(
                      e.target.value
                    )
                  }
                >
                  <option value="any">
                    Any
                  </option>

                  <option value="over">
                    Overs Only
                  </option>

                  <option value="under">
                    Unders Only
                  </option>
                </select>
              </div>

              <div className="advanced-field">
                <label>
                  Max Legs Per Game
                </label>

                <select
                  value={maxSameGame}
                  onChange={(e) =>
                    setMaxSameGame(
                      Number(e.target.value)
                    )
                  }
                >
                  {[1,2,3].map(
                    (value) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {value}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            <label className="advanced-check">
              <input
                type="checkbox"
                checked={uniquePlayers}
                onChange={(e) =>
                  setUniquePlayers(
                    e.target.checked
                  )
                }
              />

              Unique players only
            </label>

            {builderType !== "game_lines" && (
              <div className="advanced-field">
                <label>
                  Player Markets
                </label>

                <div className="market-selector">
                  {(advancedMarkets[league] || [])
                    .map(
                      ([value, label]) => (
                        <button
                          type="button"
                          key={value}
                          className={
                            selectedMarkets.includes(
                              value
                            )
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            toggleMarket(value)
                          }
                        >
                          {label}
                        </button>
                      )
                    )}
                </div>
              </div>
            )}

            <button
              type="button"
              className="generate-advanced-btn"
              onClick={generateAdvancedParlay}
              disabled={loading}
            >
              <WandSparkles size={17} />

              {loading
                ? "Building..."
                : "Generate Jedi Parlay"}
            </button>
          </div>
        )}
      </section>
      <div className="parlay-layout">
        <section className="prop-browser">
          <div className="section-head">
            <div>
              <span className="eyebrow">
                Player Props
              </span>
              <h2>
                Choose your legs
              </h2>
            </div>
          </div>

          <div className="event-filter">
            <button
              className={
                selectedGame === "ALL"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setSelectedGame("ALL")
              }
            >
              All Games
            </button>

            {games.map(
              ([id, label], index) => (
                <button
                  key={id}
                  className={
                    selectedGame === id
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setSelectedGame(id)
                  }
                >
                  {label}
                </button>
              )
            )}
          </div>

          {error && (
            <div className="error">
              {error}
            </div>
          )}

          <div className="player-prop-grid">
            {visibleProps.map((prop) => (
              <article
                className={
                  isSelected(prop)
                    ? "player-prop-option selected"
                    : "player-prop-option"
                }
                key={prop.id}
              >
                <div>
                  <small>
                    {prop.matchup || league}
                  </small>

                  <h3>
                    {prop.player}
                  </h3>

                  <span className="prop-book">
                    {prop.bookmaker || ""}
                  </span>

                  <p>
                    {formatMarket(
                      prop.market
                    )}
                  </p>
                </div>

                <div className="prop-choice">
                  <strong>
                    {prop.pick}{" "}
                    {prop.line ?? ""}
                  </strong>

                  <span>
                    {formatOdds(
                      prop.price
                    )}
                  </span>
                </div>

                <button
                  onClick={() =>
                    addLeg(prop)
                  }
                  disabled={
                    isSelected(prop)
                  }
                >
                  <Plus size={16} />

                  {isSelected(prop)
                    ? "Added"
                    : "Add leg"}
                </button>
              </article>
            ))}
          </div>
        </section>

        <aside className="parlay-slip">
          <div className="slip-head">
            <div>
              <span className="eyebrow">
                Your Card
              </span>

              <h2>
                {legs.length} Leg
                {legs.length === 1
                  ? ""
                  : "s"}
              </h2>
            </div>

            {!!legs.length && (
              <button
                className="clear-slip"
                onClick={clearSlip}
              >
                Clear
              </button>
            )}
          </div>

          {!legs.length ? (
            <div className="empty-slip">
              <WandSparkles />

              <p>
                Add player props to build
                your parlay.
              </p>
            </div>
          ) : (
            <div className="slip-legs">
              {legs.map((leg) => (
                <div
                  className="slip-leg"
                  key={leg.id}
                >
                  <div>
                    <small>
                      {leg.matchup || leg.league}
                    </small>

                    <b>{leg.player}</b>

                    <span>
                      {formatMarket(
                        leg.market
                      )}
                    </span>

                    <strong>
                      {leg.pick}{" "}
                      {leg.line ?? ""} ·{" "}
                      {formatOdds(
                        leg.price
                      )}
                    </strong>
                  </div>

                  <button
                    onClick={() =>
                      removeLeg(leg.id)
                    }
                    aria-label="Remove leg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            className="primary-btn analyze-parlay"
            disabled={
              loading ||
              legs.length < 2
            }
            onClick={analyze}
          >
            <WandSparkles size={18} />

            {loading
              ? "Analyzing…"
              : "Analyze Parlay"}
          </button>

          {analysis && (
            <div className="parlay-analysis">
              <span className="eyebrow">
                Jedi Analysis
              </span>

              <div className="parlay-score">
                <strong>
                  {analysis.impliedProbability}%
                </strong>
                <span>
                  combined implied probability
                </span>
              </div>

              <div className="parlay-metrics">
                <div>
                  <span>
                    Estimated odds
                  </span>

                  <b>
                    {analysis.combinedAmerican >
                    0
                      ? "+"
                      : ""}
                    {
                      analysis.combinedAmerican
                    }
                  </b>
                </div>

                <div>
                  <span>Risk</span>
                  <b>{analysis.risk}</b>
                </div>

                <div>
                  <span>Same game</span>
                  <b>
                    {analysis.sameGame
                      ? "Yes"
                      : "No"}
                  </b>
                </div>
              </div>

              {analysis.warnings?.map(
                (warning) => (
                  <div
                    className="parlay-warning"
                    key={warning}
                  >
                    <AlertTriangle
                      size={17}
                    />
                    {warning}
                  </div>
                )
              )}
            </div>
          )}

          <p className="slip-disclaimer">
            Estimated combined odds and
            probabilities are analytical
            approximations. Sportsbooks may
            price same-game parlays differently
            because of correlation.
          </p>
        </aside>
      </div>
    </main>
  );
}
