import { Router } from "express";
import { analyzeParlay } from "../services/analysisService.js";
import { requirePro, requireAuth } from "../middleware/auth.js";
import { query } from "../services/database.js";
import { buildSportsbookLinks } from "../services/sportsbook-links.js";

function medianOf(values) {
  const v = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/*
 * Every bettable side of ONE game: moneyline (both teams),
 * spread (both sides), total (over/under). Consensus across books.
 * `group` = one side allowed per market per game.
 */
function gameLineOptions(game, analysis = {}) {
  if (!game || !game.id) return [];
  const away = game.away || {}, home = game.home || {};
  const books = Array.isArray(game.bookmakers) && game.bookmakers.length ? game.bookmakers : [game];
  const matchup = `${away.name || ""} @ ${home.name || ""}`;
  const base = { type: "game_line", eventId: game.id, league: game.league, matchup, player: null, bookmaker: "Consensus" };
  const out = [];

  // moneyline
  const ml = {};
  for (const b of books) for (const m of b.moneyline || []) {
    (ml[m.team] = ml[m.team] || []).push(Number(m.price));
  }
  const teams = [away.name, home.name].filter(t => t && ml[t] && ml[t].length);
  if (teams.length === 2) {
    const price = Object.fromEntries(teams.map(t => [t, Math.round(medianOf(ml[t]))]));
    const imp = Object.fromEntries(teams.map(t => [t, impliedProbability(price[t]) || 0]));
    const total = imp[teams[0]] + imp[teams[1]] || 1;
    for (const t of teams) {
      const conf = Math.round((imp[t] / total) * 100);
      out.push({ ...base, market: "moneyline", pick: t, line: null, price: price[t], confidence: conf,
        group: `${game.id}:moneyline`, label: `${t} to win` });
    }
  }

  // spread
  const favCounts = {};
  for (const b of books) if (b.spread?.favorite) favCounts[b.spread.favorite] = (favCounts[b.spread.favorite] || 0) + 1;
  const favAbbr = Object.keys(favCounts).sort((a, b) => favCounts[b] - favCounts[a])[0] || game.spread?.favorite;
  const favLine = medianOf(books.filter(b => b.spread?.favorite === favAbbr).map(b => b.spread.line)) ?? game.spread?.line;
  const favTeam = favAbbr === home.abbr ? home : favAbbr === away.abbr ? away : null;
  if (favTeam && Number.isFinite(Number(favLine))) {
    const dogTeam = favTeam === home ? away : home;
    const L = Math.abs(Number(favLine));
    const lean = analysis.pick === favTeam.abbr ? 2 : analysis.pick === dogTeam.abbr ? -2 : 0;
    out.push({ ...base, market: "spread", pick: favTeam.name, line: -L, price: -110, confidence: 50 + lean,
      group: `${game.id}:spread`, label: `${favTeam.name} -${L}` });
    out.push({ ...base, market: "spread", pick: dogTeam.name, line: L, price: -110, confidence: 50 - lean,
      group: `${game.id}:spread`, label: `${dogTeam.name} +${L}` });
  }

  // total
  const tot = medianOf(books.map(b => b.total)) ?? Number(game.total);
  if (Number.isFinite(tot)) {
    out.push({ ...base, market: "total", pick: "Over", line: tot, price: -110, confidence: 50,
      group: `${game.id}:total`, label: `Over ${tot} points` });
    out.push({ ...base, market: "total", pick: "Under", line: tot, price: -110, confidence: 50,
      group: `${game.id}:total`, label: `Under ${tot} points` });
  }
  return out;
}

/*
 * Auto-parlay access: Pro = unlimited, free account = 1 per day (ET),
 * matching the pricing page. Counted only when a parlay is delivered.
 */
const FREE_AUTO_PER_DAY = 1;
const freeAutoMemory = new Map();
let usageTableReady = null;
function ensureUsageTable() {
  if (!usageTableReady) {
    usageTableReady = query(
      "CREATE TABLE IF NOT EXISTS sj_auto_parlay_usage (user_id TEXT NOT NULL, day DATE NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, day))"
    ).catch(error => { usageTableReady = null; throw error; });
  }
  return usageTableReady;
}
async function freeAutoUsed(userId, day) {
  try {
    await ensureUsageTable();
    const r = await query("SELECT count FROM sj_auto_parlay_usage WHERE user_id=$1 AND day=$2", [userId, day]);
    return Number(r.rows[0]?.count || 0);
  } catch {
    return freeAutoMemory.get(`${userId}:${day}`) || 0;
  }
}
async function countFreeAuto(userId, day) {
  try {
    await ensureUsageTable();
    await query(
      "INSERT INTO sj_auto_parlay_usage (user_id, day, count) VALUES ($1,$2,1) ON CONFLICT (user_id, day) DO UPDATE SET count = sj_auto_parlay_usage.count + 1",
      [userId, day]
    );
  } catch {
    const k = `${userId}:${day}`;
    freeAutoMemory.set(k, (freeAutoMemory.get(k) || 0) + 1);
  }
}
async function autoParlayAccess(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Make a free account to get 1 free auto parlay every day.",
        code: "AUTH_REQUIRED",
      });
    }
    if (req.user.isPro) {
      req.autoParlayAccess = { plan: "pro", remaining: null };
      return next();
    }
    const day = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    const userId = String(req.user.id);
    const used = await freeAutoUsed(userId, day);
    if (used >= FREE_AUTO_PER_DAY) {
      return res.status(403).json({
        success: false,
        error: "You've used today's free auto parlay. Build one yourself, or go Pro for unlimited auto parlays.",
        code: "FREE_LIMIT_REACHED",
        upgradeUrl: "https://sportsjedi.com/pricing",
      });
    }
    req.autoParlayAccess = { plan: "free", remaining: FREE_AUTO_PER_DAY - used - 1 };
    res.on("finish", () => {
      if (res.statusCode === 200) countFreeAuto(userId, day).catch(() => {});
    });
    next();
  } catch (error) {
    next(error);
  }
}

