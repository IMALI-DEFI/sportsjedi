import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  captureMarketingAttribution,
  getMarketingSessionId,
  trackMarketingEvent,
} from "../utils/marketingAttribution";

export default function MarketingTracker() {
  const location = useLocation();

  useEffect(() => {
    const attribution = captureMarketingAttribution();

    if (attribution.referral_code) {
      const clickKey = `sports_jedi_ref_click_${attribution.referral_code}`;
      if (!sessionStorage.getItem(clickKey)) {
        sessionStorage.setItem(clickKey, "1");
        fetch("https://api.imali-defi.com/api/referrals/click", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: attribution.referral_code,
            visitor_id: getMarketingSessionId(),
            source: attribution.utm_source || "sportsjedi",
            medium: attribution.utm_medium || "referral",
            campaign: attribution.utm_campaign || "sports_jedi_partner",
            landing_path: location.pathname,
          }),
          keepalive: true,
        }).catch(() => {});
      }
    }

    const eventName =
      location.pathname === "/pricing"
        ? "pricing_view"
        : "landing_view";

    trackMarketingEvent(eventName, {
      metadata: {
        path: location.pathname,
      },
    });
  }, [location.pathname, location.search]);

  return null;
}
