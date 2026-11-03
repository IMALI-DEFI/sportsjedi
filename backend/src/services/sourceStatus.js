/*
 * Shared health/usage state for the data sources, read by /api/sources/status.
 * Module-level so every route's provider instance reports into one place.
 */
const state = {
  oddsApi: {
    lastFetchAt: null,
    lastError: null,
    lastErrorAt: null,
    requestsRemaining: null,
    requestsUsed: null,
    fallbacks: 0,
  },
  espn: {
    lastFetchAt: null,
    lastError: null,
    lastErrorAt: null,
  },
};

export function recordFetch(source, headers) {
  const entry = state[source];
  if (!entry) return;
  entry.lastFetchAt = new Date().toISOString();
  if (headers && source === "oddsApi") {
    const remaining = headers.get?.("x-requests-remaining");
    const used = headers.get?.("x-requests-used");
    if (remaining != null) entry.requestsRemaining = Number(remaining);
    if (used != null) entry.requestsUsed = Number(used);
  }
}

export function recordError(source, error) {
  const entry = state[source];
  if (!entry) return;
  // Never store anything that could contain the API key.
  entry.lastError = String(error?.message || error)
    .replace(/apiKey=[^&\s]+/gi, "apiKey=***")
    .slice(0, 300);
  entry.lastErrorAt = new Date().toISOString();
}

export function recordFallback() {
  state.oddsApi.fallbacks += 1;
}

export function getSourceStatus() {
  return structuredClone(state);
}