const router = Router();

function americanToDecimal(price) {
  const n = Number(price);

  if (!Number.isFinite(n) || n === 0) {
    return null;
  }

  return n > 0
    ? 1 + n / 100
    : 1 + 100 / Math.abs(n);
}

function decimalToAmerican(decimal) {
  if (!Number.isFinite(decimal) || decimal <= 1) {
    return null;
  }

  return decimal >= 2
    ? Math.round((decimal - 1) * 100)
    : Math.round(-100 / (decimal - 1));
}

function impliedProbability(price) {
  const n = Number(price);

  if (!Number.isFinite(n) || n === 0) {
    return null;
  }

  return n > 0
    ? 100 / (n + 100)
    : Math.abs(n) / (Math.abs(n) + 100);
}

router.post("/analyze", (req, res) => {
  const legs = Array.isArray(req.body?.legs)
    ? req.body.legs
    : [];

  res.json({
    success: true,
    data: analyzeParlay(legs),
  });
});

router.post("/player", requireAuth, (req, res) => {
  const legs = Array.isArray(req.body?.legs)
    ? req.body.legs
    : Array.isArray(req.body?.selections)
      ? req.body.selections
      : [];

  if (legs.length < 2) {
    return res.status(400).json({
      success: false,
      error: "A player parlay requires at least 2 legs.",
    });
  }

  const decimalOdds = legs
    .map((leg) => americanToDecimal(leg.price))
    .filter(Boolean);

  if (decimalOdds.length !== legs.length) {
    return res.status(400).json({
      success: false,
      error: "Every leg must contain valid odds.",
    });
  }

  const combinedDecimal =
    decimalOdds.reduce((a, b) => a * b, 1);

  const rawProbability =
    1 / combinedDecimal;

  const eventIds =
    new Set(legs.map((leg) => leg.eventId).filter(Boolean));

  const sameGame =
    eventIds.size === 1;

  const warnings = [];

  if (sameGame) {
    warnings.push(
      "Same-game legs may be correlated, so combined probability is only an estimate."
    );
  }

  res.json({
    success: true,
    data: {
      legs: legs.length,
      sameGame,
      combinedDecimal:
        +combinedDecimal.toFixed(2),
      combinedAmerican:
        decimalToAmerican(combinedDecimal),
      impliedProbability:
        +(rawProbability * 100).toFixed(1),
      risk:
        legs.length >= 5 || rawProbability < 0.12
          ? "High"
          : legs.length >= 3 || rawProbability < 0.30
            ? "Medium"
            : "Lower",
      warnings,
      selections: legs,
    },
  });
});

