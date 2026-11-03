/*
 * Free data source: ESPN public scoreboards.
 *
 * Gives games, live status/scores, team records, venues and (for games
 * close to start) DraftKings spread/total/moneyline. No key, no quota.
 * Output uses the same game shape as TheOddsApiProvider so the frontend
 * and analysisService need no changes.
 */
import { recordError, recordFetch } from "../sourceStatus.js";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";
const CACHE_MS = Number(process.env.ESPN_CACHE_MS || 30000);
const TIMEOUT_MS = 8000;

export const ESPN_LEAGUES = {
  NFL: { path: "football/nfl", sportKey: "americanfootball_nfl" },
  NCAAF: { path: "football/college-football", sportKey: "americanfootball_ncaaf", params: { groups: "80" } },
  NBA: { path: "basketball/nba", sportKey: "basketball_nba" },
  MLB: { path: "baseball/mlb", sportKey: "baseball_mlb" },
};

const cache = new Map();

function compactDate(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

const DAY_MS = 24 * 60 * 60 * 1000;
const FUTURE_CACHE_MS = Number(process.env.ESPN_FUTURE_CACHE_MS || 300000);
const WINDOW_DAYS = Number(process.env.ESPN_WINDOW_DAYS || 9);

// ESPN scoreboards take one date per call. Yesterday (late games/finals)
// through the next WINDOW_DAYS-1 days; near days refresh fastest.
export function dateWindow(now = new Date()) {
  const days = [];
  for (let i = -1; i < WINDOW_DAYS - 1; i++) {
    days.push({ date: compactDate(new Date(now.getTime() + i * DAY_MS)), ttl: i <= 0 ? CACHE_MS : FUTURE_CACHE_MS });
  }
  return days;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`ESPN ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(/^[ou]/i, "").replace(/^\+/, ""));
  return Number.isFinite(n) ? n : null;
}

function mapStatus(status) {
  const name = status?.type?.name || "";
  if (/POSTPONED|CANCELED|CANCELLED|SUSPENDED/.test(name)) return "postponed";
  const state = status?.type?.state;
  if (state === "in") return "live";
  if (state === "post") return "final";
  return "upcoming";
}

function slug(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function side(competitor) {
  const team = competitor?.team || {};
  return {
    name: team.displayName || team.name || "",
    abbr: team.abbreviation || "",
    record: competitor?.records?.[0]?.summary || "",
    score: toNumber(competitor?.score) ?? 0,
    logo: team.logo || null,
  };
}

function lineFor(market, key) {
  return market?.[key]?.close || market?.[key]?.open || null;
}

export function normalizeEspnEvent(event, league) {
  const comp = event?.competitions?.[0];
  if (!comp) return null;

  const competitors = comp.competitors || [];
  const homeRaw = competitors.find((c) => c.homeAway === "home");
  const awayRaw = competitors.find((c) => c.homeAway === "away");
  if (!homeRaw || !awayRaw) return null;

  const home = side(homeRaw);
  const away = side(awayRaw);
  const odds = comp.odds?.[0] || null;

  let spread = null;
  let total = null;
  let moneyline = [];

  if (odds) {
    const homeLine = toNumber(lineFor(odds.pointSpread, "home")?.line) ?? toNumber(odds.spread);
    const awayLine = toNumber(lineFor(odds.pointSpread, "away")?.line) ?? (homeLine === null ? null : -homeLine);

    if (homeLine !== null) {
      const homeFavored = homeLine < 0 || (homeLine === 0 && odds.homeTeamOdds?.favorite !== false);
      spread = homeFavored
        ? { favorite: home.abbr, line: homeLine }
        : { favorite: away.abbr, line: awayLine };
    }

    total = toNumber(odds.overUnder) ?? toNumber(lineFor(odds.total, "over")?.line);

    const awayMl = toNumber(lineFor(odds.moneyline, "away")?.odds);
    const homeMl = toNumber(lineFor(odds.moneyline, "home")?.odds);
    moneyline = [
      awayMl !== null && { team: away.name, abbr: away.abbr, price: awayMl },
      homeMl !== null && { team: home.name, abbr: home.abbr, price: homeMl },
    ].filter(Boolean);
  }

  const book = odds?.provider
    ? { key: slug(odds.provider.name), title: odds.provider.displayName || odds.provider.name, lastUpdate: null }
    : null;

  return {
    id: `espn-${league.toLowerCase()}-${event.id}`,
    league,
    sportKey: ESPN_LEAGUES[league].sportKey,
    status: mapStatus(event.status),
    startTime: event.date ? new Date(event.date).toISOString() : null,
    away,
    home,
    venue: comp.venue?.fullName || "",
    spread,
    total,
    moneyline,
    bookmaker: book,
    bookmakers: book ? [{ ...book, moneyline, spread, total }] : [],
    period: event.status?.period ?? null,
    clock: event.status?.displayClock ?? null,
    detailedStatus: event.status?.type?.description || null,
    espnEventId: event.id,
    source: "espn",
  };
}

async function fetchEspnDay(league, config, date, ttl) {
  const key = `espn:${league}:${date}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.time < ttl) return hit.data;

  const params = new URLSearchParams({ dates: date, limit: "300", ...(config.params || {}) });
  try {
    const data = await fetchJson(`${ESPN_BASE}/${config.path}/scoreboard?${params}`);
    recordFetch("espn");
    const games = (data.events || []).map((e) => normalizeEspnEvent(e, league)).filter(Boolean);
    cache.set(key, { time: Date.now(), data: games });
    if (cache.size > 200) cache.delete(cache.keys().next().value);
    return games;
  } catch (error) {
    recordError("espn", error);
    if (hit) return hit.data; // serve stale rather than nothing
    throw error;
  }
}

