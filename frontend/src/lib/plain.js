// Plain-English display helpers. Display only: never changes API data.

const TWO_WORD = [
  "red sox", "white sox", "blue jays", "trail blazers", "crimson tide", "fighting irish", "tar heels",
  "nittany lions", "blue devils", "golden gophers", "red raiders", "sun devils", "yellow jackets",
  "demon deacons", "scarlet knights", "golden bears", "mean green", "horned frogs", "wolf pack",
  "golden eagles", "fighting illini", "rainbow warriors", "black knights", "red wolves", "green wave",
  "golden flashes", "golden hurricane", "blue hens", "thundering herd", "black bears", "golden lions",
];

// "Washington Commanders" -> "Commanders", "Boston Red Sox" -> "Red Sox"
export function teamShort(team) {
  const name = String(team?.name || team || "").trim();
  if (!name) return team?.abbr || "Team";
  const lower = name.toLowerCase();
  const two = TWO_WORD.find((n) => lower.endsWith(n));
  if (two) return name.slice(name.length - two.length);
  const parts = name.split(/\s+/);
  return parts[parts.length - 1];
}

// The API marks picks/favorites with its own short code; map it back to a team.
export function teamForCode(game, code) {
  if (!game || !code) return null;
  const c = String(code).toUpperCase();
  if (String(game.away?.abbr || "").toUpperCase() === c) return game.away;
  if (String(game.home?.abbr || "").toUpperCase() === c) return game.home;
  return null;
}
export function pickName(game, code) {
  const t = teamForCode(game, code);
  return t ? teamShort(t) : code || "";
}

// "Sun Nov 1 · 8:20 PM ET"
export function friendlyTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Time TBA";
  const day = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/New_York" }).format(d).replace(",", "");
  const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }).format(d);
  return `${day} · ${time} ET`;
}

// One friendly sentence instead of "no-vig implied probability" wording.
export function plainSummary(game, analysis) {
  if (!analysis || !analysis.pick) return "No strong lean on this game yet. Check back closer to game time.";
  const team = teamForCode(game, analysis.pick);
  const name = team ? teamShort(team) : analysis.pick;
  let prob = null;
  if (team && team === game?.away) prob = analysis.awayWinProbability;
  if (team && team === game?.home) prob = analysis.homeWinProbability;
  const books = analysis.consensusBooks || 1;
  const chance = prob != null ? ` a ${Math.round(prob)}% chance to win` : " the edge";
  return `The sportsbooks give the ${name}${chance}. We checked ${books} sportsbook${books === 1 ? "" : "s"}.`;
}

const FACTOR_LABELS = {
  "no-vig win probability": "Fair win chance (sportsbook fee removed)",
  "sportsbook agreement": "How much the sportsbooks agree",
  "books analyzed": "Sportsbooks checked",
  "consensus books": "Sportsbooks checked",
  "average vig": "Average sportsbook fee",
  "spread consensus": "Typical point spread",
  "total consensus": "Typical total points line",
  "market edge": "How strong the lean is",
  "consensus spread": "Typical point spread",
  "consensus total": "Typical total points line",
};
export function plainFactor(label) {
  return FACTOR_LABELS[String(label || "").toLowerCase()] || label;
}

const PROP_LABELS = {
  player_points: "Points", player_rebounds: "Rebounds", player_assists: "Assists", player_threes: "3-pointers made",
  player_pass_yds: "Passing yards", player_rush_yds: "Rushing yards", player_reception_yds: "Receiving yards",
  batter_hits: "Hits", batter_total_bases: "Total bases", batter_home_runs: "Home runs",
};
export function propLabel(market) {
  return PROP_LABELS[market] || String(market || "").replaceAll("_", " ");
}
