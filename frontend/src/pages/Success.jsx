import { useEffect } from "react";
import {
  CheckCircle2,
  Crown,
} from "lucide-react";

import { Link } from "react-router-dom";
import { trackMarketingEvent } from "../utils/marketingAttribution";

const API =
  import.meta.env.VITE_API_BASE_URL ||
  "https://api.sportsjedi.com";

export default function Success() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId) return;

    fetch(`${API}/api/billing/session/${encodeURIComponent(sessionId)}`)
      .then((r) => r.json())
      .then((result) => {
        const data = result?.data || {};
        const paid =
          data.paymentStatus === "paid" ||
          data.subscriptionStatus === "active";

        if (!paid) return;

        const key = `sports_jedi_purchase_${sessionId}`;
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, "1");

        trackMarketingEvent("purchase_completed", {
          metadata: {
            checkout_session_id: data.id,
            plan: data.metadata?.plan || null,
            product: data.metadata?.product || "sports_jedi_pro",
          },
          utmSource: data.metadata?.utm_source || undefined,
          utmMedium: data.metadata?.utm_medium || undefined,
          utmCampaign: data.metadata?.utm_campaign || undefined,
          utmContent: data.metadata?.utm_content || undefined,
          sessionId:
            data.metadata?.marketing_session_id || undefined,
        });
      })
      .catch(() => {});
  }, []);

  return (
    <main className="shell success-page">
      <section className="success-card">
        <CheckCircle2 size={70} />

        <span className="eyebrow">
          <Crown size={14} />
          Sports Jedi Pro
        </span>

        <h1>You&apos;re in.</h1>

        <p>
          Your Sports Jedi Pro
          subscription checkout was
          completed.
        </p>

        <Link
          className="primary-btn"
          to="/picks"
        >
          Open Jedi Picks
        </Link>
      </section>
    </main>
  );
}
