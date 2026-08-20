const BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "https://api.sportsjedi.com";

async function request(path, opts = {}) {
  const token =
    localStorage.getItem("sports_jedi_token");

  const headers = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  const res = await fetch(
    `${BASE}${path}`,
    {
      ...opts,
      headers,
    }
  );

  const body =
    await res.json().catch(() => ({}));

  if (!res.ok || body.success === false) {
    const error = new Error(
      body.error ||
      `Request failed (${res.status})`
    );

    error.status = res.status;
    error.code = body.code;
    error.payload = body;

    throw error;
  }

  /*
   * IMPORTANT:
   * Preserve original Sports Jedi response shape.
   */
  return body.data ?? body;
}

export function assetUrl(path = "") {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${BASE}${path}`;
}

export const api = {
  games: (league = "") =>
    request(
      `/api/games${
        league
          ? `?league=${encodeURIComponent(league)}`
          : ""
      }`
    ),

  game: (id) =>
    request(`/api/games/${id}`),

  analysis: (id) =>
    request(`/api/games/${id}/analysis`),

  teams: (league = "") =>
    request(
      `/api/teams${
        league
          ? `?league=${encodeURIComponent(league)}`
          : ""
      }`
    ),

  picks: (league = "") =>
    request(
      `/api/picks${
        league
          ? `?league=${encodeURIComponent(league)}`
          : ""
      }`
    ),

  props: (league = "") =>
    request(
      `/api/picks/props${
        league
          ? `?league=${encodeURIComponent(league)}`
          : ""
      }`
    ),

  analyzeParlay: (legs) =>
    request("/api/parlays/analyze", {
      method: "POST",
      body: JSON.stringify({ legs }),
    }),

  blog: () =>
    request("/api/blog"),

  blogPost: (slug) =>
    request(
      `/api/blog/${encodeURIComponent(slug)}`
    ),


  autoParlay: (
    league,
    mode = "balanced"
  ) =>
    request(
      `/api/parlays/auto?league=${encodeURIComponent(league)}&mode=${encodeURIComponent(mode)}`
    ),

  playerParlay: (selections) =>
    request(
      "/api/parlays/player",
      {
        method: "POST",
        body: JSON.stringify({
          selections,
        }),
      }
    ),

  account: () =>
    request("/api/account/me"),
};
