const STORAGE_KEY = "sports_jedi_marketing_attribution";
const SESSION_KEY = "sports_jedi_marketing_session";

const API =
  import.meta.env.VITE_IMALI_API_URL ||
  "https://api.imali-defi.com";

const MARKETING_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
];

function safeParse(value) {
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

export function getMarketingSessionId() {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id =
      globalThis.crypto?.randomUUID?.() ||
      `sj-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function captureMarketingAttribution() {
  const params = new URLSearchParams(window.location.search);
  const stored = safeParse(localStorage.getItem(STORAGE_KEY));
  const next = { ...stored, product: "sports_jedi" };
  let changed = false;

  for (const key of MARKETING_KEYS) {
    const value = params.get(key);
    if (value && value.trim()) {
      next[key] = value.trim();
      changed = true;
    }
  }

  const ref = params.get("ref");
  if (ref) {
    next.referral_code = ref.trim();
    changed = true;
  }

  if (changed || !stored.product) {
    next.landing_page =
      `${window.location.origin}${window.location.pathname}`;
    next.captured_at = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return next;
}

export function getMarketingAttribution() {
  return captureMarketingAttribution();
}

export function trackMarketingEvent(eventName, extra = {}) {
  try {
    const a = getMarketingAttribution();
    const payload = {
      eventName,
      sessionId: getMarketingSessionId(),
      utmSource: a.utm_source || "direct",
      utmMedium: a.utm_medium || null,
      utmCampaign: a.utm_campaign || null,
      utmContent: a.utm_content || null,
      product: "sports_jedi",
      landingPage: a.landing_page || window.location.href,
      referrer: document.referrer || null,
      ...extra,
    };

    fetch(`${API}/api/analytics/marketing-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Marketing analytics must never break the product.
  }
}
