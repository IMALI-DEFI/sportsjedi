import { games, teams } from "../data/mockSports.js";

class MockSportsProvider {
  async getGames({ league } = {}) {
    return league ? games.filter(g => g.league.toLowerCase() === league.toLowerCase()) : games;
  }

  async getGame(id) {
    return games.find(g => g.id === id) || null;
  }

  async getTeams({ league } = {}) {
    return league ? teams.filter(t => t.league.toLowerCase() === league.toLowerCase()) : teams;
  }
}

export function getSportsProvider() {
  const provider = (process.env.SPORTS_PROVIDER || "mock").toLowerCase();
  switch (provider) {
    case "mock":
    default:
      return new MockSportsProvider();
  }
}
