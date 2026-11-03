import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as wait } from "node:timers/promises";
import { mapMlbStatus } from "../src/services/gamecast/mlb.js";

const PORT = 4300 + Math.floor(Math.random() * 500);
const BASE = `http://127.0.0.1:${PORT}`;

async function startServer() {
  const proc = spawn(process.execPath, ["src/server.js"], {
    env: {
      ...process.env,
      PORT: String(PORT),
      SPORTS_PROVIDER: "mock",
      FRONTEND_ORIGIN: "http://localhost:5173",
      STRIPE_SECRET_KEY: "",
      STRIPE_PRICE_PRO_MONTHLY: "",
      STRIPE_PRICE_PRO_ANNUAL: "",
      SOURCES_ADMIN_TOKEN: "test-admin-token-0123456789",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let output = "";
  proc.stdout.on("data", (c) => (output += c));
  proc.stderr.on("data", (c) => (output += c));

  for (let i = 0; i < 50; i++) {
    if (proc.exitCode !== null) throw new Error(`Server exited:\n${output}`);
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return proc;
    } catch {}
    await wait(100);
  }
  proc.kill();
  throw new Error(`Server did not start:\n${output}`);
}

async function get(path, init) {
  const res = await fetch(`${BASE}${path}`, init);
  return { status: res.status, body: await res.json() };
}

test("Sports Jedi API (mock provider)", async (t) => {
  const server = await startServer();
  t.after(() => server.kill());

  await t.test("health and root", async () => {
    assert.equal((await get("/api/health")).body.status, "ok");
    assert.equal((await get("/")).body.name, "Sports Jedi API");
  });

  await t.test("games, single game and analysis", async () => {
    const games = await get("/api/games");
    assert.equal(games.status, 200);
    assert.ok(Array.isArray(games.body.data) && games.body.data.length > 0);

    const id = games.body.data[0].id;
    const one = await get(`/api/games/${encodeURIComponent(id)}`);
    assert.equal(one.body.data.id, id);

    const analysis = await get(`/api/games/${encodeURIComponent(id)}/analysis`);
    assert.equal(analysis.status, 200);
    assert.equal(typeof analysis.body.data.confidence, "number");

    assert.equal((await get("/api/games/does-not-exist")).status, 404);
  });

  await t.test("picks sorted by confidence, teams, props", async () => {
    const picks = (await get("/api/picks")).body.data;
    for (let i = 1; i < picks.length; i++) {
      assert.ok(picks[i - 1].analysis.confidence >= picks[i].analysis.confidence);
    }
    assert.ok(Array.isArray((await get("/api/teams")).body.data));
    assert.ok(Array.isArray((await get("/api/picks/props")).body.data));
  });

  await t.test("parlay analyze", async () => {
    const res = await get("/api/parlays/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ legs: [] }),
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  await t.test("bad JSON is a 400, not a 500", async () => {
    const res = await get("/api/parlays/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{nope",
    });
    assert.equal(res.status, 400);
  });

  await t.test("billing answers 503 when Stripe isn't configured", async () => {
    const res = await get("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "monthly" }),
    });
    assert.equal(res.status, 503);
    assert.equal((await get("/api/billing/session/not-a-session")).status, 400);
  });

  await t.test("source admin endpoints require the token", async () => {
    assert.equal((await get("/api/sources/status")).status, 401);
    const ok = await get("/api/sources/status", {
      headers: { Authorization: "Bearer test-admin-token-0123456789" },
    });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.provider, "mock");
    assert.equal(JSON.stringify(ok.body).includes("apiKey"), false);
  });

  await t.test("unknown origin is rejected with 403", async () => {
    const res = await get("/api/health", { headers: { Origin: "https://evil.example" } });
    assert.equal(res.status, 403);
  });
});

test("MLB status mapping", () => {
  assert.equal(mapMlbStatus("Live", "In Progress"), "live");
  assert.equal(mapMlbStatus("Final", "Final"), "final");
  assert.equal(mapMlbStatus("Preview", "Scheduled"), "upcoming");
  assert.equal(mapMlbStatus("Preview", "Postponed"), "postponed");
});
