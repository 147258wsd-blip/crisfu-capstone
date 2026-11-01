import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, readSession, clearSession, USE_MOCK } from "../services/api";
import { UNAUTHORIZED_EVENT } from "../services/http";

/* AuthContext holds the one piece of state that every page cares about.
   Swapping mock auth for real JWT means changing api.auth only. */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readSession());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  /* true only while a stored token is being re-validated against the API */
  const [checking, setChecking] = useState(() => !USE_MOCK && !!readSession());

  /* A token sitting in localStorage proves nothing: it may have expired
     hours ago. In real mode ask the API who we are before trusting it,
     otherwise /admin renders for a second and then every request 401s. */
  useEffect(() => {
    if (USE_MOCK || !readSession()) {
      setChecking(false);
      return undefined;
    }
    let alive = true;
    api.auth
      .me()
      .then((session) => {
        if (!alive) return;
        if (session) setUser(session);
        else {
          clearSession();
          setUser(null);
        }
      })
      .catch(() => {
        /* 401 already cleared the token in the http interceptor */
        if (!alive) return;
        clearSession();
        setUser(null);
      })
      .finally(() => {
        if (alive) setChecking(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  /* any 401 anywhere in the app ends the session exactly once, here */
  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
      setError("Your session expired. Please sign in again.");
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const login = useCallback(async (credentials) => {
    setPending(true);
    setError(null);
    try {
      const session = await api.auth.login(credentials);
      setUser(session);
      return session;
    } catch (err) {
      setError(err.message || "Could not sign in.");
      throw err;
    } finally {
      setPending(false);
    }
  }, []);

  const loginDemo = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      const session = await api.auth.login({ email: "hello@crisfu.dev", password: "demo123" });
      setUser(session);
      return session;
    } finally {
      setPending(false);
    }
  }, []);

  const register = useCallback(async (payload) => {
    setPending(true);
    setError(null);
    try {
      const session = await api.auth.register(payload);
      setUser(session);
      return session;
    } catch (err) {
      setError(err.message || "Could not create the account.");
      throw err;
    } finally {
      setPending(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthed: !!user,
      checking,
      pending,
      error,
      clearError: () => setError(null),
      login,
      loginDemo,
      register,
      logout,
    }),
    [user, checking, pending, error, login, loginDemo, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
