import { Router } from "express";
import Stripe from "stripe";

const router = Router();

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY
);

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
      return res.status(500).json({
        success: false,
        error: `Stripe ${plan} price is not configured`,
      });
    }

    const session =
      await stripe.checkout.sessions.create({
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
    const session =
      await stripe.checkout.sessions.retrieve(
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
        metadata: session.metadata || {},
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
