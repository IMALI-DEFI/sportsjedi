/*
 * Data-source admin endpoints (require SOURCES_ADMIN_TOKEN):
 *
 *   GET /api/sources/status            which provider is live, Odds API quota, last errors
 *   GET /api/sources/compare?league=   free ESPN lines vs The Odds API, per league,
 *                                      with a "readyToReplace" verdict
 */
import { Router } from "express";
import { timingSafeEqual } from "node:crypto";
import { getComparisonSources } from "../services/sportsProvider.js";
import { findEspnMatch } from "../services/providers/espn.js";
import { getSourceStatus } from "../services/sourceStatus.js";

const router = Router();

const SPREAD_TOLERANCE = 0.5;
const TOTAL_TOLERANCE = 1;
const READY_COVERAGE = 0.9;
const READY_AGREEMENT = 0.9;

function requireAdmin(req, res, next) {
  const expected = process.env.SOURCES_ADMIN_TOKEN || "";
  if (expected.length < 16) {
    return res.status(503).json({ success: false, error: "Set SOURCES_ADMIN_TOKEN (16+ chars) to use this endpoint" });
  }
  const supplied = Buffer.from(String(req.get("authorization") || "").replace(/^Bearer /i, ""));
  const wanted = Buffer.from(expected);
  if (supplied.length !== wanted.length || !timingSafeEqual(supplied, wanted)) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  next();
}

router.use(requireAdmin);

router.get("/status", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({
    success: true,
    data: {
      provider: String(process.env.SPORTS_PROVIDER || "mock").toLowerCase(),
      oddsApiConfigured: getComparisonSources().oddsApiConfigured,
      sources: getSourceStatus(),
    },
  });
});

// Signed home-team line, so a favorite flip counts as a big miss.
function homeLine(game) {
  const s = game.spread;
  if (!s || typeof s.line !== "number") return null;
  return s.favorite === game.home?.abbr ? s.line : -s.line;
}

function moneylineFavorite(game) {
  if (!game.moneyline?.length) return null;
  return [...game.moneyline].sort((a, b) => a.price - b.price)[0]?.team || null;
}

function ratio(part, whole) {
  return whole ? Math.round((part / whole) * 1000) / 1000 : null;
}

// Use the Odds API line from the same sportsbook ESPN shows, when it has one,
// so a FanDuel vs DraftKings half-point doesn't count as ESPN being wrong.
function sameBookLines(game, bookKey) {
  const book = bookKey && (game.bookmakers || []).find((b) => b.key === bookKey);
  if (!book) return game;
  return {
    ...game,
    spread: book.spread ?? game.spread,
    total: book.total ?? game.total,
    moneyline: book.moneyline?.length ? book.moneyline : game.moneyline,
    bookmaker: { key: book.key, title: book.title },
  };
}

