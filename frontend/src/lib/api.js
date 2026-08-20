const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "https://api.sportsjedi.com";

const TOKEN_KEY = "sports_jedi_token";

function token() {
  return localStorage.getItem(TOKEN_KEY);
}

async function request(
  path,
  options = {}
) {
  const authToken = token();

  const headers = {
    ...(options.body
      ? { "Content-Type": "application/json" }
      : {}),
    ...(options.headers || {}),
  };

  if (authToken) {
    headers.Authorization =
      `Bearer ${authToken}`;
  }

  const response = await fetch(
    `${API_BASE}${path}`,
    {
      ...options,
      headers,
    }
  );

  const payload =
    await response.json();

  if (!response.ok) {
    const error =
      new Error(
        payload?.error ||
        "Sports Jedi request failed"
      );

    error.status =
      response.status;

    error.code =
      payload?.code;

    error.payload =
      payload;

    throw error;
  }

  return payload;
}

export function assetUrl(path = "") {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_BASE}${path}`;
}

export const sportsApi = {
  games(league) {
    return request(
      `/api/games${
        league && league !== "ALL"
          ? `?league=${encodeURIComponent(league)}`
          : ""
      }`
    );
  },

  game(id) {
    return request(
      `/api/games/${id}`
    );
  },

  analysis(id) {
    return request(
      `/api/games/${id}/analysis`
    );
  },

  picks(league) {
    return request(
      `/api/picks${
        league
          ? `?league=${encodeURIComponent(league)}`
          : ""
      }`
    );
  },

  props(league) {
    return request(
      `/api/picks/props?league=${encodeURIComponent(league)}`
    );
  },

  autoParlay(
    league,
    mode = "balanced"
  ) {
    return request(
      `/api/parlays/auto?league=${encodeURIComponent(league)}&mode=${encodeURIComponent(mode)}`
    );
  },

  playerParlay(selections) {
    return request(
      "/api/parlays/player",
      {
        method: "POST",
        body: JSON.stringify({
          selections,
        }),
      }
    );
  },

  account() {
    return request(
      "/api/account/me"
    );
  },
};

export default sportsApi;

/*
 * Backward-compatible named export.
 * Existing Sports Jedi pages import { api }.
 */
export const api = sportsApi;
