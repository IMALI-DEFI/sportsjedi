const SPORT_KEYS = {
  NFL: "americanfootball_nfl",
  NBA: "basketball_nba",
  MLB: "baseball_mlb",
};

const API_BASE =
  process.env.SPORTS_API_BASE ||
  "https://api.the-odds-api.com/v4";

const API_KEY =
  process.env.SPORTS_API_KEY || "";

const REGIONS =
  process.env.SPORTS_ODDS_REGIONS || "us";

const CACHE_MS =
  Number(process.env.SPORTS_CACHE_MS || 3600000);

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

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Sports API ${response.status}: ${body}`
    );
  }

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
      dateFormat: "iso",
    });

  const url =
    `${API_BASE}/sports/${sportKey}/odds?${params}`;

  const data =
    await fetchJson(url);

  return setCached(
    cacheKey,
    data.map(normalizeGame)
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

    const firstGames =
      games.slice(0, 12);

    const propMarkets = {
      NFL:
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

    return allProps;
  }
}

class MockSportsProvider {
  async getGames() {
    return [];
  }

  async getGame() {
    return null;
  }

  async getTeams() {
    return [];
  }

  async getPlayerProps() {
    return [];
  }
}

export function getSportsProvider() {
  if (
    process.env.SPORTS_PROVIDER ===
    "theoddsapi"
  ) {
    if (!API_KEY) {
      throw new Error(
        "SPORTS_API_KEY is missing"
      );
    }

    return new TheOddsApiProvider();
  }

  return new MockSportsProvider();
}
