import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useTitle } from "../hooks/useApi";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  useTitle("Create account");
  const navigate = useNavigate();
  const { register, pending, error, clearError } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [touched, setTouched] = useState(false);

  const bad = {
    name: form.name.trim().length < 2,
    email: !EMAIL_RE.test(form.email.trim()),
    password: form.password.length < 6,
    confirm: form.password !== form.confirm || !form.confirm,
  };

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (error) clearError();
  };

  async function submit(e) {
    e.preventDefault();
    setTouched(true);
    if (bad.name || bad.email || bad.password || bad.confirm) return;

    try {
      await register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      toast("Account created");
      navigate("/admin", { replace: true });
    } catch (err) {
      /* rendered from context */
    }
  }

  return (
    <div className="wrap">
      <div className="auth-wrap">
        <div className="auth-card">
          <h1>Create an account</h1>
          <p className="sub">Needed to comment on posts and open the admin area.</p>

          {error && (
            <div className="form-error" role="alert">
              <b>!</b>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={submit} noValidate>
            <div className={"field" + (touched && bad.name ? " invalid" : "")}>
              <label htmlFor="name">Display name</label>
              <input
                id="name"
                type="text"
                placeholder="Cris"
                autoComplete="nickname"
                value={form.name}
                onChange={set("name")}
              />
              <div className="err">Pick a name with at least 2 characters.</div>
            </div>

            <div className={"field" + (touched && bad.email ? " invalid" : "")}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@school.edu"
                autoComplete="email"
                value={form.email}
                onChange={set("email")}
              />
              <div className="err">Enter a valid email address.</div>
            </div>

            <div className={"field" + (touched && bad.password ? " invalid" : "")}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                autoComplete="new-password"
                value={form.password}
                onChange={set("password")}
              />
              <div className="err">Password must be at least 6 characters.</div>
            </div>

            <div className={"field" + (touched && bad.confirm ? " invalid" : "")}>
              <label htmlFor="confirm">Confirm password</label>
              <input
                id="confirm"
                type="password"
                placeholder="Type it again"
                autoComplete="new-password"
                value={form.confirm}
                onChange={set("confirm")}
              />
              <div className="err">The two passwords do not match.</div>
            </div>

            <button className="btn btn-primary" type="submit" style={{ width: "100%", marginTop: 6 }} disabled={pending}>
              {pending ? <span className="spinner" /> : "Create account"}
            </button>
          </form>

          <div className="form-note">
            Already registered? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
