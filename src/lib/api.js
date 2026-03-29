import axios from "axios";

const API_BASE = import.meta.env.VITE_LARAVEL_API;
const ORIGIN = API_BASE?.endsWith("/api") ? API_BASE.slice(0, -4) : API_BASE;
export const AUTH_TOKEN_STORAGE_KEY = "haztrack_auth_token";

const MAX_RETRIES = Number(import.meta.env.VITE_API_MAX_RETRIES ?? 4);
const RETRY_BASE_MS = Number(import.meta.env.VITE_API_RETRY_BASE_MS ?? 400);
const DEFAULT_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 90_000);
const UPLOAD_TIMEOUT_MS = Number(import.meta.env.VITE_API_UPLOAD_TIMEOUT_MS ?? 180_000);

const RETRYABLE_STATUS = new Set([502, 503, 504]);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryableTransportError(error) {
  const status = error.response?.status;
  if (status && RETRYABLE_STATUS.has(status)) return true;
  const code = error.code;
  return (
    code === "ECONNABORTED" ||
    code === "ERR_NETWORK" ||
    code === "ETIMEDOUT" ||
    (typeof error.message === "string" && /network error/i.test(error.message))
  );
}

/** Avoid duplicating unsafe POSTs (e.g. register) on ambiguous gateway failures. */
function shouldRetryRequestConfig(config) {
  const method = (config.method || "get").toLowerCase();
  if (method === "get" || method === "head") return true;
  if (method === "put" || method === "patch" || method === "delete") return true;
  if (method !== "post") return false;
  const path = String(config.url || "").replace(/\?.*$/, "");
  return (
    path.endsWith("/auth/login") ||
    path.endsWith("auth/login")
  );
}

export const api = axios.create({
  baseURL: API_BASE,
  // Use Bearer tokens for authentication (see `setAuthToken`).
  // Do not rely on Sanctum cookie-based CSRF flows.
  withCredentials: false,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    Accept: "application/json",
  },
});

api.interceptors.request.use((config) => {
  const data = config.data;
  const isFormData =
    typeof FormData !== "undefined" && data instanceof FormData;
  if (isFormData) {
    config.timeout = UPLOAD_TIMEOUT_MS;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!config || MAX_RETRIES <= 0 || config.__retryAttempt >= MAX_RETRIES) {
      return Promise.reject(error);
    }
    if (!isRetryableTransportError(error) || !shouldRetryRequestConfig(config)) {
      return Promise.reject(error);
    }
    config.__retryAttempt = (config.__retryAttempt || 0) + 1;
    const jitter = Math.floor(Math.random() * 120);
    await sleep(RETRY_BASE_MS * 2 ** (config.__retryAttempt - 1) + jitter);
    return api(config);
  }
);

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

