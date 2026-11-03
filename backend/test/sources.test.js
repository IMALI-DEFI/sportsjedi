import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeEspnEvent,
  findEspnMatch,
  sameTeamName,
} from "../src/services/providers/espn.js";
import { compareLeague } from "../src/routes/sources.js";

// Trimmed from a real ESPN NCAAF scoreboard event (away team favored).
const espnEvent = {
  id: "401866453",
  date: "2026-11-04T00:00Z",
  status: { period: 0, displayClock: "0:00", type: { state: "pre", name: "STATUS_SCHEDULED", description: "Scheduled" } },
  competitions: [{
    venue: { fullName: "InfoCision Stadium" },
    competitors: [
      { homeAway: "home", score: "0", records: [{ summary: "1-7" }], team: { displayName: "Akron Zips", abbreviation: "AKR" } },
      { homeAway: "away", score: "0", records: [{ summary: "5-3" }], team: { displayName: "Ohio Bobcats", abbreviation: "OHIO" } },
    ],
    odds: [{
      provider: { name: "DraftKings", displayName: "DraftKings" },
      overUnder: 51.5,
      spread: 14.0,
      homeTeamOdds: { favorite: false },
      awayTeamOdds: { favorite: true },
      moneyline: { home: { close: { odds: "+425" } }, away: { close: { odds: "-600" } } },
      pointSpread: { home: { close: { line: "+14" } }, away: { close: { line: "-14" } } },
      total: { over: { close: { line: "o51.5" } } },
    }],
  }],
};

test("ESPN event normalizes to the Sports Jedi game shape", () => {
  const g = normalizeEspnEvent(espnEvent, "NCAAF");
  assert.equal(g.id, "espn-ncaaf-401866453");
  assert.equal(g.sportKey, "americanfootball_ncaaf");
  assert.equal(g.status, "upcoming");
  assert.deepEqual(g.spread, { favorite: "OHIO", line: -14 });
  assert.equal(g.total, 51.5);
  assert.deepEqual(g.moneyline.map((m) => m.price), [-600, 425]);
  assert.equal(g.home.record, "1-7");
  assert.equal(g.venue, "InfoCision Stadium");
  assert.equal(g.bookmaker.title, "DraftKings");
});

test("ESPN event without odds still yields a game", () => {
  const noOdds = structuredClone(espnEvent);
  delete noOdds.competitions[0].odds;
  noOdds.status.type.state = "in";
  const g = normalizeEspnEvent(noOdds, "NCAAF");
  assert.equal(g.spread, null);
  assert.equal(g.total, null);
  assert.equal(g.status, "live");
});

test("team names match across sources", () => {
  assert.ok(sameTeamName("Los Angeles Clippers", "LA Clippers"));
  assert.ok(sameTeamName("Ohio State Buckeyes", "Ohio St Buckeyes"));
  assert.ok(!sameTeamName("Miami Hurricanes", "Miami (OH) RedHawks"));
  assert.ok(!sameTeamName("New York Knicks", "Brooklyn Nets"));
});

test("matching uses both teams and start time", () => {
  const espnGame = normalizeEspnEvent(espnEvent, "NCAAF");
  const odds = { home: { name: "Akron Zips" }, away: { name: "Ohio Bobcats" }, startTime: "2026-11-04T00:05:00Z" };
  assert.equal(findEspnMatch(odds, [espnGame])?.id, espnGame.id);
  assert.equal(findEspnMatch({ ...odds, startTime: "2026-11-11T00:00:00Z" }, [espnGame]), null);
  assert.equal(findEspnMatch({ ...odds, home: { name: "Kent State Golden Flashes" } }, [espnGame]), null);
});

test("comparison counts agreement and flags disagreements", () => {
  const espnGame = normalizeEspnEvent(espnEvent, "NCAAF");
  const agree = {
    home: { name: "Akron Zips", abbr: "AZ" },
    away: { name: "Ohio Bobcats", abbr: "OB" },
    startTime: "2026-11-04T00:00:00Z",
    spread: { favorite: "OB", line: -13.5 },
    total: 51.5,
    moneyline: [{ team: "Ohio Bobcats", price: -580 }, { team: "Akron Zips", price: 420 }],
  };
  let report = compareLeague("NCAAF", [agree], [espnGame]);
  assert.equal(report.matched, 1);
  assert.equal(report.spread.agree, 1);
  assert.equal(report.total.agree, 1);
  assert.equal(report.favorite.agree, 1);
  assert.equal(report.coverage, 1);
  assert.equal(report.readyToReplace, true);

  // Favorite flipped: home -14 vs ESPN home +14 is a 28-point miss.
  const flipped = { ...agree, spread: { favorite: "AZ", line: -14 } };
  report = compareLeague("NCAAF", [flipped], [espnGame]);
  assert.equal(report.spread.agree, 0);
  assert.equal(report.disagreements.length, 1);
  assert.equal(report.readyToReplace, false);
});
