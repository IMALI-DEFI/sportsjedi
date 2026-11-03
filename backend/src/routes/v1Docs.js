import { publicPlans } from "../services/apiPlans.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const fmt = (n) => Number(n).toLocaleString("en-US");

const BASE = "https://api.sportsjedi.com";

const endpoints = [
  {
    method: "GET", path: "/v1/picks",
    about: "Today's Sports Jedi picks, highest confidence first. Games that are final are left out.",
    params: [["league", "NFL, NCAAF, NBA or MLB (optional)"], ["min_confidence", "0-100, default 0"], ["limit", "1-200, default 50"]],
    example: `{
  "success": true,
  "data": [{
    "game": { "id": "4f6688e4d1818bd8...", "league": "NBA", "startTime": "2026-11-05T00:30:00Z",
              "status": "upcoming", "away": { "name": "Chicago Bulls", "abbr": "CB" },
              "home": { "name": "New York Knicks", "abbr": "NYK" } },
    "analysis": { "pick": "NYK", "confidence": 78, "grade": "PLAY",
                  "homeWinProbability": 71.4, "awayWinProbability": 28.6, "edge": 21.4,
                  "marketAgreement": 100, "summary": "NYK is the market-consensus side..." }
  }],
  "meta": { "plan": "starter", "requestsToday": 41, "dailyLimit": 5000, "count": 1 }
}`,
  },
  {
    method: "GET", path: "/v1/games",
    about: "Games Sports Jedi is tracking, soonest first.",
    params: [["league", "NFL, NCAAF, NBA or MLB (optional)"], ["status", "upcoming, live, final or postponed"], ["date", "YYYY-MM-DD (UTC)"]],
  },
  {
    method: "GET", path: "/v1/games/{id}",
    about: "One game with its full Sports Jedi analysis.",
    params: [["id", "a game id from /v1/games or /v1/picks"]],
  },
  {
    method: "POST", path: "/v1/parlays/analyze",
    about: "Score a parlay. Each leg's probability comes from Sports Jedi's model, so the result reflects the real chance every leg hits. Up to 12 legs.",
    body: `{ "legs": [ { "gameId": "4f6688e4d1818bd8...", "pick": "NYK" },
             { "gameId": "a91c02b7e4f3...",     "pick": "KC"  } ] }`,
    example: `{
  "success": true,
  "data": { "legs": 2, "combinedConfidence": 52.1, "risk": "Medium",
            "message": "2-leg card has approximately 52.1% combined model probability..." }
}`,
  },
  {
    method: "GET", path: "/v1/usage",
    about: "Your plan, requests used today and what's left.",
  },
  {
    method: "GET", path: "/v1/leagues",
    about: "Supported leagues. No key needed.",
  },
];

