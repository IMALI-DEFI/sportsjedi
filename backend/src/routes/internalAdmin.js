import express from "express";

const router = express.Router();

router.get("/admin-status", (req, res) => {
  res.json({
    success: true,
    service: "sports-jedi-api",

    configuration: {
      sportsProvider:
        process.env.SPORTS_PROVIDER || null,

      sportsApiConfigured:
        Boolean(process.env.SPORTS_API_KEY),

      stripeConfigured:
        Boolean(process.env.STRIPE_SECRET_KEY),

      monthlyPriceConfigured:
        Boolean(
          process.env.STRIPE_PRICE_PRO_PRICE_MONTHLY ||
          process.env.STRIPE_PRICE_PRO_MONTHLY
        ),

      annualPriceConfigured:
        Boolean(
          process.env.STRIPE_PRICE_PRO_ANNUAL
        ),
    },
  });
});

export default router;