export function compareLeague(league, allOddsGames, espnGames) {
  const rows = [];
  let withLines = 0;
  let spreadChecked = 0, spreadAgree = 0, spreadDiffSum = 0;
  let totalChecked = 0, totalAgree = 0, totalDiffSum = 0;
  let favChecked = 0, favAgree = 0;
  const unmatched = [];

  // Only judge games inside ESPN's scoreboard window; far futures
  // (e.g. Christmas games listed weeks ahead) are counted separately.
  const horizon = espnGames.reduce((max, g) => Math.max(max, new Date(g.startTime).getTime() || 0), 0);
  const oddsGames = allOddsGames.filter((g) => !horizon || new Date(g.startTime).getTime() <= horizon + 12 * 60 * 60 * 1000);
  const beyondWindow = allOddsGames.length - oddsGames.length;

  for (const rawGame of oddsGames) {
    const match = findEspnMatch(rawGame, espnGames);
    const game = match ? sameBookLines(rawGame, match.bookmaker?.key) : rawGame;
    if (!match) {
      unmatched.push(`${game.away?.name} @ ${game.home?.name}`);
      continue;
    }

    const hasLines = Boolean(match.spread || match.total !== null || match.moneyline.length);
    if (hasLines) withLines++;

    const a = homeLine(game), b = homeLine(match);
    let spreadDiff = null;
    if (a !== null && b !== null) {
      spreadDiff = Math.abs(a - b);
      spreadChecked++; spreadDiffSum += spreadDiff;
      if (spreadDiff <= SPREAD_TOLERANCE) spreadAgree++;
    }

    let totalDiff = null;
    if (typeof game.total === "number" && typeof match.total === "number") {
      totalDiff = Math.abs(game.total - match.total);
      totalChecked++; totalDiffSum += totalDiff;
      if (totalDiff <= TOTAL_TOLERANCE) totalAgree++;
    }

    const fa = moneylineFavorite(game), fb = moneylineFavorite(match);
    if (fa && fb) {
      favChecked++;
      // Compare by home/away side, since team names differ between sources.
      const sideA = fa === game.home?.name ? "home" : "away";
      const sideB = fb === match.home.name ? "home" : "away";
      if (sideA === sideB) favAgree++;
    }

    if ((spreadDiff ?? 0) > SPREAD_TOLERANCE || (totalDiff ?? 0) > TOTAL_TOLERANCE) {
      rows.push({
        matchup: `${game.away?.name} @ ${game.home?.name}`,
        startTime: game.startTime,
        oddsApi: { homeSpread: a, total: game.total, book: game.bookmaker?.title || null },
        espn: { homeSpread: b, total: match.total, book: match.bookmaker?.title || null },
      });
    }
  }

  const coverage = ratio(withLines, oddsGames.length);
  const checks = spreadChecked + totalChecked;
  const agreement = ratio(spreadAgree + totalAgree, checks);

  return {
    league,
    oddsApiGames: oddsGames.length,
    beyondEspnWindow: beyondWindow,
    espnGames: espnGames.length,
    matched: oddsGames.length - unmatched.length,
    espnWithLines: withLines,
    coverage,
    spread: { checked: spreadChecked, agree: spreadAgree, avgDiff: spreadChecked ? +(spreadDiffSum / spreadChecked).toFixed(2) : null },
    total: { checked: totalChecked, agree: totalAgree, avgDiff: totalChecked ? +(totalDiffSum / totalChecked).toFixed(2) : null },
    favorite: { checked: favChecked, agree: favAgree },
    agreement,
    readyToReplace: Boolean(
      oddsGames.length && coverage >= READY_COVERAGE && agreement !== null && agreement >= READY_AGREEMENT
    ),
    disagreements: rows.slice(0, 25),
    unmatched: unmatched.slice(0, 25),
  };
}

router.get("/compare", async (req, res, next) => {
  try {
    const sources = getComparisonSources();
    if (!sources.oddsApiConfigured) {
      return res.status(503).json({ success: false, error: "SPORTS_API_KEY is needed to compare against The Odds API" });
    }

    const wanted = req.query.league ? [String(req.query.league).toUpperCase()] : sources.leagues;
    const leagues = wanted.filter((l) => sources.leagues.includes(l));
    if (!leagues.length) return res.status(400).json({ success: false, error: "Unknown league" });

    const reports = [];
    for (const league of leagues) {
      const [odds, espn] = await Promise.allSettled([
        sources.fetchOdds(league),
        sources.espn.getGames({ league }),
      ]);
      if (odds.status === "rejected" || espn.status === "rejected") {
        reports.push({
          league,
          error: odds.status === "rejected" ? "Odds API unavailable" : "ESPN unavailable",
        });
        continue;
      }
      reports.push(compareLeague(league, odds.value, espn.value));
    }

    res.set("Cache-Control", "no-store");
    res.json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        rules: {
          spreadTolerance: SPREAD_TOLERANCE,
          totalTolerance: TOTAL_TOLERANCE,
          readyWhen: `ESPN has lines for ${READY_COVERAGE * 100}%+ of Odds API games and agrees on ${READY_AGREEMENT * 100}%+ of spread/total checks`,
        },
        leagues: reports,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
