import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  signInWithPopup,
  signOut,
} from "firebase/auth";

import {
  auth,
  googleProvider,
  firebaseReady,
} from "../lib/firebase";

const AuthContext =
  createContext(null);

const IMALI_API =
  import.meta.env.VITE_IMALI_API_URL ||
  "https://api.imali-defi.com";

const SPORTS_API =
  import.meta.env.VITE_API_BASE_URL ||
  "https://api.sportsjedi.com";

const TOKEN_KEY =
  "sports_jedi_token";

export function AuthProvider({
  children,
}) {
  const [user, setUser] =
    useState(null);

  const [account, setAccount] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  function getToken() {
    return localStorage.getItem(
      TOKEN_KEY
    );
  }

  async function loadAccount(
    token = getToken()
  ) {
    if (!token) {
      setUser(null);
      setAccount(null);
      setLoading(false);
      return null;
    }

    try {
      const response =
        await fetch(
          `${SPORTS_API}/api/account/me`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      if (!response.ok) {
        if (
          response.status === 401
        ) {
          localStorage.removeItem(
            TOKEN_KEY
          );
        }

        throw new Error(
          "Unable to load account"
        );
      }

      const result =
        await response.json();

      setAccount(result.data);

      setUser({
        id: result.data.id,
        email: result.data.email,
      });

      return result.data;
    } catch (error) {
      console.error(
        "Account load failed:",
        error
      );

      setUser(null);
      setAccount(null);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function loginWithGoogle() {
    if (!firebaseReady) {
      throw new Error(
        "Google sign-in needs the Sports Jedi Firebase environment variables."
      );
    }

    if (!auth) {
      throw new Error(
        "Firebase Auth did not initialize."
      );
    }

    if (!googleProvider) {
      throw new Error(
        "Google authentication provider did not initialize."
      );
    }

    const result =
      await signInWithPopup(
        auth,
        googleProvider
      );

    const idToken =
      await result.user.getIdToken();

    const response =
      await fetch(
        `${IMALI_API}/api/auth/google`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id_token: idToken,
            tier: "starter",
            strategy: "ai_weighted",
            accepted_terms: true,
          }),
        }
      );

    const payload =
      await response.json();

    if (!response.ok) {
      throw new Error(
        payload?.error ||
        payload?.message ||
        "Google sign-in failed"
      );
    }

    const token =
      payload?.data?.token;

    if (!token) {
      throw new Error(
        "IMALI authentication token was not returned."
      );
    }

    localStorage.setItem(
      TOKEN_KEY,
      token
    );

    setUser(
      payload.data.user
    );

    await loadAccount(token);

    return payload;
  }

  async function logout() {
    localStorage.removeItem(
      TOKEN_KEY
    );

    try {
      await signOut(auth);
    } catch {}

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
        loginWithGoogle,
        logout,
        refreshAccount:
          loadAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
