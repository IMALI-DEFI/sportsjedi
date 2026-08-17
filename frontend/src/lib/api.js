const BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:4100";

async function request(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
    ...opts,
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok || body.success === false) {
    throw new Error(
      body.error ||
      `Request failed (${res.status})`
    );
  }

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
};
