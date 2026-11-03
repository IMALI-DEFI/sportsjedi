import test from "node:test";
import assert from "node:assert/strict";

process.env.API_KEY_STORE = "memory";
process.env.SPORTS_PROVIDER = "mock";
delete process.env.API_INCLUDE_MARKET_DATA;
delete process.env.STRIPE_SECRET_KEY;
delete process.env.STRIPE_PRICE_API_STARTER;

const express = (await import("express")).default;
const { default: v1Routes } = await import("../src/routes/v1.js");
const { default: developerRoutes } = await import("../src/routes/developer.js");
const { errorHandler, notFound } = await import("../src/middleware/errorHandler.js");
const { getApiKeyStore } = await import("../src/services/apiKeyStore.js");
const { forgetApiKey } = await import("../src/middleware/apiKey.js");

// Stand-in for the site's JWT login: the X-Test-User header picks the user.
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  const id = req.get("x-test-user");
  req.user = id ? { id, email: `${id}@example.com` } : null;
  next();
});
app.use("/api/developer", developerRoutes);
app.use("/v1", v1Routes);
app.use(notFound);
app.use(errorHandler);

const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
test.after(() => server.close());

async function call(path, { user, key, method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (user) headers["X-Test-User"] = user;
  if (key) headers["X-API-Key"] = key;
  const res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, headers: res.headers, body: await res.json().catch(() => null) };
}

test("public endpoints need no key", async () => {
  assert.equal((await call("/v1")).body.data.version, "1");
  assert.deepEqual((await call("/v1/leagues")).body.data, ["NFL", "NCAAF", "NBA", "MLB"]);
  const plans = (await call("/api/developer/plans")).body.data;
  assert.deepEqual(plans.map((p) => p.id), ["free", "starter", "pro"]);
  assert.equal(plans.find((p) => p.id === "starter").purchasable, false, "not on sale until a Stripe price is set");
  const docs = await fetch(`${base}/v1/docs`);
  assert.equal(docs.status, 200);
  assert.match(await docs.text(), /X-API-Key/);
});

test("developer creates a key and uses the API", async (t) => {
  assert.equal((await call("/api/developer/account")).status, 401, "requires login");

  const created = await call("/api/developer/keys", { user: "dev1", method: "POST", body: { name: "my app" } });
  assert.equal(created.status, 201);
  const key = created.body.data.key;
  assert.match(key, /^sj_live_[A-Za-z0-9]{32}$/);
  assert.equal(created.body.data.prefix, key.slice(0, 12));

  await t.test("key is never listed again", async () => {
    const account = (await call("/api/developer/account", { user: "dev1" })).body.data;
    assert.equal(account.plan, "free");
    assert.equal(account.keys.length, 1);
    assert.equal(JSON.stringify(account).includes(key), false);
  });

  await t.test("missing and wrong keys are rejected", async () => {
    assert.equal((await call("/v1/picks")).body.code, "API_KEY_REQUIRED");
    assert.equal((await call("/v1/picks", { key: "sj_live_" + "x".repeat(32) })).status, 401);
    assert.equal((await call("/v1/picks", { key: "nope" })).body.code, "INVALID_API_KEY");
  });

  await t.test("picks: own analysis only, no third-party market data by default", async () => {
    const res = await call("/v1/picks?league=NFL", { key });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("x-plan"), "free");
    assert.equal(res.headers.get("x-ratelimit-limit"), "100");
    for (const p of res.body.data) {
      assert.deepEqual(Object.keys(p.game).sort(), ["away", "home", "id", "league", "startTime", "status"]);
      assert.ok(!("spread" in p.game) && !("spreadConsensus" in p.analysis) && !("factors" in p.analysis));
      assert.equal(typeof p.analysis.confidence, "number");
    }
    const confidences = res.body.data.map((p) => p.analysis.confidence);
    assert.deepEqual(confidences, [...confidences].sort((a, b) => b - a));
  });

  // The free plan allows 10 requests a minute; move this account to Pro for the rest.
  await getApiKeyStore().setPlan("dev1", { plan: "pro", stripeSubscriptionId: null });
  forgetApiKey();

  await t.test("games, single game, usage and validation", async () => {
    const games = (await call("/v1/games", { key })).body.data;
    assert.ok(games.length > 0);
    const one = await call(`/v1/games/${encodeURIComponent(games[0].id)}`, { key });
    assert.equal(one.body.data.game.id, games[0].id);
    assert.ok("confidence" in one.body.data.analysis);
    assert.equal((await call("/v1/games/nope", { key })).status, 404);
    assert.equal((await call("/v1/games?league=XFL", { key })).body.code, "INVALID_LEAGUE");
    assert.equal((await call("/v1/picks?limit=0", { key })).body.code, "INVALID_LIMIT");
    const usage = (await call("/v1/usage", { key })).body.data;
    assert.equal(usage.plan, "pro");
    assert.ok(usage.requestsToday >= 1);
  });

  await t.test("parlay confidence comes from the model, not the caller", async () => {
    const games = (await call("/v1/games", { key })).body.data.filter((g) => g.status !== "final");
    const legs = games.slice(0, 2).map((g) => ({ gameId: g.id, pick: g.home.abbr, confidence: 99 }));
    const res = await call("/v1/parlays/analyze", { key, method: "POST", body: { legs } });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.legs.length, 2);
    for (const leg of res.body.data.legs) assert.notEqual(leg.confidence, 99);
    assert.equal((await call("/v1/parlays/analyze", { key, method: "POST", body: { legs: [{ gameId: games[0].id, pick: "ZZZ" }] } })).body.code, "INVALID_LEG");
    assert.equal((await call("/v1/parlays/analyze", { key, method: "POST", body: { legs: [] } })).body.code, "INVALID_LEGS");
  });

  await t.test("props are not available without licensed market data", async () => {
    assert.equal((await call("/v1/props", { key })).body.code, "NOT_AVAILABLE");
  });

  await t.test("revoked keys stop working immediately", async () => {
    const id = created.body.data.id;
    assert.equal((await call(`/api/developer/keys/${id}`, { user: "dev2", method: "DELETE" })).status, 404, "other users can't revoke it");
    assert.equal((await call(`/api/developer/keys/${id}`, { user: "dev1", method: "DELETE" })).status, 200);
    assert.equal((await call("/v1/usage", { key })).status, 401);
  });
});

