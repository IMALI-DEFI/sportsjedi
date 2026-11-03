# Sports Jedi data sources

The API keeps The Odds API as the wagering source and adds free sources so
Sports Jedi can move off paid odds once the free data proves equal.

| Source | Cost | Gives |
|---|---|---|
| The Odds API | paid, quota | multi-book lines, player props, sportsbook deep links |
| ESPN scoreboards | free | games, live status and scores, records, venues, DraftKings spread/total/moneyline for near-term games |
| MLB Stats API | free | authoritative MLB state and gamecast |

## Switching on the server

Set `SPORTS_PROVIDER` in the backend `.env`, then restart the process
(`pm2 restart <name> --update-env`).

1. **Today:** `theoddsapi`. Nothing changes.
2. **Recommended next:** `hybrid`. Same Odds API lines, plus live scores/status,
   records and venues from ESPN. If the Odds API errors or runs out of quota, each
   league falls back to ESPN automatically instead of going empty.
3. **When the report says ready:** `espn`. No key, no quota. Player props go
   empty, because no free source carries them.

Rollback is setting the variable back and restarting.

## Is the free data good enough yet?

Set `SOURCES_ADMIN_TOKEN` (16+ characters) and call:

```bash
curl -H "Authorization: Bearer $SOURCES_ADMIN_TOKEN" https://api.sportsjedi.com/api/sources/compare
curl -H "Authorization: Bearer $SOURCES_ADMIN_TOKEN" https://api.sportsjedi.com/api/sources/status
```

`compare` lines ESPN up against The Odds API per league (same sportsbook where
possible) and returns `readyToReplace: true` when ESPN has lines for 90%+ of
games and agrees on 90%+ of spreads and totals. `status` shows Odds API quota
remaining and how many times the fallback kicked in.

To check without spending quota from this machine, compare against the live API:

```bash
node scripts/compare-live.js https://api.sportsjedi.com
```

First run (Nov 3, 2026): NFL 15/15 and NCAAF 62/62 same-book spreads and totals
identical; NBA had lines for 4 of 5 near-term games.

## Gaps before dropping The Odds API completely

- **Player props:** none of the free sources provide them.
- **Multi-book consensus:** ESPN shows one book, so `marketAgreement` is weaker.
- **Line horizon:** ESPN posts lines only a few days out.
