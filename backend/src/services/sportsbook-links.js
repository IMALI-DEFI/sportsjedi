const SUPPORTED_BOOKS = {
  draftkings: {
    id: "DRAFTKINGS",
    name: "DraftKings",
  },
  fanduel: {
    id: "FANDUEL",
    name: "FanDuel",
  },
  betmgm: {
    id: "MGM",
    name: "BetMGM",
  },
};

function buildFallbackUrl(book) {
  const urls = {
    draftkings: "https://sportsbook.draftkings.com/",
    fanduel: "https://sportsbook.fanduel.com/",
    betmgm: "https://sports.betmgm.com/",
  };

  return urls[book] || null;
}

export function buildSportsbookLinks(selection = {}) {
  return Object.entries(SUPPORTED_BOOKS).map(
    ([key, book]) => ({
      key,
      provider: book.id,
      name: book.name,

      /*
       * This will become the MetaBet ExpressLink
       * once credentials / endpoint configuration
       * are installed.
       */
      deeplink:
      selection?.sportsbookDeepLinks?.[key] ||
      null,

      fallbackUrl: buildFallbackUrl(key),

      available: true,

      selection: {
        league: selection.league || null,
        eventId: selection.eventId || null,
        matchup: selection.matchup || null,
        player: selection.player || null,
        market: selection.market || null,
        pick: selection.pick || null,
        line: selection.line ?? null,
      },
    })
  );
}

export { SUPPORTED_BOOKS };