test("free plan limits: key count and daily quota", async () => {
  await call("/api/developer/keys", { user: "dev3", method: "POST", body: {} });
  const second = await call("/api/developer/keys", { user: "dev3", method: "POST", body: {} });
  assert.equal(second.status, 201);
  const third = await call("/api/developer/keys", { user: "dev3", method: "POST", body: {} });
  assert.equal(third.body.code, "KEY_LIMIT");

  // Burn the rest of today's quota directly in the store, then call once more.
  const store = getApiKeyStore();
  const day = new Date().toISOString().slice(0, 10);
  for (let i = 0; i < 100; i++) await store.incrementUsage("dev3", day);
  const res = await call("/v1/leagues", { key: second.body.data.key }); // public, no count
  assert.equal(res.status, 200);
  const blocked = await call("/v1/usage", { key: second.body.data.key });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.code, "DAILY_QUOTA_EXCEEDED");
  assert.ok(Number(blocked.headers.get("retry-after")) > 0);
});

test("per-minute limit returns 429 with Retry-After", async () => {
  const created = await call("/api/developer/keys", { user: "dev4", method: "POST", body: {} });
  const key = created.body.data.key;
  const statuses = [];
  for (let i = 0; i < 11; i++) statuses.push((await call("/v1/usage", { key })).status);
  assert.deepEqual(statuses.slice(0, 10), Array(10).fill(200));
  assert.equal(statuses[10], 429);
});

test("paid plan applies to existing keys; checkout not offered until priced", async () => {
  const created = await call("/api/developer/keys", { user: "dev5", method: "POST", body: {} });
  const key = created.body.data.key;
  assert.equal((await call("/api/developer/checkout", { user: "dev5", method: "POST", body: { plan: "starter" } })).body.code, "PLAN_UNAVAILABLE");
  assert.equal((await call("/api/developer/checkout", { user: "dev5", method: "POST", body: { plan: "free" } })).body.code, "INVALID_PLAN");

  await getApiKeyStore().setPlan("dev5", { plan: "starter", stripeSubscriptionId: null });
  forgetApiKey();
  const res = await call("/v1/usage", { key });
  assert.equal(res.body.data.plan, "starter");
  assert.equal(res.headers.get("x-ratelimit-limit"), "5000");
});

test("market data appears only when licensed and enabled", async () => {
  const created = await call("/api/developer/keys", { user: "dev6", method: "POST", body: {} });
  process.env.API_INCLUDE_MARKET_DATA = "1";
  try {
    const games = (await call("/v1/games", { key: created.body.data.key })).body.data;
    assert.ok(games.length && "spread" in games[0] && "score" in games[0]);
    const one = (await call(`/v1/games/${encodeURIComponent(games[0].id)}`, { key: created.body.data.key })).body.data;
    assert.ok("factors" in one.analysis && "spreadConsensus" in one.analysis);
  } finally {
    delete process.env.API_INCLUDE_MARKET_DATA;
  }
});
