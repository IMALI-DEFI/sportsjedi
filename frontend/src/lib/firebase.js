import {
  initializeApp,
  getApp,
  getApps,
} from "firebase/app";

import {
  getAuth,
  GoogleAuthProvider,
} from "firebase/auth";

function env(name, legacyName) {
  return (
    import.meta.env[name] ||
    import.meta.env[legacyName] ||
    ""
  );
}

const config = {
  apiKey: env(
    "VITE_FIREBASE_API_KEY",
    "VITE_APP_FIREBASE_API_KEY"
  ),

  authDomain: env(
    "VITE_FIREBASE_AUTH_DOMAIN",
    "VITE_APP_FIREBASE_AUTH_DOMAIN"
  ),

  projectId: env(
    "VITE_FIREBASE_PROJECT_ID",
    "VITE_APP_FIREBASE_PROJECT_ID"
  ),

  storageBucket: env(
    "VITE_FIREBASE_STORAGE_BUCKET",
    "VITE_APP_FIREBASE_STORAGE_BUCKET"
  ),

  messagingSenderId: env(
    "VITE_FIREBASE_MESSAGING_SENDER_ID",
    "VITE_APP_FIREBASE_MESSAGING_SENDER_ID"
  ),

  appId: env(
    "VITE_FIREBASE_APP_ID",
    "VITE_APP_FIREBASE_APP_ID"
  ),

  measurementId: env(
    "VITE_FIREBASE_MEASUREMENT_ID",
    "VITE_APP_FIREBASE_MEASUREMENT_ID"
  ),
};

export const firebaseReady =
  Boolean(config.apiKey) &&
  Boolean(config.authDomain) &&
  Boolean(config.projectId) &&
  Boolean(config.appId);

let firebaseApp = null;
let firebaseAuth = null;
let provider = null;

if (firebaseReady) {
  firebaseApp =
    getApps().length
      ? getApp()
      : initializeApp(config);

  firebaseAuth =
    getAuth(firebaseApp);

  provider =
    new GoogleAuthProvider();

  provider.setCustomParameters({
    prompt: "select_account",
  });
} else {
  console.warn(
    "Sports Jedi Firebase configuration is incomplete."
  );
}

export const app =
  firebaseApp;

export const auth =
  firebaseAuth;

export const googleProvider =
  provider;
