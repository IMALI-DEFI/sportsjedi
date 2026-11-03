import { createHash, randomBytes } from "node:crypto";
import Stripe from "stripe";
import { getApiKeyStore } from "../services/apiKeyStore.js";
import { planFor } from "../services/apiPlans.js";

const KEY_PATTERN = /^sj_live_[A-Za-z0-9]{32}$/;
const LOOKUP_CACHE_MS = 60 * 1000;
const PLAN_RECHECK_MS = 24 * 60 * 60 * 1000;
const ACTIVE_SUBSCRIPTION = new Set(["active", "trialing", "past_due"]);

const lookupCache = new Map();
const minuteWindows = new Map();
const lastTouched = new Map();

export const hashApiKey = (key) => createHash("sha256").update(String(key)).digest("hex");

export function generateApiKey() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let body = "";
  while (body.length < 32) {
    for (const b of randomBytes(48)) {
      // 248 = 4 * 62: drop higher bytes so every character is equally likely.
      if (b < 248 && body.length < 32) body += alphabet[b % alphabet.length];
    }
  }
  const key = `sj_live_${body}`;
  return { key, prefix: key.slice(0, 12), hash: hashApiKey(key) };
}

// Call after revoking a key or changing a plan so the change applies immediately.
export function forgetApiKey(hash) {
  if (hash) lookupCache.delete(hash);
  else lookupCache.clear();
}

function fail(res, status, code, error, headers = {}) {
  res.set(headers);
  return res.status(status).json({ success: false, error, code });
}

let stripeClient = null;
function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  stripeClient ||= new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
}

/*
 * Paid plans are re-verified against Stripe at most once a day, so a
 * cancelled subscription drops to Free without needing a webhook.
 * If Stripe can't be reached, the current plan is kept.
 */
async function verifyPaidPlan(store, row) {
  if (row.plan === "free" || !row.stripe_subscription_id) return row.plan;
  const checked = row.plan_checked_at ? new Date(row.plan_checked_at).getTime() : 0;
  if (Date.now() - checked < PLAN_RECHECK_MS) return row.plan;

  const client = stripe();
  if (!client) return row.plan;
  try {
    const sub = await client.subscriptions.retrieve(row.stripe_subscription_id);
    if (ACTIVE_SUBSCRIPTION.has(sub.status)) {
      await store.markPlanChecked(row.user_id);
      return row.plan;
    }
    await store.setPlan(row.user_id, { plan: "free", stripeSubscriptionId: null });
    return "free";
  } catch (error) {
    console.error("API plan check failed:", error.message);
    return row.plan;
  }
}

async function lookup(store, hash) {
  const hit = lookupCache.get(hash);
  if (hit && Date.now() - hit.time < LOOKUP_CACHE_MS) return hit.row;
  const row = await store.findKeyByHash(hash);
  if (row) row.plan = await verifyPaidPlan(store, row);
  lookupCache.set(hash, { time: Date.now(), row });
  if (lookupCache.size > 5000) lookupCache.delete(lookupCache.keys().next().value);
  return row;
}

function minuteCount(userId) {
  const now = Date.now();
  let w = minuteWindows.get(userId);
  if (!w || now >= w.resetAt) {
    w = { count: 0, resetAt: now + 60 * 1000 };
    minuteWindows.set(userId, w);
  }
  w.count++;
  return w;
}

function secondsUntilUtcMidnight() {
  const now = new Date();
  const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.ceil((midnight - now.getTime()) / 1000);
}

export async function requireApiKey(req, res, next) {
  try {
    const key = String(req.get("x-api-key") || "").trim();
    if (!key) {
      return fail(res, 401, "API_KEY_REQUIRED", "Send your API key in the X-API-Key header. Get one at https://sportsjedi.com/developers");
    }
    if (!KEY_PATTERN.test(key)) {
      return fail(res, 401, "INVALID_API_KEY", "API key is not valid.");
    }

    const store = getApiKeyStore();
    const hash = hashApiKey(key);
    const row = await lookup(store, hash);
    if (!row || row.status !== "active") {
      return fail(res, 401, "INVALID_API_KEY", "API key is not valid or has been revoked.");
    }

    const plan = planFor(row.plan);

    const minute = minuteCount(row.user_id);
    if (minute.count > plan.perMinute) {
      const retry = Math.max(1, Math.ceil((minute.resetAt - Date.now()) / 1000));
      return fail(res, 429, "RATE_LIMITED", `Plan limit of ${plan.perMinute} requests per minute reached.`, { "Retry-After": String(retry) });
    }

    const day = new Date().toISOString().slice(0, 10);
    const used = await store.incrementUsage(row.user_id, day);
    const resetIn = secondsUntilUtcMidnight();
    res.set({
      "X-RateLimit-Limit": String(plan.perDay),
      "X-RateLimit-Remaining": String(Math.max(0, plan.perDay - used)),
      "X-RateLimit-Reset": String(resetIn),
      "X-Plan": plan.id,
    });
    if (used > plan.perDay) {
      return fail(res, 429, "DAILY_QUOTA_EXCEEDED", `Plan limit of ${plan.perDay} requests per day reached. Upgrade at https://sportsjedi.com/developers`, { "Retry-After": String(resetIn) });
    }

    const lastTouch = lastTouched.get(row.key_id) || 0;
    if (Date.now() - lastTouch > 60 * 1000) {
      lastTouched.set(row.key_id, Date.now());
      store.touchKey(row.key_id).catch(() => {});
    }

    req.apiClient = { keyId: row.key_id, userId: row.user_id, plan, usedToday: used };
    next();
  } catch (error) {
    next(error);
  }
}