export function renderDocs() {
  const plans = publicPlans();
  const planRows = plans.map((p) => `<tr><td><b>${esc(p.name)}</b></td><td>${esc(p.price)}</td><td>${fmt(p.requestsPerDay)}</td><td>${fmt(p.requestsPerMinute)}</td><td>${p.maxKeys}</td></tr>`).join("");

  const endpointHtml = endpoints.map((e) => `
    <section class="ep" id="${esc(e.path.replace(/[^a-z]/gi, "-"))}">
      <h3><span class="m ${e.method.toLowerCase()}">${e.method}</span> <code>${esc(e.path)}</code></h3>
      <p>${esc(e.about)}</p>
      ${e.params ? `<table><tr><th>Parameter</th><th>Meaning</th></tr>${e.params.map(([k, v]) => `<tr><td><code>${esc(k)}</code></td><td>${esc(v)}</td></tr>`).join("")}</table>` : ""}
      ${e.body ? `<p class="label">Request body</p><pre>${esc(e.body)}</pre>` : ""}
      ${e.example ? `<p class="label">Response</p><pre>${esc(e.example)}</pre>` : ""}
    </section>`).join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sports Jedi API Docs</title>
<meta name="description" content="Sports Jedi API: confidence-ranked picks, win probabilities and parlay scoring for NFL, college football, NBA and MLB.">
<style>
:root{--bg:#060b1a;--panel:#0e1a31;--line:#24395a;--text:#e8f0fb;--muted:#9fb3cc;--accent:#3be8d6;--accent2:#10b981;--warn:#f5c451}
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(ellipse at 70% -10%,#164a63 0,#0a1430 45%,var(--bg) 100%) fixed;color:var(--text);font:16px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{max-width:980px;margin:0 auto;padding:28px 18px 80px}
a{color:var(--accent)}
.eyebrow{color:var(--accent);font-weight:800;letter-spacing:.16em;font-size:12px;text-transform:uppercase}
h1{font-size:clamp(2.1rem,6vw,3.6rem);line-height:1.05;letter-spacing:-.04em;margin:8px 0 14px}
h2{margin:46px 0 10px;letter-spacing:-.02em}
h3{margin:0 0 6px;font-size:1.05rem}
.lead{color:var(--muted);font-size:1.12rem;max-width:680px}
.cta{display:inline-block;margin:18px 10px 0 0;padding:13px 22px;border-radius:12px;font-weight:800;text-decoration:none}
.cta.primary{background:linear-gradient(120deg,var(--accent),var(--accent2));color:#04131c}
.cta.ghost{border:1px solid var(--line);color:var(--text)}
pre{background:#050c1c;border:1px solid var(--line);border-radius:12px;padding:14px;overflow-x:auto;font:13px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;color:#d4e6ff}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.92em;color:#bdf5ee}
table{width:100%;border-collapse:collapse;margin:10px 0;font-size:.95rem}
th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--muted);font-weight:600}
.ep{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:18px;margin:14px 0}
.m{display:inline-block;font:800 12px/1 system-ui;padding:5px 8px;border-radius:7px;margin-right:4px}
.m.get{background:#0f3b4a;color:var(--accent)}.m.post{background:#3a2f0c;color:var(--warn)}
.label{margin:12px 0 4px;color:var(--muted);font-size:.85rem;text-transform:uppercase;letter-spacing:.08em}
.note{border-left:3px solid var(--warn);background:#1a1a12;padding:12px 14px;border-radius:8px;color:#ece3c4}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:16px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px}
.card b{display:block;margin-bottom:4px}
nav.toc{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0}
nav.toc a{padding:6px 10px;border:1px solid var(--line);border-radius:999px;text-decoration:none;font-size:.9rem}
@media(max-width:600px){th,td{padding:7px 6px}.ep{padding:14px}}
</style>
</head>
<body>
<main>
<div class="eyebrow">Sports Jedi API · v1</div>
<h1>Sports picks your app can use.</h1>
<p class="lead">Confidence-ranked picks, win probabilities and parlay scoring for NFL, college football, NBA and MLB, as clean JSON. The same model behind sportsjedi.com.</p>
<a class="cta primary" href="https://sportsjedi.com/developers">Get a free API key</a>
<a class="cta ghost" href="#quickstart">Quick start</a>

<div class="grid">
  <div class="card"><b>Ranked picks</b>Every game's side, confidence score and grade, best first.</div>
  <div class="card"><b>Win probabilities</b>No-vig home and away probabilities plus edge.</div>
  <div class="card"><b>Parlay scoring</b>Real combined probability for any set of legs.</div>
  <div class="card"><b>Four leagues</b>NFL, NCAAF, NBA and MLB, updated all day.</div>
</div>

<nav class="toc"><a href="#quickstart">Quick start</a><a href="#auth">Authentication</a><a href="#plans">Plans</a><a href="#endpoints">Endpoints</a><a href="#errors">Errors &amp; limits</a><a href="#terms">Terms</a></nav>

<h2 id="quickstart">Quick start</h2>
<p>1. Sign in at <a href="https://sportsjedi.com/developers">sportsjedi.com/developers</a> and create a key. 2. Call the API:</p>
<pre>curl ${BASE}/v1/picks?league=NFL \\
  -H "X-API-Key: sj_live_your_key_here"</pre>
<p class="label">JavaScript</p>
<pre>const res = await fetch("${BASE}/v1/picks?league=NBA&amp;min_confidence=70", {
  headers: { "X-API-Key": process.env.SPORTS_JEDI_API_KEY },
});
const { data } = await res.json();</pre>
<p class="label">Python</p>
<pre>import os, requests
r = requests.get("${BASE}/v1/picks", params={"league": "NCAAF"},
                 headers={"X-API-Key": os.environ["SPORTS_JEDI_API_KEY"]})
picks = r.json()["data"]</pre>

<h2 id="auth">Authentication</h2>
<p>Send your key in the <code>X-API-Key</code> header on every request. Keys start with <code>sj_live_</code>. Keep them on your server; browsers are blocked from calling the API directly so keys can't leak from web pages. You can revoke and create keys anytime at sportsjedi.com/developers.</p>

<h2 id="plans">Plans</h2>
<table><tr><th>Plan</th><th>Price</th><th>Requests / day</th><th>Requests / min</th><th>Keys</th></tr>${planRows}</table>
<p>Limits are per account and reset at midnight UTC. Upgrade or cancel anytime from your developer page.</p>

<h2 id="endpoints">Endpoints</h2>
<p>Base URL: <code>${BASE}</code>. All responses are JSON: <code>{"success": true, "data": ..., "meta": {...}}</code>.</p>
${endpointHtml}

<h2 id="errors">Errors &amp; rate limits</h2>
<p>Errors look like <code>{"success": false, "error": "message", "code": "CODE"}</code>.</p>
<table>
<tr><th>Status</th><th>Code</th><th>Meaning</th></tr>
<tr><td>400</td><td><code>INVALID_LEAGUE</code>, <code>INVALID_LEGS</code>, …</td><td>A parameter is wrong; the message says which.</td></tr>
<tr><td>401</td><td><code>API_KEY_REQUIRED</code>, <code>INVALID_API_KEY</code></td><td>Missing, wrong or revoked key.</td></tr>
<tr><td>403</td><td><code>PLAN_REQUIRED</code></td><td>Your plan doesn't include this endpoint.</td></tr>
<tr><td>404</td><td><code>NOT_FOUND</code></td><td>No game with that id.</td></tr>
<tr><td>429</td><td><code>RATE_LIMITED</code>, <code>DAILY_QUOTA_EXCEEDED</code></td><td>Slow down; see <code>Retry-After</code>.</td></tr>
</table>
<p>Every keyed response includes <code>X-RateLimit-Limit</code>, <code>X-RateLimit-Remaining</code> and <code>X-RateLimit-Reset</code> (seconds until the daily reset).</p>

<h2 id="terms">Terms</h2>
<p class="note">Sports Jedi provides sports analysis for information and entertainment. Picks and probabilities are model estimates, not guarantees and not betting advice. If you show them to people, say so, follow the gambling laws where your users are, and point anyone who needs it to help such as 1-800-GAMBLER.</p>
<p>Questions: <a href="https://sportsjedi.com">sportsjedi.com</a></p>
</main>
</body>
</html>`;
}
