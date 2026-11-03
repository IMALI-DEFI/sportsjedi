/*
 * Storage for developer API accounts, keys and daily usage.
 *
 * Postgres in production (tables are created on first use, additive only);
 * an in-memory store when API_KEY_STORE=memory (tests, local dev).
 * Keys are stored only as SHA-256 hashes.
 */
import { query } from "./database.js";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS sj_api_accounts (
     user_id TEXT PRIMARY KEY,
     email TEXT,
     plan TEXT NOT NULL DEFAULT 'free',
     stripe_customer_id TEXT,
     stripe_subscription_id TEXT,
     plan_checked_at TIMESTAMPTZ,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE TABLE IF NOT EXISTS sj_api_keys (
     id BIGSERIAL PRIMARY KEY,
     user_id TEXT NOT NULL,
     name TEXT NOT NULL DEFAULT 'default',
     prefix TEXT NOT NULL,
     key_hash TEXT NOT NULL UNIQUE,
     status TEXT NOT NULL DEFAULT 'active',
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     last_used_at TIMESTAMPTZ,
     revoked_at TIMESTAMPTZ
   )`,
  `CREATE INDEX IF NOT EXISTS sj_api_keys_user_idx ON sj_api_keys (user_id)`,
  `CREATE TABLE IF NOT EXISTS sj_api_usage (
     user_id TEXT NOT NULL,
     day TEXT NOT NULL, -- YYYY-MM-DD in UTC; text avoids driver timezone shifts
     count INTEGER NOT NULL DEFAULT 0,
     PRIMARY KEY (user_id, day)
   )`,
];

const utcDay = (offsetDays = 0) => new Date(Date.now() - offsetDays * 86400000).toISOString().slice(0, 10);

class PgStore {
  constructor(runQuery = query) {
    this.q = runQuery;
    this.ready = null;
  }

  ensureSchema() {
    if (!this.ready) {
      this.ready = (async () => {
        for (const statement of SCHEMA) await this.q(statement);
      })().catch((error) => {
        this.ready = null; // retry on next call
        throw error;
      });
    }
    return this.ready;
  }

  async upsertAccount({ userId, email }) {
    await this.ensureSchema();
    const r = await this.q(
      `INSERT INTO sj_api_accounts (user_id, email) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET email = COALESCE(EXCLUDED.email, sj_api_accounts.email)
       RETURNING *`,
      [String(userId), email || null]
    );
    return r.rows[0];
  }

  async getAccount(userId) {
    await this.ensureSchema();
    const r = await this.q(`SELECT * FROM sj_api_accounts WHERE user_id = $1`, [String(userId)]);
    return r.rows[0] || null;
  }

  async setPlan(userId, { plan, stripeCustomerId, stripeSubscriptionId }) {
    await this.ensureSchema();
    await this.q(
      `UPDATE sj_api_accounts
       SET plan = $2,
           stripe_customer_id = COALESCE($3, stripe_customer_id),
           stripe_subscription_id = $4,
           plan_checked_at = NOW()
       WHERE user_id = $1`,
      [String(userId), plan, stripeCustomerId || null, stripeSubscriptionId || null]
    );
  }

  async markPlanChecked(userId) {
    await this.q(`UPDATE sj_api_accounts SET plan_checked_at = NOW() WHERE user_id = $1`, [String(userId)]);
  }

  async listKeys(userId) {
    await this.ensureSchema();
    const r = await this.q(
      `SELECT id, name, prefix, status, created_at, last_used_at, revoked_at
       FROM sj_api_keys WHERE user_id = $1 ORDER BY created_at DESC`,
      [String(userId)]
    );
    return r.rows;
  }

  async countActiveKeys(userId) {
    const r = await this.q(
      `SELECT COUNT(*)::int AS n FROM sj_api_keys WHERE user_id = $1 AND status = 'active'`,
      [String(userId)]
    );
    return r.rows[0].n;
  }

  async insertKey({ userId, name, prefix, hash }) {
    await this.ensureSchema();
    const r = await this.q(
      `INSERT INTO sj_api_keys (user_id, name, prefix, key_hash) VALUES ($1, $2, $3, $4)
       RETURNING id, name, prefix, status, created_at`,
      [String(userId), name, prefix, hash]
    );
    return r.rows[0];
  }

  async revokeKey(userId, keyId) {
    await this.ensureSchema();
    const r = await this.q(
      `UPDATE sj_api_keys SET status = 'revoked', revoked_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status = 'active'
       RETURNING key_hash`,
      [keyId, String(userId)]
    );
    return r.rows[0]?.key_hash || null;
  }

  async findKeyByHash(hash) {
    await this.ensureSchema();
    const r = await this.q(
      `SELECT k.id AS key_id, k.user_id, k.status, a.email, a.plan,
              a.stripe_subscription_id, a.plan_checked_at
       FROM sj_api_keys k
       JOIN sj_api_accounts a ON a.user_id = k.user_id
       WHERE k.key_hash = $1`,
      [hash]
    );
    return r.rows[0] || null;
  }

  async incrementUsage(userId, day) {
    const r = await this.q(
      `INSERT INTO sj_api_usage (user_id, day, count) VALUES ($1, $2, 1)
       ON CONFLICT (user_id, day) DO UPDATE SET count = sj_api_usage.count + 1
       RETURNING count`,
      [String(userId), day]
    );
    return r.rows[0].count;
  }

  async usage(userId, days = 30) {
    await this.ensureSchema();
    const r = await this.q(
      `SELECT day, count FROM sj_api_usage
       WHERE user_id = $1 AND day >= $2
       ORDER BY day DESC`,
      [String(userId), utcDay(days - 1)]
    );
    return r.rows.map((row) => ({ day: String(row.day), count: Number(row.count) }));
  }

  async touchKey(keyId) {
    await this.q(`UPDATE sj_api_keys SET last_used_at = NOW() WHERE id = $1`, [keyId]);
  }
}

class MemoryStore {
  constructor() {
    this.accounts = new Map();
    this.keys = [];
    this.usageMap = new Map();
    this.nextId = 1;
  }

  async ensureSchema() {}

  async upsertAccount({ userId, email }) {
    const id = String(userId);
    const existing = this.accounts.get(id);
    const account = existing
      ? { ...existing, email: email || existing.email }
      : { user_id: id, email: email || null, plan: "free", stripe_customer_id: null, stripe_subscription_id: null, plan_checked_at: null, created_at: new Date() };
    this.accounts.set(id, account);
    return account;
  }

  async getAccount(userId) {
    return this.accounts.get(String(userId)) || null;
  }

  async setPlan(userId, { plan, stripeCustomerId, stripeSubscriptionId }) {
    const a = this.accounts.get(String(userId));
    if (!a) return;
    Object.assign(a, {
      plan,
      stripe_customer_id: stripeCustomerId || a.stripe_customer_id,
      stripe_subscription_id: stripeSubscriptionId || null,
      plan_checked_at: new Date(),
    });
  }

  async markPlanChecked(userId) {
    const a = this.accounts.get(String(userId));
    if (a) a.plan_checked_at = new Date();
  }

  async listKeys(userId) {
    return this.keys
      .filter((k) => k.user_id === String(userId))
      .map(({ key_hash, user_id, ...rest }) => rest)
      .reverse();
  }

  async countActiveKeys(userId) {
    return this.keys.filter((k) => k.user_id === String(userId) && k.status === "active").length;
  }

  async insertKey({ userId, name, prefix, hash }) {
    const key = { id: this.nextId++, user_id: String(userId), name, prefix, key_hash: hash, status: "active", created_at: new Date(), last_used_at: null, revoked_at: null };
    this.keys.push(key);
    return { id: key.id, name, prefix, status: key.status, created_at: key.created_at };
  }

  async revokeKey(userId, keyId) {
    const k = this.keys.find((x) => x.id === Number(keyId) && x.user_id === String(userId) && x.status === "active");
    if (!k) return null;
    k.status = "revoked";
    k.revoked_at = new Date();
    return k.key_hash;
  }

  async findKeyByHash(hash) {
    const k = this.keys.find((x) => x.key_hash === hash);
    if (!k) return null;
    const a = this.accounts.get(k.user_id) || {};
    return { key_id: k.id, user_id: k.user_id, status: k.status, email: a.email, plan: a.plan || "free", stripe_subscription_id: a.stripe_subscription_id, plan_checked_at: a.plan_checked_at };
  }

  async incrementUsage(userId, day) {
    const key = `${userId}|${day}`;
    const n = (this.usageMap.get(key) || 0) + 1;
    this.usageMap.set(key, n);
    return n;
  }

  async usage(userId) {
    return [...this.usageMap.entries()]
      .filter(([k]) => k.startsWith(`${userId}|`))
      .map(([k, count]) => ({ day: k.split("|")[1], count }))
      .sort((a, b) => b.day.localeCompare(a.day));
  }

  async touchKey(keyId) {
    const k = this.keys.find((x) => x.id === keyId);
    if (k) k.last_used_at = new Date();
  }
}

let store = null;

export function getApiKeyStore() {
  if (!store) store = process.env.API_KEY_STORE === "memory" ? new MemoryStore() : new PgStore();
  return store;
}

// Exposed for the SQL test (runs the real Postgres statements on pg-mem).
export { SCHEMA, PgStore };
