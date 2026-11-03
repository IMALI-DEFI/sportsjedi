/*
 * Developer API plans. Limits are enforced per account (all of an
 * account's keys share them). Stripe price IDs and display prices come
 * from env so pricing can change without a code deploy.
 */
export const API_PLANS = {
  free: {
    id: "free",
    name: "Free",
    perDay: 100,
    perMinute: 10,
    props: false,
    maxKeys: 2,
    priceEnv: null,
    priceLabelEnv: null,
    defaultPriceLabel: "$0",
  },
  starter: {
    id: "starter",
    name: "Starter",
    perDay: 5000,
    perMinute: 60,
    props: false,
    maxKeys: 5,
    priceEnv: "STRIPE_PRICE_API_STARTER",
    priceLabelEnv: "API_PRICE_LABEL_STARTER",
    defaultPriceLabel: "$19/mo",
  },
  pro: {
    id: "pro",
    name: "Pro",
    perDay: 50000,
    perMinute: 300,
    props: true,
    maxKeys: 10,
    priceEnv: "STRIPE_PRICE_API_PRO",
    priceLabelEnv: "API_PRICE_LABEL_PRO",
    defaultPriceLabel: "$79/mo",
  },
};

export function planFor(id) {
  return API_PLANS[id] || API_PLANS.free;
}

export function stripePriceFor(id) {
  const plan = API_PLANS[id];
  return plan?.priceEnv ? process.env[plan.priceEnv] || null : null;
}

export function publicPlans() {
  return Object.values(API_PLANS).map((plan) => ({
    id: plan.id,
    name: plan.name,
    price: (plan.priceLabelEnv && process.env[plan.priceLabelEnv]) || plan.defaultPriceLabel,
    requestsPerDay: plan.perDay,
    requestsPerMinute: plan.perMinute,
    playerProps: plan.props,
    maxKeys: plan.maxKeys,
    purchasable: plan.id === "free" || Boolean(stripePriceFor(plan.id)),
  }));
}
