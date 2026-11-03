import jwt from "jsonwebtoken";

import {
  getUser,
  getUserByEmail,
  getEntitlement,
  getActiveTrial,
} from "../services/database.js";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.AUTH_JWT_SECRET ||
  "";

const ADMIN_EMAILS = new Set(
  String(
    process.env.SPORTS_JEDI_ADMIN_EMAILS ||
    ""
  )
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

export async function optionalAuth(req, res, next) {
  try {
    const header =
      req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {
      req.user = null;
      return next();
    }

    if (!JWT_SECRET) {
      return res.status(503).json({
        success: false,
        error: "Authentication is not configured.",
      });
    }

    const token =
      header.slice(7).trim();

    const payload =
      jwt.verify(token, JWT_SECRET, {
        algorithms: ["HS256"],
      });

    let user = null;

    if (
      payload.sub &&
      payload.sub !== "admin"
    ) {
      user = await getUser(payload.sub);
    }

    /*
     * IMALI and Sports Jedi can have users that
     * were created in different account stores.
     * Email provides the safe synchronization path.
     */
    if (!user && payload.email) {
      user =
        await getUserByEmail(payload.email);
    }

    if (!user) {
      req.user = null;
      return next();
    }

    const entitlement =
      await getEntitlement(user.id);

    const email =
      String(user.email || "")
        .toLowerCase();

    const isAdmin =
      Boolean(user.is_admin) ||
      ADMIN_EMAILS.has(email) ||
      Boolean(entitlement?.access_override);

    const trial = await getActiveTrial(user.id);
    const isPro =
      isAdmin ||
      Boolean(trial) ||
      (
        entitlement?.status === "active" &&
        [
          "pro",
          "monthly",
          "annual",
          "admin",
        ].includes(entitlement?.plan)
      );

    req.user = {
      ...user,
      entitlement,
      trial,
      isAdmin,
      isPro,
    };

    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      req.user = null;
      return next();
    }

    next(error);
  }
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Sign in required.",
      code: "AUTH_REQUIRED",
    });
  }

  next();
}

export function requirePro(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Sign in to unlock Sports Jedi Pro.",
      code: "AUTH_REQUIRED",
    });
  }

  if (!req.user.isPro) {
    return res.status(403).json({
      success: false,
      error: "Sports Jedi Pro is required.",
      code: "PRO_REQUIRED",
      upgradeUrl:
        "https://sportsjedi.com/pricing",
    });
  }

  next();
}
