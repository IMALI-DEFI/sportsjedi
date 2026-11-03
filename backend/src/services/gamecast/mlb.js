/*
 * MLB game state + gamecast from the public MLB Stats API (no key needed).
 *
 * Consumers:
 *   - services/sportsProvider.js  -> matchMlbGame({ homeTeam, awayTeam, startTime })
 *   - routes/games.js             -> getMlbGamecast(gamePk)
 *
 * The Odds API stays the wagering source; MLB supplies authoritative
 * status, score and inning information.
 */

const MLB_API = "https://statsapi.mlb.com/api";
const SCHEDULE_CACHE_MS = 30000;
const FEED_CACHE_MS = 5000;
const REQUEST_TIMEOUT_MS = 8000;

const cache = new Map();

function getCached(key, ttl) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() - item.time > ttl) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setCached(key, data) {
  cache.set(key, { time: Date.now(), data });
  if (cache.size > 500) {
    cache.delete(cache.keys().next().value);
  }
  return data;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`MLB Stats API request failed (${response.status})`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Covers the Odds API vs MLB naming differences that actually occur.
const NAME_ALIASES = {
  oaklandathletics: "athletics",
  sacramentoathletics: "athletics",
  clevelandindians: "clevelandguardians",
};

function canonicalTeam(value) {
  const name = normalizeName(value);
  return NAME_ALIASES[name] || name;
}

function sameTeam(a, b) {
  const x = canonicalTeam(a);
  const y = canonicalTeam(b);
  if (!x || !y) return false;
  return x === y || x.endsWith(y) || y.endsWith(x);
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

/*
 * MLB schedules by US local date, while startTime is UTC. A 7:10pm PT
 * first pitch is the next UTC day, so check the UTC date and the day before.
 */
function candidateDates(startTime) {
  const start = new Date(startTime);
  if (Number.isNaN(start.getTime())) return [];
  const previous = new Date(start.getTime() - 24 * 60 * 60 * 1000);
  return [...new Set([isoDate(start), isoDate(previous)])];
}

export function mapMlbStatus(abstractState, detailedState = "") {
  const detail = String(detailedState).toLowerCase();
  if (/postponed|cancelled|canceled|suspended/.test(detail)) return "postponed";
  if (abstractState === "Final") return "final";
  if (abstractState === "Live") return "live";
  return "upcoming";
}

async function getSchedule(date) {
  const key = `schedule:${date}`;
  const cached = getCached(key, SCHEDULE_CACHE_MS);
  if (cached) return cached;

  const data = await fetchJson(
    `${MLB_API}/v1/schedule?sportId=1&date=${date}&hydrate=linescore,team`
  );

  const games = (data.dates || []).flatMap((day) => day.games || []);
  return setCached(key, games);
}

function summarizeScheduleGame(game) {
  const linescore = game.linescore || {};
  const abstractStatus = game.status?.abstractGameState || null;
  const detailedStatus = game.status?.detailedState || null;

  return {
    gamePk: game.gamePk,
    gameDate: game.gameDate,
    status: mapMlbStatus(abstractStatus, detailedStatus),
    detailedStatus,
    abstractStatus,
    inning: linescore.currentInning ?? null,
    inningState: linescore.inningState ?? null,
    inningOrdinal: linescore.currentInningOrdinal ?? null,
    score: {
      away: game.teams?.away?.score ?? linescore.teams?.away?.runs ?? null,
      home: game.teams?.home?.score ?? linescore.teams?.home?.runs ?? null,
    },
  };
}

/*
 * Find the MLB game for an Odds API matchup. Returns null when there is
 * no confident match, so the caller keeps its Odds API data.
 * Doubleheaders: picks the game whose first pitch is closest to startTime.
 */
export async function matchMlbGame({ homeTeam, awayTeam, startTime }) {
  if (!homeTeam || !awayTeam || !startTime) return null;

  const start = new Date(startTime).getTime();
  const candidates = [];

  for (const date of candidateDates(startTime)) {
    const games = await getSchedule(date);
    for (const game of games) {
      if (
        sameTeam(game.teams?.home?.team?.name, homeTeam) &&
        sameTeam(game.teams?.away?.team?.name, awayTeam)
      ) {
        candidates.push(game);
      }
    }
  }

  if (!candidates.length) return null;

  const unique = [...new Map(candidates.map((g) => [g.gamePk, g])).values()];
  unique.sort(
    (a, b) =>
      Math.abs(new Date(a.gameDate).getTime() - start) -
      Math.abs(new Date(b.gameDate).getTime() - start)
  );

  const best = unique[0];
  // More than 18h away from the listed start is a different game.
  if (Math.abs(new Date(best.gameDate).getTime() - start) > 18 * 60 * 60 * 1000) {
    return null;
  }

  return summarizeScheduleGame(best);
}

export async function getMlbGamecast(gamePk) {
  const id = Number(gamePk);
  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error("Invalid MLB gamePk");
    error.status = 400;
    throw error;
  }

  const key = `feed:${id}`;
  const cached = getCached(key, FEED_CACHE_MS);
  if (cached) return cached;

  const feed = await fetchJson(`${MLB_API}/v1.1/game/${id}/feed/live`);

  const gameData = feed.gameData || {};
  const linescore = feed.liveData?.linescore || {};
  const currentPlay = feed.liveData?.plays?.currentPlay || null;
  const abstractStatus = gameData.status?.abstractGameState || null;
  const detailedStatus = gameData.status?.detailedState || null;
  const offense = linescore.offense || {};
  const halfInning = linescore.inningState || linescore.inningHalf || null;

  return setCached(key, {
    league: "MLB",
    providerEventId: String(id),
    gamePk: id,
    status: mapMlbStatus(abstractStatus, detailedStatus),
    detailedStatus,

    teams: {
      away: gameData.teams?.away?.name || "",
      home: gameData.teams?.home?.name || "",
    },

    score: {
      away: linescore.teams?.away?.runs ?? null,
      home: linescore.teams?.home?.runs ?? null,
    },

    // Same keys the NBA/NFL gamecasts expose, so the UI can stay generic.
    period: linescore.currentInning ?? null,
    clock: linescore.currentInningOrdinal
      ? `${halfInning || ""} ${linescore.currentInningOrdinal}`.trim()
      : null,
    possession: offense.team?.name || null,

    inning: linescore.currentInning ?? null,
    inningState: halfInning,
    inningOrdinal: linescore.currentInningOrdinal ?? null,
    outs: linescore.outs ?? null,
    count: {
      balls: linescore.balls ?? null,
      strikes: linescore.strikes ?? null,
    },
    bases: {
      first: Boolean(offense.first),
      second: Boolean(offense.second),
      third: Boolean(offense.third),
    },
    batter: offense.batter?.fullName || null,
    pitcher: linescore.defense?.pitcher?.fullName || null,

    latestPlay: currentPlay?.result?.description || null,

    updatedAt: new Date().toISOString(),
  });
}
