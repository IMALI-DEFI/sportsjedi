import { Router } from "express";
import Stripe from "stripe";

import {
  requireAuth,
} from "../middleware/auth.js";

import { query } from "../services/database.js";

const router = Router();

// Created on first use so the API boots without Stripe keys (billing portal answers 503).
let stripeClient = null;

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    const error = new Error("Billing is not configured");
    error.status = 503;
    throw error;
  }
  if (!stripeClient) stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
}



router.get("/admin/membership-metrics", requireAuth, async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, error: "Admin access required." });
    }
    const result = await query(
      `SELECT
        (SELECT COUNT(*)::int FROM sports_jedi_trials) AS trials_started,
        (SELECT COUNT(*)::int FROM sports_jedi_trials WHERE ends_at > NOW()) AS active_trials,
        (SELECT COUNT(*)::int FROM sports_jedi_trials WHERE ends_at <= NOW()) AS expired_trials,
        (SELECT COUNT(*)::int FROM product_entitlements
           WHERE product = 'sports_jedi'
           AND status = 'active'
           AND plan IN ('pro','monthly','annual')) AS active_paid_entitlements`
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) { next(error); }
});

router.post("/trial/start", requireAuth, async (req, res, next) => {
  try {
    const user = req.user;
    if (user.isAdmin || (user.isPro && !user.trial)) {
      return res.status(409).json({ success: false, error: "Account already has Pro access." });
    }
    const result = await query(
      `INSERT INTO sports_jedi_trials (user_id, ends_at)
       VALUES ($1, NOW() + INTERVAL '3 days')
       ON CONFLICT (user_id) DO NOTHING
       RETURNING ends_at`,
      [user.id]
    );
    if (!result.rowCount) {
      return res.status(409).json({ success: false, error: "Trial already used." });
    }
    res.json({ success: true, data: { endsAt: result.rows[0].ends_at } });
  } catch (error) { next(error); }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = req.user;

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,

        role:
          user.isAdmin
            ? "admin"
            : "user",

        access:
          user.isAdmin
            ? "admin"
            : user.isPro
              ? "pro"
              : "free",

        isAdmin:
          Boolean(user.isAdmin),

        isPro:
          Boolean(user.isPro),

        trialEndsAt: user.trial?.ends_at || null,

        plan:
          user.entitlement?.plan ||
          "free",

        status:
          user.entitlement?.status ||
          "free",

        stripeCustomerId:
          user.entitlement?.stripe_customer_id ||
          user.stripe_customer_id ||
          null,

        stripeSubscriptionId:
          user.entitlement?.stripe_subscription_id ||
          user.stripe_subscription_id ||
          null,

        features: {
          fullPicks: Boolean(user.isPro),
          fullProps: Boolean(user.isPro),
          playerParlayBuilder: Boolean(user.isPro),
          autoParlay: Boolean(user.isPro),
          saferBuilder: Boolean(user.isPro),
          balancedBuilder: Boolean(user.isPro),
          longShotBuilder: Boolean(user.isPro),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/billing-portal",
  requireAuth,
  async (req, res, next) => {
    try {
      const user = req.user;

      const customerId =
        user.entitlement?.stripe_customer_id ||
        user.stripe_customer_id;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          error:
            "No Stripe billing account is associated with this user.",
          code: "NO_BILLING_ACCOUNT",
        });
      }

      const session =
        await getStripe().billingPortal.sessions.create({
          customer: customerId,
          return_url:
            `${process.env.SPORTS_JEDI_URL || "https://sportsjedi.com"}/account`,
        });

      res.json({
        success: true,
        url: session.url,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
