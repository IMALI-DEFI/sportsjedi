import {
  games,
  teams,
  playerProps,
} from "../data/mockSports.js";

class MockSportsProvider {
  async getGames({
    league,
  } = {}) {
    return league
      ? games.filter(
          (game) =>
            game.league.toLowerCase() ===
            league.toLowerCase()
        )
      : games;
  }

  async getGame(id) {
    return (
      games.find(
        (game) =>
          game.id === id
      ) || null
    );
  }

  async getTeams({
    league,
  } = {}) {
    if (!league) {
      return teams;
    }

    const abbreviations =
      new Set(
        games
          .filter(
            (game) =>
              game.league ===
              league.toUpperCase()
          )
          .flatMap(
            (game) => [
              game.away.abbr,
              game.home.abbr,
            ]
          )
      );

    return teams.filter(
      (team) =>
        abbreviations.has(
          team.abbr
        )
    );
  }

  async getPlayerProps({
    league,
  } = {}) {
    return league
      ? playerProps.filter(
          (prop) =>
            prop.league.toLowerCase() ===
            league.toLowerCase()
        )
      : playerProps;
  }
}

export function getSportsProvider() {
  return new MockSportsProvider();
}