export async function fetchEspnLeague(league) {
  const upper = String(league || "").toUpperCase();
  const config = ESPN_LEAGUES[upper];
  if (!config) return [];

  const results = await Promise.allSettled(
    dateWindow().map(({ date, ttl }) => fetchEspnDay(upper, config, date, ttl))
  );
  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length === results.length) throw failed[0].reason;

  // A game can appear on two dates (UTC vs US day); keep one copy.
  const byId = new Map();
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const game of r.value) byId.set(game.id, game);
  }
  return [...byId.values()].sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
}

/* ---------- matching ESPN games to Odds API games ---------- */

// Odds API name -> ESPN name, where the two genuinely differ.
const ALIASES = {
  laclippers: "losangelesclippers",
  lalakers: "losangeleslakers",
  umassminutemen: "massachusettsminutemen",
  uconnhuskies: "connecticuthuskies",
  utsaroadrunners: "texassanantonioroadrunners",
  ulmonroewarhawks: "louisianamonroewarhawks",
};

function canonical(name) {
  const n = String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return ALIASES[n] || n;
}

function mascot(name) {
  const words = String(name || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim().split(/\s+/);
  return words[words.length - 1] || "";
}

export function sameTeamName(a, b) {
  const x = canonical(a);
  const y = canonical(b);
  if (!x || !y) return false;
  if (x === y) return true;
  // "Ohio State Buckeyes" vs "Ohio St Buckeyes": same mascot and same first letters.
  return mascot(a) === mascot(b) && x.slice(0, 3) === y.slice(0, 3);
}

const MATCH_WINDOW_MS = 6 * 60 * 60 * 1000;

export function findEspnMatch(game, espnGames) {
  const start = new Date(game.startTime).getTime();
  let best = null;
  let bestGap = Infinity;
  for (const candidate of espnGames) {
    if (!sameTeamName(candidate.home.name, game.home?.name)) continue;
    if (!sameTeamName(candidate.away.name, game.away?.name)) continue;
    const gap = Math.abs(new Date(candidate.startTime).getTime() - start);
    if (Number.isFinite(gap) && gap <= MATCH_WINDOW_MS && gap < bestGap) {
      best = candidate;
      bestGap = gap;
    }
  }
  return best;
}

/* ---------- provider ---------- */

export class EspnProvider {
  async getGames({ league } = {}) {
    if (league) return fetchEspnLeague(league);
    const results = await Promise.allSettled(Object.keys(ESPN_LEAGUES).map(fetchEspnLeague));
    return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  }

  async getGame(id) {
    const match = /^espn-([a-z]+)-/.exec(String(id));
    const games = match ? await fetchEspnLeague(match[1]) : await this.getGames();
    return games.find((g) => g.id === id) || null;
  }

  async getLiveGame(id) {
    return this.getGame(id);
  }

  async getTeams({ league } = {}) {
    const map = new Map();
    for (const game of await this.getGames({ league })) {
      for (const team of [game.home, game.away]) {
        if (!map.has(team.name)) {
          map.set(team.name, {
            id: team.abbr.toLowerCase(),
            league: game.league,
            name: team.name,
            abbr: team.abbr,
            city: "",
            rating: null,
            record: team.record,
            logo: team.logo,
          });
        }
      }
    }
    return [...map.values()];
  }

  // ESPN scoreboards carry no player props.
  async getPlayerProps() {
    return [];
  }
}