router.get("/game-options", async (req, res) => {
  try {
    const league = String(req.query.league || "NFL").toUpperCase();
    const eventId = String(req.query.eventId || "").trim();
    if (!eventId) {
      return res.status(400).json({ success: false, error: "eventId is required." });
    }
    const base = process.env.INTERNAL_API_URL || "http://127.0.0.1:4100";
    const [gamesResponse, picksResponse] = await Promise.all([
      fetch(`${base}/api/games?league=${encodeURIComponent(league)}`),
      fetch(`${base}/api/picks?league=${encodeURIComponent(league)}&limit=100`),
    ]);
    const gamesPayload = gamesResponse.ok ? await gamesResponse.json() : { data: [] };
    const picksPayload = picksResponse.ok ? await picksResponse.json() : { data: [] };
    const game = (gamesPayload.data || []).find(g => String(g.id) === eventId);
    if (!game) {
      return res.status(404).json({ success: false, error: "This game isn't on the board right now." });
    }
    const analysis = (picksPayload.data || []).find(i => String(i.game?.id) === eventId)?.analysis || {};
    res.json({
      success: true,
      data: {
        eventId,
        league,
        matchup: `${game.away?.name || ""} @ ${game.home?.name || ""}`,
        options: gameLineOptions(game, analysis).map(o => ({ ...o, id: `${o.eventId}|${o.market}|${o.pick}|${o.line ?? ""}` })),
      },
    });
  } catch (error) {
    console.error("Game options error:", error);
    res.status(500).json({ success: false, error: "Unable to load picks for this game." });
  }
});

