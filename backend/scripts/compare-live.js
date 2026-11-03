/*
 * Compare the free ESPN lines against a running Sports Jedi API that
 * still uses The Odds API, without spending any Odds API quota here.
 *
 *   node scripts/compare-live.js [https://api.sportsjedi.com] [NBA,NCAAF,NFL,MLB]
 */
import { EspnProvider } from "../src/services/providers/espn.js";
import { compareLeague } from "../src/routes/sources.js";

const base = process.argv[2] || "https://api.sportsjedi.com";
const leagues = (process.argv[3] || "NBA,NCAAF,NFL,MLB").split(",");
const espn = new EspnProvider();

for (const league of leagues) {
  const res = await fetch(`${base}/api/games?league=${league}`);
  const body = await res.json();
  const oddsGames = (body.data || []).filter((g) => !String(g.id).startsWith("espn-"));
  const espnGames = await espn.getGames({ league });
  const r = compareLeague(league, oddsGames, espnGames);
  console.log(
    `${league.padEnd(6)} oddsApi=${r.oddsApiGames} (+${r.beyondEspnWindow} later) espn=${r.espnGames} matched=${r.matched} ` +
    `espnLines=${r.espnWithLines} coverage=${r.coverage ?? "-"} ` +
    `spread=${r.spread.agree}/${r.spread.checked} (avg ${r.spread.avgDiff ?? "-"}) ` +
    `total=${r.total.agree}/${r.total.checked} (avg ${r.total.avgDiff ?? "-"}) ` +
    `fav=${r.favorite.agree}/${r.favorite.checked} ready=${r.readyToReplace}`
  );
  for (const d of r.disagreements.slice(0, 3)) console.log("   differs:", JSON.stringify(d));
  if (r.unmatched.length) console.log("   unmatched:", r.unmatched.slice(0, 5).join(" | "));
}
