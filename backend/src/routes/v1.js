/*
 * Sports Jedi public developer API, version 1.
 * Auth: X-API-Key header (see middleware/apiKey.js). Docs: GET /v1/docs.
 *
 * By default responses contain Sports Jedi's own analysis plus the minimum
 * game identity needed to use it. Third-party market data (odds lines,
 * bookmakers, live scores, player props) is only included when
 * API_INCLUDE_MARKET_DATA=1, i.e. once redistribution is licensed.
 */
import { Router } from "express";
import { requireApiKey } from "../middleware/apiKey.js";
import { getSportsProvider } from "../services/sportsProvider.js";
import { analyzeGame, analyzeParlay } from "../services/analysisService.js";
import { renderDocs } from "./v1Docs.js";

const router = Router();
const provider = getSportsProvider();

export const LEAGUES = ["NFL", "NCAAF", "NBA", "MLB"];
const STATUSES = new Set(["upcoming", "live", "final", "postponed"]);
const MAX_PARLAY_LEGS = 12;

const marketData = () => /^(1|true|yes)$/i.test(String(process.env.API_INCLUDE_MARKET_DATA || ""));

const team = (t = {}) => ({ name: t.name || "", abbr: t.abbr || "" });

export function presentGame(g) {
  const out = {
    id: g.id,
    league: g.league,
    startTime: g.startTime,
    status: g.status,
    away: team(g.away),
    home: team(g.home),
  };
  if (marketData()) {
    Object.assign(out, {
      score: { away: g.away?.score ?? null, home: g.home?.score ?? null },
      period: g.period ?? null,
      clock: g.clock ?? null,
      spread: g.spread ?? null,
      total: g.total ?? null,
      moneyline: g.moneyline ?? [],
      bookmaker: g.bookmaker?.title ?? null,
    });
  }
  return out;
}

export function presentAnalysis(a) {
  const out = {
    pick: a.pick ?? null,
    confidence: a.confidence ?? 0,
    grade: a.grade ?? null,
    homeWinProbability: a.homeWinProbability ?? null,
    awayWinProbability: a.awayWinProbability ?? null,
    edge: a.edge ?? null,
    marketAgreement: a.marketAgreement ?? null,
    summary: a.summary ?? null,
  };
  if (marketData()) {
    Object.assign(out, {
      spreadConsensus: a.spreadConsensus ?? null,
      totalConsensus: a.totalConsensus ?? null,
      consensusBooks: a.consensusBooks ?? null,
      factors: a.factors ?? [],
    });
  }
  return out;
}

function badRequest(res, error, code = "BAD_REQUEST") {
  return res.status(400).json({ success: false, error, code });
}

function parseLeague(req, res) {
  if (req.query.league === undefined) return { ok: true, league: undefined };
  const league = String(req.query.league).toUpperCase();
  if (!LEAGUES.includes(league)) {
    badRequest(res, `league must be one of ${LEAGUES.join(", ")}`, "INVALID_LEAGUE");
    return { ok: false };
  }
  return { ok: true, league };
}

const meta = (req, extra = {}) => ({
  plan: req.apiClient.plan.id,
  requestsToday: req.apiClient.usedToday,
  dailyLimit: req.apiClient.plan.perDay,
  ...extra,
});

/* ---------- public, no key ---------- */

router.get("/", (req, res) => {
  res.json({
    success: true,
    data: {
      name: "Sports Jedi API",
      version: "1",
      docs: "https://api.sportsjedi.com/v1/docs",
      auth: "X-API-Key header",
      endpoints: [
        "GET /v1/leagues",
        "GET /v1/games",
        "GET /v1/games/{id}",
        "GET /v1/picks",
        "POST /v1/parlays/analyze",
        "GET /v1/props",
        "GET /v1/usage",
      ],
    },
  });
});

router.get("/docs", (req, res) => {
  res.set(
    "Content-Security-Policy",
    "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
  );
  res.type("html").send(renderDocs());
});

router.get("/leagues", (req, res) => {
  res.json({ success: true, data: LEAGUES });
});

/* ---------- key required ---------- */

router.use(requireApiKey);

router.get("/usage", (req, res) => {
  const { plan, usedToday } = req.apiClient;
  res.json({
    success: true,
    data: {
      plan: plan.id,
      requestsToday: usedToday,
      dailyLimit: plan.perDay,
      remainingToday: Math.max(0, plan.perDay - usedToday),
      perMinuteLimit: plan.perMinute,
      playerProps: plan.props && marketData(),
    },
  });
});

