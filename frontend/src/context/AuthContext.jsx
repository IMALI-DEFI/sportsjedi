import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { getMarketingAttribution, trackMarketingEvent } from "../utils/marketingAttribution";

const AuthContext = createContext(null);

const IMALI_API =
  import.meta.env.VITE_IMALI_API_URL ||
  "https://api.imali-defi.com";

const SPORTS_API =
  import.meta.env.VITE_API_BASE_URL ||
  "https://api.sportsjedi.com";

const TOKEN_KEY = "sports_jedi_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  async function loadAccount(token = getToken()) {
    if (!token) {
      setUser(null);
      setAccount(null);
      setLoading(false);
      return null;
    }

    try {
      const response = await fetch(
        `${SPORTS_API}/api/account/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
        }

        throw new Error("Unable to load account");
      }

      const result = await response.json();

      setAccount(result.data);

      setUser({
        id: result.data.id,
        email: result.data.email,
      });

      return result.data;
    } catch (error) {
      console.error("Account load failed:", error);

      setUser(null);
      setAccount(null);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    const response = await fetch(
      `${IMALI_API}/api/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      }
    );

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(
        payload?.error ||
        payload?.message ||
        "Login failed"
      );
    }

    const token = payload?.data?.token;

    if (!token) {
      throw new Error(
        "Authentication token was not returned."
      );
    }

    localStorage.setItem(TOKEN_KEY, token);

    setUser(payload.data.user);

    const sportsAccount = await loadAccount(token);
    if (!sportsAccount) {
      throw new Error("Sign-in succeeded, but SportsJedi could not load your account. Please try again shortly or contact support.");
    }

    return payload;
  }

  async function signup(email, password) {
    const response = await fetch(
      `${IMALI_API}/api/auth/signup`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify((() => {
          const a = getMarketingAttribution();
          return {
            email,
            password,
            tier: "starter",
            strategy: "ai_weighted",
            utm_source: a.utm_source || null,
            utm_medium: a.utm_medium || null,
            utm_campaign: a.utm_campaign || null,
            utm_content: a.utm_content || null,
            marketing_product: "sports_jedi",
            terms_accepted: true,
            accepted_terms: true,
            termsAccepted: true,
            landing_page: a.landing_page || null,
            referral_code: a.referral_code || null,
          };
        })()),
      }
    );

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(
        payload?.error ||
        payload?.message ||
        "Signup failed"
      );
    }

    const token =
      payload?.data?.token ||
      payload?.token;

    if (!token) {
      throw new Error(
        "Signup succeeded but no token was returned."
      );
    }

    localStorage.setItem(TOKEN_KEY, token);

    setUser(
      payload?.data?.user ||
      payload?.user ||
      { email }
    );

    const sportsAccount = await loadAccount(token);
    if (!sportsAccount) {
      throw new Error("Your registration was received, but SportsJedi could not activate your account. Please try signing in; if this continues, contact support. Do not register again.");
    }

    // Start the one-time three-day Pro preview. This is a server-side
    // entitlement with a fixed expiry, never a localStorage flag.
    try {
      const trialResponse = await fetch(`${SPORTS_API}/api/account/trial/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!trialResponse.ok && trialResponse.status !== 409) {
        console.warn("Trial activation returned status:", trialResponse.status);
      }
      // Refresh entitlements so the dashboard immediately reflects Pro access.
      await loadAccount(token);
    } catch (error) {
      console.warn("Trial activation unavailable:", error);
    }
    trackMarketingEvent("signup_completed", {
      userId: payload?.data?.user?.id || payload?.user?.id || null,
    });

    return payload;
  }

  async function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setAccount(null);
  }

  useEffect(() => {
    loadAccount();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        account,
        loading,
        getToken,
        login,
        signup,
        logout,
        refreshAccount: loadAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
