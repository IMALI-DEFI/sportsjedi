const ESPN_SCOREBOARD =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

const CACHE_MS = 5000;
const cache = new Map();

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "SportsJedi/1.0",
    },
  });

  if (!res.ok) {
    throw new Error(
      `NFL gamecast request failed (${res.status})`
    );
  }

  return res.json();
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizeStatus(status) {
  const state =
    status?.type?.state;

  if (status?.type?.completed) {
    return "final";
  }

  if (state === "in") {
    return "live";
  }

  return "upcoming";
}

function competitor(
  competition,
  side
) {
  return competition?.competitors?.find(
    (item) =>
      item.homeAway === side
  );
}

function matchesTeam(
  competitorItem,
  wanted
) {
  const wantedName =
    normalizeName(wanted);

  const candidates = [
    competitorItem?.team?.displayName,
    competitorItem?.team?.shortDisplayName,
    competitorItem?.team?.name,
    competitorItem?.team?.abbreviation,
  ]
    .filter(Boolean)
    .map(normalizeName);

  return candidates.some(
    (candidate) =>
      candidate === wantedName ||
      candidate.endsWith(wantedName) ||
      wantedName.endsWith(candidate)
  );
}

async function findEspnGame(game) {
  const data =
    await fetchJson(ESPN_SCOREBOARD);

  const wantedStart =
    new Date(game.startTime).getTime();

  let best = null;
  let bestDelta = Infinity;

  for (const event of data.events || []) {
    const competition =
      event.competitions?.[0];

    if (!competition) continue;

    const home =
      competitor(
        competition,
        "home"
      );

    const away =
      competitor(
        competition,
        "away"
      );

    if (
      !matchesTeam(
        home,
        game.home?.name
      ) ||
      !matchesTeam(
        away,
        game.away?.name
      )
    ) {
      continue;
    }

    const eventTime =
      new Date(
        event.date
      ).getTime();

    const delta =
      Math.abs(
        eventTime - wantedStart
      );

    if (delta < bestDelta) {
      best = {
        event,
        competition,
        home,
        away,
      };

      bestDelta = delta;
    }
  }

  // Prevent accidental matching to
  // a different week's game.
  if (
    !best ||
    bestDelta >
      12 * 60 * 60 * 1000
  ) {
    return null;
  }

  return best;
}

function latestPlayFrom(
  competition
) {
  return (
    competition?.situation?.lastPlay?.text ||
    competition?.details?.[
      competition.details.length - 1
    ]?.text ||
    null
  );
}

export async function getNflGamecast(
  game
) {
  const key =
    `nfl:${game.id}`;

  const cached =
    cache.get(key);

  if (
    cached &&
    Date.now() - cached.time <
      CACHE_MS
  ) {
    return cached.data;
  }

  const match =
    await findEspnGame(game);

  if (!match) {
    return {
      league: "NFL",
      eventId: game.id,
      status:
        game.status ||
        "upcoming",

      teams: {
        away:
          game.away?.name || "",
        home:
          game.home?.name || "",
      },

      score: {
        away:
          game.away?.score ??
          null,
        home:
          game.home?.score ??
          null,
      },

      period: null,
      clock: null,
      possession: null,
      down: null,
      distance: null,
      yardLine: null,
      latestPlay: null,

      updatedAt:
        new Date().toISOString(),
    };
  }

  const {
    event,
    competition,
    home,
    away,
  } = match;

  const situation =
    competition.situation || {};

  const possessionId =
    String(
      situation.possession || ""
    );

  let possession = null;

  if (
    possessionId &&
    String(home?.id) ===
      possessionId
  ) {
    possession =
      home?.team?.displayName;
  } else if (
    possessionId &&
    String(away?.id) ===
      possessionId
  ) {
    possession =
      away?.team?.displayName;
  }

  const data = {
    league: "NFL",
    eventId: game.id,

    providerEventId:
      event.id,

    status:
      normalizeStatus(
        event.status
      ),

    detailedStatus:
      event.status?.type
        ?.description ||
      null,

    teams: {
      away:
        away?.team
          ?.displayName ||
        game.away?.name ||
        "",

      home:
        home?.team
          ?.displayName ||
        game.home?.name ||
        "",
    },

    score: {
      away:
        away?.score != null
          ? Number(away.score)
          : null,

      home:
        home?.score != null
          ? Number(home.score)
          : null,
    },

    period:
      event.status?.period ??
      null,

    clock:
      event.status
        ?.displayClock ??
      null,

    possession,

    down:
      situation.down ??
      null,

    distance:
      situation.distance ??
      null,

    yardLine:
      situation.yardLine ??
      null,

    latestPlay:
      latestPlayFrom(
        competition
      ),

    updatedAt:
      new Date().toISOString(),
  };

  cache.set(key, {
    time: Date.now(),
    data,
  });

  return data;
}