router.get("/auto", autoParlayAccess, async (req, res) => {
  try {
    const mode =
      String(req.query.mode || "balanced")
        .toLowerCase();

    const league =
      String(req.query.league || "MLB")
        .toUpperCase();

    /*
     * Optional event scope.
     * When supplied, the builder may ONLY select
     * legs belonging to this specific game.
     */
    const requestedEventId =
      String(req.query.eventId || "").trim();

    const presetConfigs = {
      safe: {
        legs: 2,
        minConfidence: 68,
        minPrice: -300,
        maxSameGame: 1,
        maxSameMarket: 1,
        type: "mixed",
        gameMode: "diversified",
        direction: "any",
        uniquePlayers: true,
        markets: [],
      },

      balanced: {
        legs: 3,
        minConfidence: 60,
        minPrice: -300,
        maxSameGame: 1,
        maxSameMarket: 1,
        type: "mixed",
        gameMode: "diversified",
        direction: "any",
        uniquePlayers: true,
        markets: [],
      },

      longshot: {
        legs: 5,
        minConfidence: 50,
        minPrice: -300,
        maxSameGame: 2,
        maxSameMarket: 2,
        type: "mixed",
        gameMode: "either",
        direction: "any",
        uniquePlayers: true,
        markets: [],
      },
    };

    let config;

    if (mode === "custom") {
      const requestedLegs =
        Number(req.query.legs || 4);

      const requestedConfidence =
        Number(req.query.minConfidence || 70);

      const requestedPrice =
        Number(req.query.minPrice || -300);

      const requestedMaxSameGame =
        Number(req.query.maxSameGame || 1);

      const type =
        String(req.query.type || "mixed")
          .toLowerCase();

      const gameMode =
        String(
          req.query.gameMode || "diversified"
        ).toLowerCase();

      const direction =
        String(req.query.direction || "any")
          .toLowerCase();

      const uniquePlayers =
        String(
          req.query.uniquePlayers ?? "true"
        ).toLowerCase() !== "false";

      const markets =
        String(req.query.markets || "")
          .split(",")
          .map(value => value.trim())
          .filter(Boolean);

      if (
        ![
          "mixed",
          "player_props",
          "game_lines",
        ].includes(type)
      ) {
        return res.status(400).json({
          success: false,
          error:
            "type must be mixed, player_props, or game_lines.",
        });
      }

      if (
        ![
          "diversified",
          "same_game",
          "either",
        ].includes(gameMode)
      ) {
        return res.status(400).json({
          success: false,
          error:
            "gameMode must be diversified, same_game, or either.",
        });
      }

      if (
        ![
          "any",
          "over",
          "under",
        ].includes(direction)
      ) {
        return res.status(400).json({
          success: false,
          error:
            "direction must be any, over, or under.",
        });
      }

      config = {
        legs:
          Math.max(
            2,
            Math.min(8, requestedLegs)
          ),

        minConfidence:
          Math.max(
            40,
            Math.min(
              95,
              requestedConfidence
            )
          ),

        minPrice:
          Math.max(
            -1000,
            Math.min(-100, requestedPrice)
          ),

        maxSameGame:
          Math.max(
            1,
            Math.min(
              8,
              requestedMaxSameGame
            )
          ),

        maxSameMarket:
          8,

        type,
        gameMode,
        direction,
        uniquePlayers,
        markets,
      };
    } else {
      config =
        presetConfigs[mode]
          ? { ...presetConfigs[mode] }
          : null;

      if (!config) {
        return res.status(400).json({
          success: false,
          error:
            "Mode must be safe, balanced, longshot, or custom.",
        });
      }
    }

    const base =
      process.env.INTERNAL_API_URL ||
      "http://127.0.0.1:4100";

    const needsProps =
      config.type !== "game_lines";

    const needsPicks =
      config.type !== "player_props";

    const [
      propsResponse,
      picksResponse,
    ] = await Promise.all([
      needsProps
        ? fetch(
            `${base}/api/picks/props?league=${league}`
          )
        : Promise.resolve(null),

      needsPicks
        ? fetch(
            `${base}/api/picks?league=${league}&limit=100`
          )
        : Promise.resolve(null),
    ]);

    if (
      (needsProps && !propsResponse?.ok) ||
      (needsPicks && !picksResponse?.ok)
    ) {
      throw new Error(
        "Sports Jedi market feed unavailable"
      );
    }

    const propsPayload =
      needsProps
        ? await propsResponse.json()
        : { data: [] };

    const picksPayload =
      needsPicks
        ? await picksResponse.json()
        : { data: [] };

    let candidates = [];

    /*
     * PLAYER PROP CANDIDATES
     */
    if (needsProps) {
      for (
        const prop of propsPayload.data || []
      ) {
        const price =
          Number(prop.price);

        if (
          !Number.isFinite(price) ||
          price < config.minPrice ||
          price > 350
        ) {
          continue;
        }

        if (
          config.markets.length &&
          !config.markets.includes(
            prop.market
          )
        ) {
          continue;
        }

        if (
          config.direction !== "any" &&
          String(prop.pick || "")
            .toLowerCase() !==
            config.direction
        ) {
          continue;
        }

        const probability =
          impliedProbability(price);

        if (probability == null) {
          continue;
        }

        const confidence =
          Number(
            prop.confidence ??
            Math.round(
              probability * 100
            )
          );

        if (
          confidence <
          config.minConfidence
        ) {
          continue;
        }

        candidates.push({
          type: "player_prop",
          eventId: prop.eventId,
          league: prop.league,
          matchup:
            prop.matchup || "",
          player:
            prop.player,
          market:
            prop.market,
          pick:
            prop.pick,
          line:
            prop.line,
          price,
          bookmaker:
            prop.bookmaker || "",

          bookmakerKey:
            prop.bookmakerKey || "",

          deeplink:
            prop.deeplink || null,

          sportsbookDeepLinks:
            prop.sportsbookDeepLinks || {},

          confidence,
          score:
            confidence,
        });
      }
    }

    /*
     * GAME-LINE CANDIDATES
     */
    if (needsPicks) {
      for (
        const item of picksPayload.data || []
      ) {
        const game =
          item.game || {};

        const analysis =
          item.analysis || {};

        const confidence =
          Number(
            analysis.confidence || 0
          );

        if (
          confidence <
            config.minConfidence ||
          !game.spread
        ) {
          continue;
        }

        candidates.push({
          type: "game_pick",
          eventId:
            game.id,
          league:
            game.league,
          matchup:
            `${game.away?.name || ""} @ ${game.home?.name || ""}`,
          player:
            null,
          market:
            "spread",
          pick:
            game.home?.abbr ===
            analysis.pick
              ? game.home?.name
              : game.away?.abbr ===
                analysis.pick
                ? game.away?.name
                : analysis.pick,
          line:
            game.spread.line,
          price:
            -110,
          bookmaker:
            game.bookmaker?.title ||
            "",
          confidence,
          score:
            confidence + 3,
        });
      }
    }

    /*
     * SINGLE GAME: offer every side of the game itself
     * (moneyline, spread, total), not just one pick.
     */
    if (requestedEventId && needsPicks) {
      try {
        const gamesResponse =
          await fetch(`${base}/api/games?league=${league}`);
        const gamesPayload =
          gamesResponse.ok ? await gamesResponse.json() : { data: [] };
        const game =
          (gamesPayload.data || []).find(g => String(g.id) === requestedEventId);
        if (game) {
          const pickItem =
            (picksPayload.data || []).find(i => String(i.game?.id) === requestedEventId);
          candidates = candidates.filter(
            c => !(c.type === "game_pick" && String(c.eventId) === requestedEventId)
          );
          const floor =
            mode === "safe" ? 50 : mode === "longshot" ? 5 : 40;
          for (const line of gameLineOptions(game, pickItem?.analysis || {})) {
            if (line.confidence < floor) continue;
            if (Number(line.price) < Number(config.minPrice ?? -300)) continue;
            const payoutBonus =
              Math.min(40, Math.max(0, (Number(line.price) || 0) / 10));
            const score =
              mode === "longshot"
                ? (100 - line.confidence) + payoutBonus
                : mode === "safe"
                  ? line.confidence + 5
                  : line.confidence;
            candidates.push({ ...line, score });
          }
        }
      } catch (error) {
        console.error("Game line options error:", error.message);
      }
    }

    /*
     * SPECIFIC-GAME MODE:
     * A caller may explicitly choose the event.
     * Never silently substitute another game.
     */
    if (requestedEventId) {
      candidates =
        candidates.filter(
          candidate =>
            String(candidate.eventId) ===
            requestedEventId
        );

      if (!candidates.length) {
        return res.status(404).json({
          success: false,
          error:
            "This game doesn't have picks posted yet. Check back closer to game time.",
        });
      }

      const choiceGroups = new Set(
        candidates.map(c => c.group || [c.eventId, c.player, c.market].join(":"))
      );
      if (choiceGroups.size < 2) {
        return res.status(404).json({
          success: false,
          error:
            "This game doesn't have enough picks yet to make a parlay. Check back closer to game time.",
          available: choiceGroups.size,
        });
      }
      config.legs = Math.max(2, Math.min(config.legs, choiceGroups.size));

      config.gameMode = "same_game";
      config.maxSameGame = config.legs;
    }

    candidates.sort(
      (a, b) =>
        b.score - a.score
    );

    /*
     * SAME-GAME MODE:
     * Pick the strongest event that has enough
     * qualifying candidates.
     */
    if (
      mode === "custom" &&
      config.gameMode === "same_game" &&
      !requestedEventId
    ) {
      const byEvent =
        new Map();

      for (
        const candidate of candidates
      ) {
        if (
          !candidate.eventId
        ) {
          continue;
        }

        if (
          !byEvent.has(
            candidate.eventId
          )
        ) {
          byEvent.set(
            candidate.eventId,
            []
          );
        }

        byEvent
          .get(candidate.eventId)
          .push(candidate);
      }

      const eventChoices =
        [...byEvent.entries()]
          .filter(
            ([, list]) =>
              list.length >=
              config.legs
          )
          .sort(
            (a, b) =>
              b[1].reduce(
                (sum, item) =>
                  sum + item.score,
                0
              ) -
              a[1].reduce(
                (sum, item) =>
                  sum + item.score,
                0
              )
          );

      if (!eventChoices.length) {
        return res.status(404).json({
          success: false,
          error:
            `No ${league} game currently has ${config.legs} qualifying legs for this Same Game build.`,
        });
      }

      const [
        bestEventId,
      ] = eventChoices[0];

      candidates =
        candidates.filter(
          candidate =>
            candidate.eventId ===
            bestEventId
        );

      config.maxSameGame =
        config.legs;
    }

    const selected = [];

    const usedPlayerMarkets =
      new Set();

    const usedPlayers =
      new Set();

    const eventCounts =
      new Map();

    const marketCounts =
      new Map();

    for (
      const candidate of candidates
    ) {
      if (
        selected.length >=
        config.legs
      ) {
        break;
      }

      if (candidate.group && selected.some(leg => leg.group === candidate.group)) {
        continue;
      }
      // moneyline + spread in one game must back the same team (no picks that can't both win)
      if (candidate.type === "game_line" && ["moneyline", "spread"].includes(candidate.market) &&
        selected.some(leg => leg.type === "game_line" && leg.eventId === candidate.eventId &&
          ["moneyline", "spread"].includes(leg.market) && leg.market !== candidate.market && leg.pick !== candidate.pick)) {
        continue;
      }

      const eventCount =
        eventCounts.get(
          candidate.eventId
        ) || 0;

      const marketCount =
        marketCounts.get(
          candidate.market
        ) || 0;

      const effectiveMaxSameGame =
        config.gameMode ===
          "either"
          ? Math.max(
              config.maxSameGame,
              config.legs
            )
          : config.maxSameGame;

      if (
        eventCount >=
        effectiveMaxSameGame
      ) {
        continue;
      }

      if (
        marketCount >=
        config.maxSameMarket
      ) {
        continue;
      }

      if (candidate.player) {
        const playerKey =
          String(
            candidate.player
          ).toLowerCase();

        if (
          config.uniquePlayers &&
          usedPlayers.has(
            playerKey
          )
        ) {
          continue;
        }

        const propKey = [
          candidate.eventId,
          candidate.player,
          candidate.market,
          candidate.pick,
          candidate.line,
        ].join(":");

        if (
          usedPlayerMarkets.has(
            propKey
          )
        ) {
          continue;
        }

        usedPlayerMarkets.add(
          propKey
        );

        usedPlayers.add(
          playerKey
        );
      }

      selected.push(
        candidate
      );

      eventCounts.set(
        candidate.eventId,
        eventCount + 1
      );

      marketCounts.set(
        candidate.market,
        marketCount + 1
      );
    }

    /*
     * Presets can relax slightly if strict
     * diversification cannot fill the card.
     *
     * Custom builds do NOT silently violate
     * the user's filters.
     */
    if (
      mode !== "custom" &&
      selected.length <
        config.legs
    ) {
      for (
        const candidate of candidates
      ) {
        if (
          selected.length >=
          config.legs
        ) {
          break;
        }

        if (candidate.group && selected.some(leg => leg.group === candidate.group)) {
          continue;
        }
        // moneyline + spread in one game must back the same team (no picks that can't both win)
        if (candidate.type === "game_line" && ["moneyline", "spread"].includes(candidate.market) &&
          selected.some(leg => leg.type === "game_line" && leg.eventId === candidate.eventId &&
            ["moneyline", "spread"].includes(leg.market) && leg.market !== candidate.market && leg.pick !== candidate.pick)) {
          continue;
        }

        if (
          selected.some(
            leg =>
              leg.eventId ===
                candidate.eventId &&
              leg.player ===
                candidate.player &&
              leg.market ===
                candidate.market &&
              leg.pick ===
                candidate.pick &&
              leg.line ===
                candidate.line
          )
        ) {
          continue;
        }

        const eventCount =
          eventCounts.get(
            candidate.eventId
          ) || 0;

        if (
          eventCount >=
          (
            mode === "longshot"
              ? 3
              : 2
          )
        ) {
          continue;
        }

        selected.push(
          candidate
        );

        eventCounts.set(
          candidate.eventId,
          eventCount + 1
        );
      }
    }

    if (
      selected.length <
      config.legs
    ) {
      return res.status(404).json({
        success: false,
        error:
          requestedEventId
            ? "Not enough picks match this style for this game. Try another style, or build it yourself."
            : `Only ${selected.length} qualifying ${league} legs are available for these builder settings.`,
        available:
          selected.length,
        requested:
          config.legs,
      });
    }

    const combinedDecimal =
      selected.reduce(
        (total, leg) =>
          total *
          americanToDecimal(
            leg.price
          ),
        1
      );

    const uniqueEvents =
      new Set(
        selected.map(
          leg => leg.eventId
        )
      );

    const warnings = [];

    if (
      uniqueEvents.size <
      selected.length
    ) {
      warnings.push(
        "Some legs share the same game and may be correlated."
      );
    }

    if (
      mode === "custom" &&
      config.type ===
        "player_props"
    ) {
      warnings.push(
        "Player Props Only filter applied."
      );
    }

    res.json({
      success: true,

      data: {
        mode,
        league,

        eventId:
          requestedEventId || null,

        builder:
          mode === "custom"
            ? {
                type:
                  config.type,
                requestedLegs:
                  config.legs,
                minConfidence:
                  config.minConfidence,
                minPrice:
                  config.minPrice,
                gameMode:
                  config.gameMode,
                direction:
                  config.direction,
                uniquePlayers:
                  config.uniquePlayers,
                maxSameGame:
                  config.maxSameGame,
                markets:
                  config.markets,
              }
            : null,

        legs:
          selected.length,

        selections:
          selected.map(
            ({
              score,
              ...leg
            }) => ({
              ...leg,
              sportsbookLinks:
                buildSportsbookLinks(leg),
            })
          ),

        combinedDecimal:
          +combinedDecimal.toFixed(
            2
          ),

        combinedAmerican:
          decimalToAmerican(
            combinedDecimal
          ),

        impliedProbability:
          +(
            (
              1 /
              combinedDecimal
            ) * 100
          ).toFixed(1),

        risk:
          mode === "safe"
            ? "Lower"
            : mode === "balanced"
              ? "Medium"
              : mode === "longshot"
                ? "High"
                : config.legs <= 2
                  ? "Lower"
                  : config.legs <= 4
                    ? "Medium"
                    : "High",

        uniqueGames:
          uniqueEvents.size,

        sameGame:
          uniqueEvents.size === 1,

        warnings,

        access:
          req.autoParlayAccess || null,
      },
    });
  } catch (error) {
    console.error(
      "Auto parlay error:",
      error
    );

    res.status(500).json({
      success: false,
      error:
        "Unable to generate auto parlay.",
    });
  }
});
export default router;
