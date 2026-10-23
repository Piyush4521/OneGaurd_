import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

// OneGuard LPG Firebase Web App Configuration
export const firebaseConfig = {
  apiKey: "AIzaSyBxzgHRkj1lTxH0XuZQfR5qF-lC9mYHgzw",
  authDomain: "onegaurd-lpg.firebaseapp.com",
  projectId: "onegaurd-lpg",
  storageBucket: "onegaurd-lpg.firebasestorage.app",
  messagingSenderId: "424566895273",
  appId: "1:424566895273:web:e2895151a958c722366fb8",
  measurementId: "G-71X7Y3MG30",
  databaseURL: "https://onegaurd-lpg-default-rtdb.firebaseio.com",
};

// Singleton initialization safe for SSR and client re-renders
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Realtime Database instance (client-side)
export const database = typeof window !== "undefined" ? getDatabase(app) : null;

// Firebase Auth instance (client-side)
export const auth = typeof window !== "undefined" ? getAuth(app) : null;

// Safe analytics initializer (only executes in browser environment)
export async function initAnalytics() {
  if (typeof window !== "undefined" && (await isSupported())) {
    try {
      return getAnalytics(app);
    } catch (e) {
      console.warn("Firebase Analytics initialization skipped:", e);
    }
  }
  return null;
}
