const ESPN_SCOREBOARD =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";

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
    throw new Error(
      `ESPN NBA request failed (${response.status})`
    );
  }

  return response.json();
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function espnDate(startTime) {
  const date = new Date(startTime);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
}

function getCompetitor(event, side) {
  return event?.competitions?.[0]?.competitors?.find(
    (team) => team.homeAway === side
  );
}

function findMatchingEvent(events, game) {
  const wantedHome =
    normalizeName(game.home?.name);

  const wantedAway =
    normalizeName(game.away?.name);

  return events.find((event) => {
    const home =
      getCompetitor(event, "home");

    const away =
      getCompetitor(event, "away");

    return (
      normalizeName(home?.team?.displayName) ===
        wantedHome &&
      normalizeName(away?.team?.displayName) ===
        wantedAway
    );
  });
}

function mapStatus(event) {
  const state =
    event?.status?.type?.state;

  if (state === "in") return "live";
  if (state === "post") return "final";

  return "upcoming";
}

export async function getNbaGamecast(game) {
  const key = `nba:${game.id}`;
  const cached = getCached(key);

  if (cached) return cached;

  const date = espnDate(game.startTime);

  if (!date) {
    throw new Error(
      `Invalid NBA startTime: ${game.startTime}`
    );
  }

  const data =
    await fetchJson(
      `${ESPN_SCOREBOARD}?dates=${date}`
    );

  const event =
    findMatchingEvent(
      data.events || [],
      game
    );

  if (!event) {
    return setCached(key, {
      league: "NBA",
      eventId: game.id,
      providerEventId: null,
      status: game.status || "upcoming",

      teams: {
        away: game.away?.name || "",
        home: game.home?.name || "",
      },

      score: {
        away: game.away?.score ?? null,
        home: game.home?.score ?? null,
      },

      period: game.period ?? null,
      clock: game.clock ?? null,

      possession: null,
      latestPlay: null,

      updatedAt:
        new Date().toISOString(),
    });
  }

  const away =
    getCompetitor(event, "away");

  const home =
    getCompetitor(event, "home");

  return setCached(key, {
    league: "NBA",

    eventId: game.id,
    providerEventId: event.id,

    status: mapStatus(event),

    detailedStatus:
      event.status?.type?.description ||
      null,

    teams: {
      away:
        away?.team?.displayName ||
        game.away?.name ||
        "",

      home:
        home?.team?.displayName ||
        game.home?.name ||
        "",
    },

    score: {
      away:
        Number(away?.score ?? 0),

      home:
        Number(home?.score ?? 0),
    },

    period:
      event.status?.period ?? null,

    clock:
      event.status?.displayClock ??
      null,

    possession: null,
    latestPlay: null,

    updatedAt:
      new Date().toISOString(),
  });
}
