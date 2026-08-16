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
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
