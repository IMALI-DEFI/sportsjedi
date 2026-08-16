export const games = [
  {
    id: "nfl-001",
    league: "NFL",
    status: "upcoming",
    startTime: "2026-09-10T20:20:00-04:00",
    away: { name: "Dallas Cowboys", abbr: "DAL", record: "0-0", score: 0 },
    home: { name: "Philadelphia Eagles", abbr: "PHI", record: "0-0", score: 0 },
    venue: "Lincoln Financial Field",
    spread: { favorite: "PHI", line: -3.5 },
    total: 47.5
  },
  {
    id: "nba-001",
    league: "NBA",
    status: "final",
    startTime: "2026-04-15T19:30:00-04:00",
    away: { name: "Boston Celtics", abbr: "BOS", record: "58-24", score: 112 },
    home: { name: "New York Knicks", abbr: "NYK", record: "52-30", score: 108 },
    venue: "Madison Square Garden",
    spread: { favorite: "BOS", line: -2.5 },
    total: 221.5
  },
  {
    id: "mlb-001",
    league: "MLB",
    status: "live",
    startTime: "2026-08-15T19:05:00-04:00",
    inning: "Top 7th",
    away: { name: "Baltimore Orioles", abbr: "BAL", record: "67-54", score: 4 },
    home: { name: "New York Yankees", abbr: "NYY", record: "71-50", score: 3 },
    venue: "Yankee Stadium",
    spread: { favorite: "NYY", line: -1.5 },
    total: 8.5
  }
];

export const teams = [
  { id: "phi", league: "NFL", name: "Philadelphia Eagles", abbr: "PHI", city: "Philadelphia", rating: 91 },
  { id: "dal", league: "NFL", name: "Dallas Cowboys", abbr: "DAL", city: "Dallas", rating: 86 },
  { id: "bos", league: "NBA", name: "Boston Celtics", abbr: "BOS", city: "Boston", rating: 94 },
  { id: "nyk", league: "NBA", name: "New York Knicks", abbr: "NYK", city: "New York", rating: 89 },
  { id: "nyy", league: "MLB", name: "New York Yankees", abbr: "NYY", city: "New York", rating: 90 },
  { id: "bal", league: "MLB", name: "Baltimore Orioles", abbr: "BAL", city: "Baltimore", rating: 87 }
];
