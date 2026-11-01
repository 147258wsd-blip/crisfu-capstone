/* =========================================================
   HTTP layer
   One axios instance = one place for the base URL, the JWT
   header and error normalisation. Nothing else imports axios.
   ========================================================= */
import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const TOKEN_KEY = "cf.token";
export const SESSION_KEY = "cf.session";
export const UNAUTHORIZED_EVENT = "cf:unauthorized";

export function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch (e) {
    return "";
  }
}

export function writeToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    /* storage disabled — the session simply will not survive a refresh */
  }
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status || 0;
  }
}

export const http = axios.create({
  baseURL: API_BASE,
  timeout: 12000,
  headers: { "Content-Type": "application/json" },
  /* the browser must never serve a cached API response: a comment posted
     a second ago has to show up on the next read */
  cache: "no-store",
});

/* attach the token once, not in every component */
http.interceptors.request.use((config) => {
  const token = readToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* turn every failure into an ApiError with a message we can render.
   A 401 means the token is gone or expired: drop it and tell the app,
   so AuthContext can log the user out instead of every page showing
   its own red "request failed" box. */
http.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response ? err.response.status : 0;

    if (status === 401) {
      writeToken("");
      try {
        localStorage.removeItem(SESSION_KEY);
      } catch (e) {
        /* storage disabled */
      }
      try {
        window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
      } catch (e) {
        /* non-browser */
      }
    }

    const body = err.response && err.response.data;
    const message =
      (body && (body.message || body.error)) ||
      (status === 401
        ? "Your session expired. Please sign in again."
        : status === 0
        ? "Cannot reach the server. Is the API running?"
        : "Request failed.");
    return Promise.reject(new ApiError(message, status));
  }
);
