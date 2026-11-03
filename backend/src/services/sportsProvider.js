
import {
  matchMlbGame,
} from "./gamecast/mlb.js";
import {
  games as mockGames,
  teams as mockTeams,
  playerProps as mockPlayerProps,
} from "../data/mockSports.js";
import {
  EspnProvider,
  findEspnMatch,
} from "./providers/espn.js";
import {
  recordError,
  recordFetch,
  recordFallback,
} from "./sourceStatus.js";

const SPORT_KEYS = {
  NFL: "americanfootball_nfl",
  NCAAF: "americanfootball_ncaaf",
  NBA: "basketball_nba",
  MLB: "baseball_mlb",
};

const API_BASE =
  process.env.SPORTS_API_BASE ||
  "https://api.the-odds-api.com/v4";

function deepestSportsbookLink(bookmaker, market, outcome) {
  return (
    outcome?.link ||
    market?.link ||
    bookmaker?.link ||
    null
  );
}

const API_KEY =
  process.env.SPORTS_API_KEY || "";

const REGIONS =
  process.env.SPORTS_ODDS_REGIONS || "us";

const CACHE_MS =
  Number(process.env.SPORTS_CACHE_MS || 3600000);

const cache = new Map();
const pendingRequests = new Map();

function getCached(key, maxAge = CACHE_MS) {
  const item = cache.get(key);

  if (!item) return null;

  if (Date.now() - item.time > maxAge) {
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

function leagueFromSportKey(key) {
  return (
    Object.entries(SPORT_KEYS)
      .find(([, value]) => value === key)?.[0] ||
    key
  );
}

function abbreviation(name = "") {
  const known = {
    "Philadelphia Eagles": "PHI",
    "Dallas Cowboys": "DAL",
    "Kansas City Chiefs": "KC",
    "Buffalo Bills": "BUF",
    "Baltimore Ravens": "BAL",
    "Detroit Lions": "DET",

    "Boston Celtics": "BOS",
    "New York Knicks": "NYK",
    "Los Angeles Lakers": "LAL",
    "Golden State Warriors": "GSW",
    "Denver Nuggets": "DEN",
    "Oklahoma City Thunder": "OKC",

    "New York Yankees": "NYY",
    "Baltimore Orioles": "BAL",
    "Los Angeles Dodgers": "LAD",
    "Boston Red Sox": "BOS",
    "Chicago Cubs": "CHC",
    "Atlanta Braves": "ATL",
  };

  if (known[name]) {
    return known[name];
  }

  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
}

function findMarket(bookmaker, key) {
  return bookmaker?.markets?.find(
    (market) => market.key === key
  );
}

function normalizeGame(event) {
  const bookmaker =
    event.bookmakers?.[0] || null;

  const spreadMarket =
    findMarket(bookmaker, "spreads");

  const totalMarket =
    findMarket(bookmaker, "totals");

  const moneylineMarket =
    findMarket(bookmaker, "h2h");

  const spreadOutcome =
    spreadMarket?.outcomes?.find(
      (outcome) =>
        typeof outcome.point === "number" &&
        outcome.point < 0
    ) ||
    spreadMarket?.outcomes?.[0];

  const totalOutcome =
    totalMarket?.outcomes?.find(
      (outcome) =>
        outcome.name === "Over"
    ) ||
    totalMarket?.outcomes?.[0];

  return {
    id: event.id,

    league:
      event.sport_title ||
      leagueFromSportKey(event.sport_key),

    sportKey: event.sport_key,

    status: "upcoming",

    startTime: event.commence_time,

    away: {
      name: event.away_team,
      abbr: abbreviation(event.away_team),
      record: "",
      score: 0,
    },

    home: {
      name: event.home_team,
      abbr: abbreviation(event.home_team),
      record: "",
      score: 0,
    },

    venue: "",

    spread: spreadOutcome
      ? {
          favorite:
            abbreviation(spreadOutcome.name),
          line:
            spreadOutcome.point ?? null,
        }
      : null,

    total:
      totalOutcome?.point ?? null,

    moneyline:
      moneylineMarket
        ? moneylineMarket.outcomes.map(
            (outcome) => ({
              team: outcome.name,
              abbr: abbreviation(outcome.name),
              price: outcome.price,
})
          )
        : [],

    bookmaker: bookmaker
      ? {
          key: bookmaker.key,
          title: bookmaker.title,
          lastUpdate: bookmaker.last_update,
        }
      : null,

    bookmakers: (event.bookmakers || []).map((book) => {
      const h2h = findMarket(book, "h2h");
      const spreads = findMarket(book, "spreads");
      const totals = findMarket(book, "totals");

      const favorite =
        spreads?.outcomes?.find(
          (outcome) =>
            typeof outcome.point === "number" &&
            outcome.point < 0
        ) || spreads?.outcomes?.[0];

      const total =
        totals?.outcomes?.find(
          (outcome) => outcome.name === "Over"
        ) || totals?.outcomes?.[0];

      return {
        key: book.key,
        title: book.title,
        lastUpdate: book.last_update,

        moneyline: (h2h?.outcomes || []).map((outcome) => ({
          team: outcome.name,
          abbr: abbreviation(outcome.name),
          price: outcome.price,
})),

        spread: favorite
          ? {
              favorite: abbreviation(favorite.name),
              line: favorite.point ?? null,
            }
          : null,

        total: total?.point ?? null,
      };
    }),
  };
}

// Reserve a small pool of remaining provider credits for important games.
const MIN_ODDS_CREDITS = Math.max(0, Number(process.env.SPORTS_MIN_CREDITS || 30));
let remainingOddsCredits = null;

async function fetchJson(url) {
  if (pendingRequests.has(url)) return pendingRequests.get(url);
  const request = fetchJsonUnshared(url).finally(() => pendingRequests.delete(url));
  pendingRequests.set(url, request);
  return request;
}

async function fetchJsonUnshared(url) {
  if (url.startsWith(API_BASE) && remainingOddsCredits !== null &&
      remainingOddsCredits <= MIN_ODDS_CREDITS) {
    const error = new Error("Odds API credit reserve reached; requests paused until the API service restarts or the quota is reset");
    recordError("oddsApi", error);
    throw error;
  }

  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    recordError("oddsApi", error);
    throw error;
  }

  if (url.startsWith(API_BASE)) {
    const remaining = Number(response.headers.get("x-requests-remaining"));
    if (response.headers.has("x-requests-remaining") && Number.isFinite(remaining)) {
      remainingOddsCredits = remaining;
    }
  }

  if (!response.ok) {
    const body = await response.text();

    const error = new Error(
      `Sports API ${response.status}: ${body.slice(0, 200)}`
    );
    error.upstreamStatus = response.status;
    recordError("oddsApi", error);
    throw error;
  }

  recordFetch("oddsApi", response.headers);

  return response.json();
}

async function fetchOddsForLeague(league) {
  const upper =
    String(league || "").toUpperCase();

  const sportKey =
    SPORT_KEYS[upper];

  if (!sportKey) {
    return [];
  }

  const cacheKey =
    `odds:${sportKey}`;

  const cached =
    getCached(cacheKey);

  if (cached) {
    return cached;
  }

  const params =
    new URLSearchParams({
      apiKey: API_KEY,
      regions: REGIONS,
      markets: "h2h,spreads,totals",
      oddsFormat: "american",
    includeLinks: "true",
    includeSids: "true",
      dateFormat: "iso",
    });

  const url =
    `${API_BASE}/sports/${sportKey}/odds?${params}`;

  const data =
    await fetchJson(url);

  let games =
    data.map(normalizeGame);

  /*
   * MLB GAME STATE
   *
   * The Odds API remains the wagering source.
   * MLB supplies authoritative game status,
   * score, and inning information.
   */
  if (upper === "MLB") {
    games =
      await Promise.all(
        games.map(async (game) => {
          try {
            const mlbGame =
              await matchMlbGame({
                homeTeam:
                  game.home?.name,

                awayTeam:
                  game.away?.name,

                startTime:
                  game.startTime,
              });

            if (!mlbGame) {
              return game;
            }

            return {
              ...game,

              status:
                mlbGame.status,

              gamePk:
                mlbGame.gamePk,

              detailedStatus:
                mlbGame.detailedStatus,

              abstractStatus:
                mlbGame.abstractStatus,

              inning:
                mlbGame.inning,

              inningState:
                mlbGame.inningState,

              inningOrdinal:
                mlbGame.inningOrdinal,

              away: {
                ...game.away,

                score:
                  mlbGame.score?.away ??
                  game.away?.score ??
                  0,
              },

              home: {
                ...game.home,

                score:
                  mlbGame.score?.home ??
                  game.home?.score ??
                  0,
              },
            };
          } catch (error) {
            console.error(
              "MLB game-state error:",
              game.id,
              error.message
            );

            return game;
          }
        })
      );
  }

  return setCached(
    cacheKey,
    games
  );
}

async function fetchAllGames() {
  const results =
    await Promise.allSettled(
      Object.keys(SPORT_KEYS).map(
        fetchOddsForLeague
      )
    );

  return results.flatMap((result) =>
    result.status === "fulfilled"
      ? result.value
      : []
  );
}

function normalizePlayerProps(
  response,
  league,
  game
) {
  const props = [];

  for (
    const bookmaker of
    response.bookmakers || []
  ) {
    for (
      const market of
      bookmaker.markets || []
    ) {
      const isPlayerMarket =
        market.key.startsWith("player_") ||
        market.key.startsWith("batter_") ||
        market.key.startsWith("pitcher_");

      if (!isPlayerMarket) {
        continue;
      }

      for (
        const outcome of
        market.outcomes || []
      ) {
        props.push({
          id:
            `${response.id}-${bookmaker.key}-${market.key}-${outcome.description || outcome.name}-${outcome.point || ""}`,

          eventId:
            response.id,

          league,

          matchup:
            game
              ? `${game.away.name} @ ${game.home.name}`
              : `${response.away_team || ""} @ ${response.home_team || ""}`,

          awayTeam:
            game?.away?.name ||
            response.away_team ||
            "",

          homeTeam:
            game?.home?.name ||
            response.home_team ||
            "",

          startTime:
            game?.startTime ||
            response.commence_time ||
            null,

          player:
            outcome.description ||
            outcome.name,

          team: "",

          market:
            market.key,

          line:
            outcome.point ?? null,

          pick:
            outcome.name,

          price:
            outcome.price,

          confidence: null,

          bookmaker:
            bookmaker.title,

          bookmakerKey:
            bookmaker.key,

          deeplink:
            deepestSportsbookLink(
              bookmaker,
              market,
              outcome
            ),

          sportsbookSid:
            outcome.sid ||
            market.sid ||
            bookmaker.sid ||
            null,
        });
      }
    }
  }

  return props;
}

class TheOddsApiProvider {
  async getGames({
    league,
  } = {}) {
    if (league) {
      return fetchOddsForLeague(
        league
      );
    }

    return fetchAllGames();
  }

  async getLiveGame(id) {
    const baseGame = await this.getGame(id);

    if (!baseGame) {
      return null;
    }

    const league =
      String(baseGame.league || "").toUpperCase();

    const sportKey = SPORT_KEYS[league];

    if (!sportKey) {
      return baseGame;
    }

    const cacheKey =
      `live-game:${sportKey}:${id}`;

    const cached =
      getCached(cacheKey, 15000);

    if (cached) {
      return cached;
    }

    const params =
      new URLSearchParams({
        apiKey: API_KEY,
        regions: REGIONS,
        markets: "h2h,spreads,totals",
        oddsFormat: "american",
        includeLinks: "true",
        includeSids: "true",
        dateFormat: "iso",
      });

    const url =
      `${API_BASE}/sports/${sportKey}/events/${id}/odds?${params}`;

    try {
      const response =
        await fetchJson(url);

      const liveGame =
        normalizeGame(response);

      liveGame.league =
        liveGame.league || league;

      return setCached(
        cacheKey,
        liveGame
      );
    } catch (error) {
      console.error(
        "Live game odds refresh error:",
        error.message
      );

      return baseGame;
    }
  }

  async getGame(id) {
    const games =
      await fetchAllGames();

    return (
      games.find(
        (game) => game.id === id
      ) || null
    );
  }

  async getTeams({
    league,
  } = {}) {
    const games =
      await this.getGames({
        league,
      });

    const map =
      new Map();

    for (const game of games) {
      for (const side of [
        game.home,
        game.away,
      ]) {
        if (
          !map.has(side.name)
        ) {
          map.set(side.name, {
            id:
              side.abbr.toLowerCase(),
            league: game.league,
            name: side.name,
            abbr: side.abbr,
            city: "",
            rating: null,
          });
        }
      }
    }

    return [...map.values()];
  }

  async getPlayerProps({
    league = "NFL",
  } = {}) {
    const upper =
      String(league).toUpperCase();

    const sportKey =
      SPORT_KEYS[upper];

    if (!sportKey) {
      return [];
    }

    const games =
      await fetchOddsForLeague(
        upper
      );

    // Player-prop endpoints can consume many free-tier credits.
    const maxPropGames = Math.max(0, Math.min(12,
      Number(process.env.SPORTS_MAX_PROP_GAMES || 2)));
    const firstGames = games.slice(0, maxPropGames);

    const propMarkets = {
      NFL:
        "player_pass_yds,player_rush_yds,player_reception_yds",
      NCAAF:
        "player_pass_yds,player_rush_yds,player_reception_yds",
      NBA:
        "player_points,player_rebounds,player_assists,player_threes",
      MLB:
        "batter_hits,batter_total_bases,batter_home_runs",
    };

    const markets =
      propMarkets[upper];

    if (!markets) {
      return [];
    }

    const allProps = [];

    for (const game of firstGames) {
      const cacheKey =
        `props:${sportKey}:${game.id}`;

      const cached =
        getCached(cacheKey);

      if (cached) {
        allProps.push(...cached);
        continue;
      }

      const params =
        new URLSearchParams({
          apiKey: API_KEY,
          regions: REGIONS,
          markets,
          oddsFormat: "american",
    includeLinks: "true",
    includeSids: "true",
        });

      const url =
        `${API_BASE}/sports/${sportKey}/events/${game.id}/odds?${params}`;

      try {
        const response =
          await fetchJson(url);

        const props =
          normalizePlayerProps(
            response,
            upper,
            game
          );

        setCached(
          cacheKey,
          props
        );

        allProps.push(
          ...props
        );
      } catch (error) {
        console.error(
          "Player props error:",
          error.message
        );
      }
    }

    // ------------------------------------------------------
    // SPORTSBOOK DEEP-LINK INDEX
    //
    // Group the exact same wager across books:
    // event + player + market + side + line.
    // ------------------------------------------------------
    const deepLinkIndex =
      new Map();

    const sportsbookAlias = {
      draftkings: "draftkings",
      fanduel: "fanduel",
      betmgm: "betmgm",
    };

    for (const prop of allProps) {
      const groupKey = [
        prop.eventId,
        prop.player,
        prop.market,
        prop.pick,
        prop.line ?? "",
      ].join("|");

      if (!deepLinkIndex.has(groupKey)) {
        deepLinkIndex.set(
          groupKey,
          {}
        );
      }

      const normalizedBookKey =
        sportsbookAlias[
          String(
            prop.bookmakerKey || ""
          ).toLowerCase()
        ];

      if (
        normalizedBookKey &&
        prop.deeplink
      ) {
        deepLinkIndex
          .get(groupKey)[normalizedBookKey] =
          prop.deeplink;
      }
    }

    for (const prop of allProps) {
      const groupKey = [
        prop.eventId,
        prop.player,
        prop.market,
        prop.pick,
        prop.line ?? "",
      ].join("|");

      prop.sportsbookDeepLinks =
        deepLinkIndex.get(groupKey) || {};
    }

    return allProps;
  }
}

/*
 * Offline provider for local development and tests (SPORTS_PROVIDER=mock).
 * Same method surface as TheOddsApiProvider, backed by data/mockSports.js.
 */
function byLeague(items, league) {
  if (!league) return items;
  const wanted = String(league).toUpperCase();
  return items.filter(
    (item) => String(item.league || "").toUpperCase() === wanted
  );
}

class MockSportsProvider {
  async getGames({ league } = {}) {
    return structuredClone(byLeague(mockGames, league));
  }

  async getGame(id) {
    const game = mockGames.find((g) => g.id === id);
    return game ? structuredClone(game) : null;
  }

  async getLiveGame(id) {
    return this.getGame(id);
  }

  async getTeams({ league } = {}) {
    return structuredClone(byLeague(mockTeams, league));
  }

  async getPlayerProps({ league } = {}) {
    return structuredClone(byLeague(mockPlayerProps, league));
  }
}

/*
 * Hybrid: The Odds API stays the wagering source, free ESPN data fills in
 * live status, scores, records and venues, and takes over a league
 * entirely when the Odds API fails (quota, outage, missing key).
 */
const LIVE_FIELDS = ["status", "period", "clock", "detailedStatus"];

function enrichWithEspn(game, espnGames) {
  const match = findEspnMatch(game, espnGames);
  if (!match) return game;

  const merged = {
    ...game,
    venue: game.venue || match.venue,
    espnEventId: match.espnEventId,
    away: {
      ...game.away,
      record: game.away?.record || match.away.record,
      score: match.away.score,
      logo: game.away?.logo || match.away.logo,
    },
    home: {
      ...game.home,
      record: game.home?.record || match.home.record,
      score: match.home.score,
      logo: game.home?.logo || match.home.logo,
    },
  };

  // MLB Stats API data (gamePk present) is authoritative for MLB state.
  if (!game.gamePk) {
    for (const field of LIVE_FIELDS) {
      if (match[field] !== undefined && match[field] !== null) {
        merged[field] = match[field];
      }
    }
  } else {
    merged.away.score = game.away?.score ?? match.away.score;
    merged.home.score = game.home?.score ?? match.home.score;
  }

  // Fill missing lines from ESPN, never overwrite Odds API lines.
  if (!merged.spread && match.spread) merged.spread = match.spread;
  if ((merged.total === null || merged.total === undefined) && match.total !== null) merged.total = match.total;
  if (!merged.moneyline?.length && match.moneyline.length) merged.moneyline = match.moneyline;

  return merged;
}

class HybridSportsProvider {
  constructor() {
    this.odds = API_KEY ? new TheOddsApiProvider() : null;
    this.espn = new EspnProvider();
  }

  async getLeague(league) {
    const espnGames = await this.espn
      .getGames({ league })
      .catch(() => []);

    if (!this.odds) return espnGames;

    try {
      const oddsGames = await fetchOddsForLeague(league);
      return oddsGames.map((game) => enrichWithEspn(game, espnGames));
    } catch (error) {
      recordFallback();
      console.error(
        `Odds API failed for ${league}, serving ESPN data:`,
        String(error.message).slice(0, 200)
      );
      return espnGames;
    }
  }

  async getGames({ league } = {}) {
    if (league) {
      const upper = String(league).toUpperCase();
      return SPORT_KEYS[upper] ? this.getLeague(upper) : [];
    }

    const results = await Promise.allSettled(
      Object.keys(SPORT_KEYS).map((key) => this.getLeague(key))
    );

    return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  }

  async getGame(id) {
    if (String(id).startsWith("espn-")) return this.espn.getGame(id);
    const games = await this.getGames();
    return games.find((game) => game.id === id) || null;
  }

  async getLiveGame(id) {
    if (String(id).startsWith("espn-") || !this.odds) {
      return this.espn.getLiveGame(id);
    }

    const game = await this.odds.getLiveGame(id);
    if (!game) return this.getGame(id);

    const espnGames = await this.espn
      .getGames({ league: game.league })
      .catch(() => []);

    return enrichWithEspn(game, espnGames);
  }

  async getTeams({ league } = {}) {
    const map = new Map();
    for (const game of await this.getGames({ league })) {
      for (const team of [game.home, game.away]) {
        if (!map.has(team.name)) {
          map.set(team.name, {
            id: String(team.abbr || "").toLowerCase(),
            league: game.league,
            name: team.name,
            abbr: team.abbr,
            city: "",
            rating: null,
            record: team.record || "",
          });
        }
      }
    }
    return [...map.values()];
  }

  async getPlayerProps(options = {}) {
    if (!this.odds) return [];
    try {
      return await this.odds.getPlayerProps(options);
    } catch (error) {
      recordFallback();
      return [];
    }
  }
}

/*
 * SPORTS_PROVIDER:
 *   theoddsapi - The Odds API only (unchanged behaviour)
 *   hybrid     - Odds API + free ESPN data and automatic fallback
 *   espn       - free ESPN data only, no key or quota
 *   mock       - offline sample data (default)
 */
export function getSportsProvider() {
  const mode = String(process.env.SPORTS_PROVIDER || "mock").toLowerCase();

  if (mode === "theoddsapi") {
    if (!API_KEY) {
      throw new Error(
        "SPORTS_API_KEY is missing"
      );
    }

    return new TheOddsApiProvider();
  }

  if (mode === "hybrid") return new HybridSportsProvider();
  if (mode === "espn") return new EspnProvider();

  return new MockSportsProvider();
}

// Direct access for the source comparison report.
export function getComparisonSources() {
  return {
    oddsApiConfigured: Boolean(API_KEY),
    fetchOdds: fetchOddsForLeague,
    espn: new EspnProvider(),
    leagues: Object.keys(SPORT_KEYS),
  };
}
