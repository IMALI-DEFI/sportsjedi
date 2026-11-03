// Runs the production Postgres statements against pg-mem (in-memory Postgres).
import test from "node:test";
import assert from "node:assert/strict";
import { newDb } from "pg-mem";
import { PgStore } from "../src/services/apiKeyStore.js";

function makeStore() {
  const db = newDb({ noAstCoverageCheck: true }); // pg-mem can't re-read IF NOT EXISTS constraints; real Postgres can
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  return new PgStore((text, params) => pool.query(text, params));
}

test("schema is idempotent and the key lifecycle works in SQL", async () => {
  const store = makeStore();
  await store.ensureSchema();
  store.ready = null;
  await store.ensureSchema(); // second run must not fail (IF NOT EXISTS)

  const account = await store.upsertAccount({ userId: 42, email: "a@example.com" });
  assert.equal(account.plan, "free");
  await store.upsertAccount({ userId: 42, email: null }); // keeps email
  assert.equal((await store.getAccount(42)).email, "a@example.com");

  const key = await store.insertKey({ userId: 42, name: "app", prefix: "sj_live_abcd", hash: "h1" });
  assert.equal(key.status, "active");
  assert.equal(await store.countActiveKeys(42), 1);

  const found = await store.findKeyByHash("h1");
  assert.equal(found.user_id, "42");
  assert.equal(found.plan, "free");
  assert.equal(found.email, "a@example.com");

  const day = new Date().toISOString().slice(0, 10);
  assert.equal(await store.incrementUsage(42, day), 1);
  assert.equal(await store.incrementUsage(42, day), 2);
  const usage = await store.usage(42, 3650);
  assert.deepEqual(usage, [{ day, count: 2 }]);

  await store.setPlan(42, { plan: "pro", stripeCustomerId: "cus_1", stripeSubscriptionId: "sub_1" });
  const paid = await store.findKeyByHash("h1");
  assert.equal(paid.plan, "pro");
  assert.equal(paid.stripe_subscription_id, "sub_1");

  await store.touchKey(key.id);
  assert.equal(await store.revokeKey(99, key.id), null, "other users can't revoke");
  assert.equal(await store.revokeKey(42, key.id), "h1");
  assert.equal((await store.findKeyByHash("h1")).status, "revoked");
  assert.equal(await store.countActiveKeys(42), 0);
  assert.equal((await store.listKeys(42))[0].status, "revoked");
});
