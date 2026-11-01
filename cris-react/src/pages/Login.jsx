import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useTitle } from "../hooks/useApi";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* only allow same-site paths — an open redirect here would be embarrassing */
function safeNext(raw) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/admin";
  return raw;
}

export default function Login() {
  useTitle("Sign in");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login, loginDemo, pending, error, clearError } = useAuth();
  const toast = useToast();

  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });

  const emailBad = touched.email && !EMAIL_RE.test(email.trim());
  const passBad = touched.password && password.length < 6;

  async function submit(e) {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!EMAIL_RE.test(email.trim()) || password.length < 6) return;

    try {
      await login({ email: email.trim(), password });
      toast("Signed in");
      navigate(next, { replace: true });
    } catch (err) {
      /* the message is already rendered from context */
    }
  }

  async function demo() {
    try {
      await loginDemo();
      toast("Signed in as demo");
      navigate(next, { replace: true });
    } catch (err) {
      /* ignore */
    }
  }

  return (
    <div className="wrap">
      <div className="auth-wrap">
        <div className="auth-card">
          <h1>Welcome back</h1>
          <p className="sub">Sign in to manage projects, posts and comments.</p>

          {error && (
            <div className="form-error" role="alert">
              <b>!</b>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={submit} noValidate>
            <div className={"field" + (emailBad ? " invalid" : "")}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@school.edu"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) clearError();
                }}
              />
              <div className="err">Enter a valid email address.</div>
            </div>

            <div className={"field" + (passBad ? " invalid" : "")}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) clearError();
                }}
              />
              <div className="err">Password must be at least 6 characters.</div>
            </div>

            <button className="btn btn-primary" type="submit" style={{ width: "100%", marginTop: 6 }} disabled={pending}>
              {pending ? <span className="spinner" /> : "Sign in"}
            </button>
          </form>

          <div className="form-note">
            No account yet? <Link to="/register">Create one</Link>
          </div>
          <div className="auth-alt">
            <button type="button" onClick={demo} disabled={pending}>
              Use a demo account →
            </button>
          </div>
          <p className="form-hint">
            Demo mode: any valid email and a 6+ character password works. Use <code>wrongpass</code> to see
            a rejected sign-in.
          </p>
        </div>
      </div>
    </div>
  );
}
