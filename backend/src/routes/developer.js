/*
 * Developer self-service, used by sportsjedi.com/developers with the
 * normal Sports Jedi login (JWT via optionalAuth + requireAuth).
 *
 *   GET    /api/developer/plans                 public plan list
 *   GET    /api/developer/account               plan, keys, 30-day usage
 *   POST   /api/developer/keys {name}           create key (shown once)
 *   DELETE /api/developer/keys/:id              revoke key
 *   POST   /api/developer/checkout {plan}       Stripe Checkout for a paid plan
 *   POST   /api/developer/checkout/confirm {sessionId}
 *   POST   /api/developer/billing-portal        manage/cancel subscription
 */
import { Router } from "express";
import Stripe from "stripe";
import { requireAuth } from "../middleware/auth.js";
import { generateApiKey, forgetApiKey } from "../middleware/apiKey.js";
import { getApiKeyStore } from "../services/apiKeyStore.js";
import { API_PLANS, planFor, publicPlans, stripePriceFor } from "../services/apiPlans.js";

const router = Router();
const SITE_URL = process.env.SPORTS_JEDI_URL || "https://sportsjedi.com";

let stripeClient = null;
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    const error = new Error("Billing is not configured");
    error.status = 503;
    throw error;
  }
  stripeClient ||= new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
}

const cleanName = (value) =>
  String(value || "default").replace(/[^\w .-]/g, "").trim().slice(0, 40) || "default";

router.get("/plans", (req, res) => {
  res.json({ success: true, data: publicPlans() });
});

router.use(requireAuth);

async function accountFor(req) {
  return getApiKeyStore().upsertAccount({ userId: req.user.id, email: req.user.email });
}

router.get("/account", async (req, res, next) => {
  try {
    const store = getApiKeyStore();
    const account = await accountFor(req);
    const plan = planFor(account.plan);
    const [keys, usage] = await Promise.all([store.listKeys(req.user.id), store.usage(req.user.id, 30)]);
    const today = new Date().toISOString().slice(0, 10);
    res.set("Cache-Control", "no-store");
    res.json({
      success: true,
      data: {
        plan: plan.id,
        limits: { requestsPerDay: plan.perDay, requestsPerMinute: plan.perMinute, maxKeys: plan.maxKeys },
        usedToday: usage.find((u) => u.day === today)?.count || 0,
        usage,
        keys,
        hasSubscription: Boolean(account.stripe_subscription_id),
        plans: publicPlans(),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/keys", async (req, res, next) => {
  try {
    const store = getApiKeyStore();
    const account = await accountFor(req);
    const plan = planFor(account.plan);
    if ((await store.countActiveKeys(req.user.id)) >= plan.maxKeys) {
      return res.status(409).json({
        success: false,
        error: `Your ${plan.name} plan allows ${plan.maxKeys} active keys. Revoke one or upgrade.`,
        code: "KEY_LIMIT",
      });
    }
    const { key, prefix, hash } = generateApiKey();
    const saved = await store.insertKey({ userId: req.user.id, name: cleanName(req.body?.name), prefix, hash });
    res.set("Cache-Control", "no-store");
    res.status(201).json({
      success: true,
      data: { ...saved, key },
      message: "Copy this key now. It won't be shown again.",
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/keys/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ success: false, error: "Invalid key id", code: "BAD_REQUEST" });
    }
    const hash = await getApiKeyStore().revokeKey(req.user.id, id);
    if (!hash) return res.status(404).json({ success: false, error: "Key not found", code: "NOT_FOUND" });
    forgetApiKey(hash);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post("/checkout", async (req, res, next) => {
  try {
    const planId = String(req.body?.plan || "");
    if (!API_PLANS[planId] || planId === "free") {
      return res.status(400).json({ success: false, error: "plan must be starter or pro", code: "INVALID_PLAN" });
    }
    const price = stripePriceFor(planId);
    if (!price) {
      return res.status(503).json({ success: false, error: `The ${API_PLANS[planId].name} plan isn't on sale yet.`, code: "PLAN_UNAVAILABLE" });
    }
    const account = await accountFor(req);

    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      client_reference_id: String(req.user.id),
      ...(account.stripe_customer_id
        ? { customer: account.stripe_customer_id }
        : { customer_email: req.user.email || undefined }),
      success_url: `${SITE_URL}/developers?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/developers`,
      allow_promotion_codes: true,
      metadata: { app: "sportsjedi", product: "sports_jedi_api", plan: planId, user_id: String(req.user.id) },
      subscription_data: {
        metadata: { app: "sportsjedi", product: "sports_jedi_api", plan: planId, user_id: String(req.user.id) },
      },
    });

    res.json({ success: true, url: session.url });
  } catch (error) {
    next(error);
  }
});

router.post("/checkout/confirm", async (req, res, next) => {
  try {
    const sessionId = String(req.body?.sessionId || "");
    if (!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(sessionId)) {
      return res.status(400).json({ success: false, error: "Invalid checkout session id", code: "BAD_REQUEST" });
    }
    const session = await getStripe().checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });

    // The session must belong to this user and to the API product.
    if (session.metadata?.product !== "sports_jedi_api" || session.metadata?.user_id !== String(req.user.id)) {
      return res.status(403).json({ success: false, error: "This checkout belongs to another account.", code: "FORBIDDEN" });
    }
    const subStatus = session.subscription?.status;
    const paid = session.status === "complete" && ["active", "trialing"].includes(subStatus);
    if (!paid) {
      return res.status(402).json({ success: false, error: "Payment hasn't completed yet.", code: "NOT_PAID" });
    }

    const planId = API_PLANS[session.metadata.plan] ? session.metadata.plan : "free";
    await accountFor(req);
    await getApiKeyStore().setPlan(req.user.id, {
      plan: planId,
      stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
      stripeSubscriptionId: session.subscription?.id,
    });
    forgetApiKey(); // apply the new limits to existing keys right away
    res.json({ success: true, data: { plan: planId } });
  } catch (error) {
    next(error);
  }
});

router.post("/billing-portal", async (req, res, next) => {
  try {
    const account = await accountFor(req);
    if (!account.stripe_customer_id) {
      return res.status(400).json({ success: false, error: "No API subscription on this account.", code: "NO_BILLING_ACCOUNT" });
    }
    const session = await getStripe().billingPortal.sessions.create({
      customer: account.stripe_customer_id,
      return_url: `${SITE_URL}/developers`,
    });
    res.json({ success: true, url: session.url });
  } catch (error) {
    next(error);
  }
});

export default router;