router.get("/games", async (req, res, next) => {
  try {
    const { ok, league } = parseLeague(req, res);
    if (!ok) return;

    const status = req.query.status ? String(req.query.status).toLowerCase() : null;
    if (status && !STATUSES.has(status)) {
      return badRequest(res, "status must be upcoming, live, final or postponed", "INVALID_STATUS");
    }
    const date = req.query.date ? String(req.query.date) : null;
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return badRequest(res, "date must be YYYY-MM-DD (UTC)", "INVALID_DATE");
    }

    let games = await provider.getGames({ league });
    if (status) games = games.filter((g) => g.status === status);
    if (date) games = games.filter((g) => String(g.startTime || "").startsWith(date));
    games.sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));

    res.json({ success: true, data: games.map(presentGame), meta: meta(req, { count: games.length }) });
  } catch (error) {
    next(error);
  }
});

router.get("/games/:id", async (req, res, next) => {
  try {
    const game = await provider.getGame(String(req.params.id).slice(0, 120));
    if (!game) return res.status(404).json({ success: false, error: "Game not found", code: "NOT_FOUND" });
    res.json({
      success: true,
      data: { game: presentGame(game), analysis: presentAnalysis(analyzeGame(game)) },
      meta: meta(req),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/picks", async (req, res, next) => {
  try {
    const { ok, league } = parseLeague(req, res);
    if (!ok) return;

    const minConfidence = req.query.min_confidence === undefined ? 0 : Number(req.query.min_confidence);
    if (!Number.isFinite(minConfidence) || minConfidence < 0 || minConfidence > 100) {
      return badRequest(res, "min_confidence must be 0-100", "INVALID_CONFIDENCE");
    }
    const limit = req.query.limit === undefined ? 50 : Number(req.query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
      return badRequest(res, "limit must be an integer 1-200", "INVALID_LIMIT");
    }

    const games = await provider.getGames({ league });
    const picks = games
      .filter((g) => g.status === "upcoming" || g.status === "live")
      .map((g) => ({ game: g, analysis: analyzeGame(g) }))
      .filter(({ analysis }) => analysis.pick && analysis.confidence >= minConfidence)
      .sort((a, b) => b.analysis.confidence - a.analysis.confidence)
      .slice(0, limit)
      .map(({ game, analysis }) => ({ game: presentGame(game), analysis: presentAnalysis(analysis) }));

    res.json({ success: true, data: picks, meta: meta(req, { count: picks.length }) });
  } catch (error) {
    next(error);
  }
});

/*
 * Legs reference our games; confidence comes from Sports Jedi's analysis,
 * not from the caller, so results can't be inflated. Picking the other
 * side of our pick uses the complementary probability.
 */
router.post("/parlays/analyze", async (req, res, next) => {
  try {
    const legs = Array.isArray(req.body?.legs) ? req.body.legs : null;
    if (!legs || legs.length < 1 || legs.length > MAX_PARLAY_LEGS) {
      return badRequest(res, `legs must be an array of 1-${MAX_PARLAY_LEGS} items like {"gameId":"...","pick":"ABBR"}`, "INVALID_LEGS");
    }

    const priced = [];
    for (const [i, leg] of legs.entries()) {
      const game = leg?.gameId ? await provider.getGame(String(leg.gameId).slice(0, 120)) : null;
      if (!game) return badRequest(res, `legs[${i}]: gameId not found`, "INVALID_LEG");

      const pick = String(leg.pick || "").toUpperCase();
      const sides = [game.home?.abbr, game.away?.abbr].map((s) => String(s || "").toUpperCase());
      if (!sides.includes(pick)) return badRequest(res, `legs[${i}]: pick must be ${sides.join(" or ")}`, "INVALID_LEG");

      const analysis = analyzeGame(game);
      const homeProb = analysis.homeWinProbability;
      const isHome = pick === sides[0];
      let confidence;
      if (typeof homeProb === "number") confidence = isHome ? homeProb : 100 - homeProb;
      else confidence = pick === String(analysis.pick || "").toUpperCase() ? analysis.confidence : 100 - analysis.confidence;

      priced.push({ gameId: game.id, pick, confidence: Math.round(confidence * 10) / 10, game: presentGame(game) });
    }

    const result = analyzeParlay(priced.map(({ gameId, pick, confidence }) => ({ gameId, pick, confidence })));
    res.json({ success: true, data: { ...result, legs: priced }, meta: meta(req) });
  } catch (error) {
    next(error);
  }
});

router.get("/props", async (req, res, next) => {
  try {
    if (!marketData()) {
      return res.status(403).json({ success: false, error: "Player props are not available on this API yet.", code: "NOT_AVAILABLE" });
    }
    if (!req.apiClient.plan.props) {
      return res.status(403).json({ success: false, error: "Player props are included in the Pro plan.", code: "PLAN_REQUIRED" });
    }
    const { ok, league } = parseLeague(req, res);
    if (!ok) return;
    const props = await provider.getPlayerProps({ league: league || "NFL" });
    res.json({ success: true, data: props, meta: meta(req, { count: props.length }) });
  } catch (error) {
    next(error);
  }
});

export default router;
