import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  captureMarketingAttribution,
  trackMarketingEvent,
} from "../utils/marketingAttribution";

export default function MarketingTracker() {
  const location = useLocation();

  useEffect(() => {
    captureMarketingAttribution();

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
