# Sports Jedi Developer API (experimental)

The developer routes are mounted at `/api/developer/v1` and require an `x-api-key` header. Set `SPORTSJEDI_DEVELOPER_KEYS` to a comma-separated list of keys and `SPORTSJEDI_DEVELOPER_TIERS` to corresponding tier names (`free`, `starter`, `pro`, `business`, `enterprise`). Never commit keys.

## Endpoints

- `GET /capabilities`: current supported calculations and validation status.
- `GET /predictions?league=NFL`: experimental record-based game predictions for NFL, NCAAF, NBA or MLB; uses an unofficial source with unverified commercial redistribution rights. Do not commercialize this feed until rights are cleared.
- `GET /usage`: approximate remaining requests for the UTC calendar month.
- `POST /fair-odds`: JSON `{ "probability": 0.55, "offeredAmericanOdds": -105 }`. The offered odds field is optional. Returns fair odds and, if supplied, expected return per dollar at the caller-provided odds.

Example: `curl -H 'x-api-key: YOUR_KEY' -H 'Content-Type: application/json' -d '{"probability":0.55,"offeredAmericanOdds":-105}' http://localhost:4100/api/developer/v1/fair-odds`

## Commercial release blockers

The current probability is caller-supplied; it is **not** a validated Sports Jedi prediction. Monthly quotas are now stored in a local JSON file and persist across restarts on one server, but updates are not transactionally safe across multiple processes. Set SPORTSJEDI_USAGE_FILE to a writable persistent path; use a transactional shared store before multi-instance billing. Production needs a transactional persistent usage store, secure hashed per-account API keys, key rotation, tenant administration, billing webhooks, abuse limits, documented data provenance and licensing, validated historical backtests, automated endpoint tests, and public DNS/TLS verification. Do not advertise this as a live licensed sports-stat redistribution feed.
