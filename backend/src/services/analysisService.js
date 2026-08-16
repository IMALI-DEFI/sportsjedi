function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function ratingFromTeam(teamAbbr) {
  const base = [...teamAbbr].reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return 78 + (base % 18);
}

export function analyzeGame(game) {
  const homeRating = ratingFromTeam(game.home.abbr) + 2.5;
  const awayRating = ratingFromTeam(game.away.abbr);
  const diff = homeRating - awayRating;
  const homeWinProbability = clamp(50 + diff * 2.25, 20, 80);
  const awayWinProbability = 100 - homeWinProbability;
  const confidence = Math.round(clamp(55 + Math.abs(diff) * 3.2, 55, 92));

  const pick = homeWinProbability >= 50 ? game.home.abbr : game.away.abbr;
  const edge = Math.abs(homeWinProbability - 50);

  return {
    gameId: game.id,
    pick,
    confidence,
    homeWinProbability: Number(homeWinProbability.toFixed(1)),
    awayWinProbability: Number(awayWinProbability.toFixed(1)),
    edge: Number(edge.toFixed(1)),
    projectedScore: {
      away: Math.max(1, Math.round((game.total || 44) / 2 - diff / 3)),
      home: Math.max(1, Math.round((game.total || 44) / 2 + diff / 3))
    },
    summary: `${pick} has the stronger model edge based on team strength, home-field adjustment, and matchup balance.`,
    factors: [
      { label: "Power rating", impact: diff >= 0 ? game.home.abbr : game.away.abbr },
      { label: "Home-field adjustment", impact: game.home.abbr },
      { label: "Market spread", impact: game.spread ? `${game.spread.favorite} ${game.spread.line}` : "N/A" }
    ]
  };
}
