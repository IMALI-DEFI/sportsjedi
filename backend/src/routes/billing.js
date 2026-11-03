import { Router } from "express";
import Stripe from "stripe";

const router = Router();

/*
 * Created on first use so the API still boots (games, picks, health)
 * when Stripe isn't configured; billing routes then answer 503.
 */
let stripeClient = null;

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    const error = new Error("Billing is not configured");
    error.status = 503;
    throw error;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
}

const SITE_URL =
  process.env.SPORTS_JEDI_URL ||
  "https://sportsjedi.com";

const PRICES = {
  monthly:
    process.env.STRIPE_PRICE_PRO_MONTHLY,
  annual:
    process.env.STRIPE_PRICE_PRO_ANNUAL,
};

router.post("/checkout", async (req, res, next) => {
  try {
    const plan =
      req.body?.plan === "annual"
        ? "annual"
        : "monthly";

    const price = PRICES[plan];
    const attribution = req.body?.attribution || {};

    if (!price) {
      return res.status(503).json({
        success: false,
        error: `Stripe ${plan} price is not configured`,
      });
    }

    const session =
      await getStripe().checkout.sessions.create({
        mode: "subscription",

        line_items: [
          {
            price,
            quantity: 1,
          },
        ],

        success_url:
          `${SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,

        cancel_url:
          `${SITE_URL}/pricing`,

        allow_promotion_codes: true,

        metadata: {
          app: "sportsjedi",
          product: "sports_jedi_pro",
          plan,
          marketing_session_id: String(attribution.session_id || "").slice(0, 128),
          utm_source: String(attribution.utm_source || "").slice(0, 128),
          utm_medium: String(attribution.utm_medium || "").slice(0, 128),
          utm_campaign: String(attribution.utm_campaign || "").slice(0, 200),
          utm_content: String(attribution.utm_content || "").slice(0, 200),
          referral_code: String(attribution.referral_code || "").slice(0, 80),
        },
      });

    res.json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/session/:id", async (req, res, next) => {
  try {
    if (!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid checkout session id",
      });
    }

    const session =
      await getStripe().checkout.sessions.retrieve(
        req.params.id,
        {
          expand: [
            "subscription",
            "customer",
          ],
        }
      );

    res.json({
      success: true,
      data: {
        id: session.id,
        status: session.status,
        paymentStatus:
          session.payment_status,
        customerEmail:
          session.customer_details?.email ||
          session.customer?.email ||
          null,
        subscriptionStatus:
          session.subscription?.status ||
          null,
        customerId:
          session.customer?.id ||
          session.customer ||
          null,
        subscriptionId:
          session.subscription?.id ||
          session.subscription ||
          null,
        metadata: session.metadata || {},
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
