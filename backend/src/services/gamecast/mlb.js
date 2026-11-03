const MLB_API =
  "https://statsapi.mlb.com/api/v1";

const CACHE_MS = 5000;
const cache = new Map();

function getCached(key) {
  const item = cache.get(key);

  if (!item) return null;

  if (Date.now() - item.time > CACHE_MS) {
    cache.delete(key);
    return null;
  }

  return item.data;
}

function setCached(key, data) {
  cache.set(key, {
    time: Date.now(),
    data,
  });

  return data;
}

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `MLB API ${response.status}: ${body}`
    );
  }

  return response.json();
}

function normalizeStatus(status = {}) {
  const abstract =
    String(
      status.abstractGameState || ""
    ).toLowerCase();

  const detailed =
    String(
      status.detailedState || ""
    ).toLowerCase();

  if (
    abstract === "live" ||
    detailed.includes("in progress") ||
    detailed.includes("manager challenge")
  ) {
    return "live";
  }

  if (
    abstract === "final" ||
    detailed.includes("final") ||
    detailed.includes("completed")
  ) {
    return "final";
  }

  if (
    detailed.includes("postponed") ||
    detailed.includes("cancelled") ||
    detailed.includes("canceled")
  ) {
    return "postponed";
  }

  return "upcoming";
}

function normalizeScheduleGame(game) {
  return {
    gamePk: game.gamePk,

    gameDate:
      game.gameDate || null,

    status:
      normalizeStatus(game.status),

    detailedStatus:
      game.status?.detailedState ||
      null,

    abstractStatus:
      game.status?.abstractGameState ||
      null,

    awayTeam:
      game.teams?.away?.team?.name ||
      "",

    homeTeam:
      game.teams?.home?.team?.name ||
      "",

    score: {
      away:
        game.teams?.away?.score ??
        null,

      home:
        game.teams?.home?.score ??
        null,
    },

    inning:
      game.linescore?.currentInning ??
      null,

    inningState:
      game.linescore?.inningState ||
      null,

    inningOrdinal:
      game.linescore?.currentInningOrdinal ||
      null,
  };
}

export async function getMlbSchedule(
  date = new Date()
) {
  const dateString =
    date instanceof Date
      ? date.toISOString().slice(0, 10)
      : String(date).slice(0, 10);

  const cacheKey =
    `mlb:schedule:${dateString}`;

  const cached =
    getCached(cacheKey);

  if (cached) {
    return cached;
  }

  const params =
    new URLSearchParams({
      sportId: "1",
      date: dateString,
      hydrate: "linescore",
    });

  const response =
    await fetchJson(
      `${MLB_API}/schedule?${params}`
    );

  const games =
    (response.dates || [])
      .flatMap(
        item => item.games || []
      )
      .map(normalizeScheduleGame);

  return setCached(
    cacheKey,
    games
  );
}

function teamMatch(a, b) {
  return (
    String(a || "")
      .trim()
      .toLowerCase() ===
    String(b || "")
      .trim()
      .toLowerCase()
  );
}

export async function matchMlbGame({
  homeTeam,
  awayTeam,
  startTime,
}) {
  if (
    !homeTeam ||
    !awayTeam ||
    !startTime
  ) {
    return null;
  }

  const start =
    new Date(startTime);

  if (
    Number.isNaN(
      start.getTime()
    )
  ) {
    return null;
  }

  /*
   * Query the UTC game date plus adjacent
   * dates so late-night games are safe.
   */
  const dates = [
    new Date(
      start.getTime() -
      86400000
    ),
    start,
    new Date(
      start.getTime() +
      86400000
    ),
  ];

  const schedules =
    await Promise.all(
      dates.map(
        date =>
          getMlbSchedule(date)
      )
    );

  const candidates =
    schedules
      .flat()
      .filter(
        game =>
          teamMatch(
            game.homeTeam,
            homeTeam
          ) &&
          teamMatch(
            game.awayTeam,
            awayTeam
          )
      );

  if (!candidates.length) {
    return null;
  }

  candidates.sort(
    (a, b) =>
      Math.abs(
        new Date(a.gameDate).getTime() -
        start.getTime()
      ) -
      Math.abs(
        new Date(b.gameDate).getTime() -
        start.getTime()
      )
  );

  const match =
    candidates[0];

  /*
   * Protect against accidentally matching
   * a different game between the same teams.
   */
  const difference =
    Math.abs(
      new Date(
        match.gameDate
      ).getTime() -
      start.getTime()
    );

  if (
    difference >
    6 * 60 * 60 * 1000
  ) {
    return null;
  }

  return match;
}

/*
 * Detailed MLB Gamecast
 *
 * Used for Sports Jedi's 2D live-game display.
 * This does NOT modify betting markets.
 */
export async function getMlbGamecast(gamePk) {
  if (!gamePk) {
    return null;
  }

  const data = await fetchJson(
    `${MLB_API.replace(
      "/api/v1",
      "/api/v1.1"
    )}/game/${gamePk}/feed/live`
  );

  const gameData =
    data?.gameData || {};

  const liveData =
    data?.liveData || {};

  const linescore =
    liveData?.linescore || {};

  const currentPlay =
    liveData?.plays?.currentPlay || null;

  const status =
    normalizeStatus(
      gameData?.status || {}
    );

  const runners =
    currentPlay?.runners || [];

  const occupied = base =>
    runners.some(
      runner =>
        runner?.movement?.end === base &&
        runner?.movement?.isOut !== true
    );

  return {
    league: "MLB",

    gamePk:
      data?.gamePk ||
      Number(gamePk),

    status,

    detailedStatus:
      gameData?.status?.detailedState ||
      null,

    abstractStatus:
      gameData?.status?.abstractGameState ||
      null,

    teams: {
      away:
        gameData?.teams?.away?.name ||
        null,

      home:
        gameData?.teams?.home?.name ||
        null,
    },

    score: {
      away:
        linescore?.teams?.away?.runs ??
        null,

      home:
        linescore?.teams?.home?.runs ??
        null,
    },

    inning:
      linescore?.currentInning ??
      null,

    inningOrdinal:
      linescore?.currentInningOrdinal ||
      null,

    inningState:
      linescore?.inningState ||
      null,

    count: {
      balls:
        currentPlay?.count?.balls ??
        null,

      strikes:
        currentPlay?.count?.strikes ??
        null,

      outs:
        currentPlay?.count?.outs ??
        linescore?.outs ??
        null,
    },

    bases: {
      first: occupied("1B"),
      second: occupied("2B"),
      third: occupied("3B"),
    },

    matchup: {
      batter:
        currentPlay?.matchup
          ?.batter?.fullName ||
        null,

      pitcher:
        currentPlay?.matchup
          ?.pitcher?.fullName ||
        null,

      battingSide:
        currentPlay?.about?.halfInning ||
        null,
    },

    latestPlay: currentPlay
      ? {
          description:
            currentPlay?.result
              ?.description ||
            null,

          event:
            currentPlay?.result
              ?.event ||
            null,

          eventType:
            currentPlay?.result
              ?.eventType ||
            null,

          complete:
            currentPlay?.about
              ?.isComplete ??
            false,
        }
      : null,

    playCount:
      Array.isArray(
        liveData?.plays?.allPlays
      )
        ? liveData.plays.allPlays.length
        : 0,

    updatedAt:
      new Date().toISOString(),
  };
}
