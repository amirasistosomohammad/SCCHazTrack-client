import axios from "axios";

const API_BASE = import.meta.env.VITE_LARAVEL_API;
const ORIGIN = API_BASE?.endsWith("/api") ? API_BASE.slice(0, -4) : API_BASE;
export const AUTH_TOKEN_STORAGE_KEY = "haztrack_auth_token";

export const api = axios.create({
  baseURL: API_BASE,
  // Use Bearer tokens for authentication (see `setAuthToken`).
  // Do not rely on Sanctum cookie-based CSRF flows.
  withCredentials: false,
  headers: {
    Accept: "application/json",
  },
});

export function setAuthToken(token) {
  if (!token) {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    delete api.defaults.headers.common.Authorization;
    return;
  }
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
}

// Restore token on load (keeps login across refresh)
try {
  const saved = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  if (saved) api.defaults.headers.common.Authorization = `Bearer ${saved}`;
} catch {
  // ignore
}

export async function ensureCsrfCookie() {
  // Intentionally disabled: the backend API uses Bearer tokens (personal access tokens)
  // and does not require Sanctum's CSRF cookie endpoint.
  return Promise.resolve();
}

