import { useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { useTitle } from "../hooks/useApi";
import { api } from "../services/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Contact() {
  useTitle("Contact");
  const toast = useToast();

  const [form, setForm] = useState({ name: "", email: "", msg: "" });
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(null);
  const [sent, setSent] = useState(null);

  const bad = {
    name: form.name.trim().length < 2,
    email: !EMAIL_RE.test(form.email.trim()),
    msg: form.msg.trim().length < 10,
  };

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (failed) setFailed(null);
  };

  async function submit(e) {
    e.preventDefault();
    setTouched(true);
    if (bad.name || bad.email || bad.msg) return;

    setSending(true);
    setFailed(null);
    try {
      await api.contact.send({
        name: form.name.trim(),
        email: form.email.trim(),
        msg: form.msg.trim(),
      });
      setSent({ name: form.name.trim(), email: form.email.trim() });
      toast("Message sent");
    } catch (err) {
      setFailed(err.message || "Could not send the message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="wrap">
      <div className="page-head">
        <span className="kicker">
          <span className="num">04</span>Contact
        </span>
        <h1>Say hello</h1>
        <p>
          Internships, side projects, or a technical argument you want a second opinion on. I read
          everything and usually reply within two days.
        </p>
      </div>

      <div className="contact-grid">
        <div>
          <div className="info-block">
            <div className="k">Email</div>
            <div className="v">
              <a href="mailto:hello@crisfu.dev">hello@crisfu.dev</a>
            </div>
          </div>
          <div className="info-block">
            <div className="k">Elsewhere</div>
            <div className="v">
              <a href="#">GitHub</a> · <a href="#">LinkedIn</a>
            </div>
          </div>
          <div className="info-block">
            <div className="k">Based in</div>
            <div className="v">Shanghai, China · UTC+8</div>
          </div>
          <div className="info-block">
            <div className="k">Currently</div>
            <div className="v">Looking for a 2026 summer internship in full-stack or platform engineering.</div>
          </div>
        </div>

        <div>
          {sent ? (
            <div className="success">
              <h3>Message sent</h3>
              <p>
                Thanks, {sent.name}. I'll get back to you at {sent.email}.
              </p>
              <Link className="btn btn-ghost btn-sm" to="/projects">
                Have a look at the work
              </Link>
            </div>
          ) : (
            <div className="form-card">
              <h2>Send a message</h2>
              <p className="sub">No account needed. I do not add you to a list.</p>

              {failed && (
                <div className="form-error" role="alert">
                  <b>!</b>
                  <span>{failed}</span>
                </div>
              )}

              <form onSubmit={submit} noValidate>
                <div className={"field" + (touched && bad.name ? " invalid" : "")}>
                  <label htmlFor="name">Your name</label>
                  <input id="name" type="text" placeholder="Your name" autoComplete="name" value={form.name} onChange={set("name")} />
                  <div className="err">Please tell me what to call you.</div>
                </div>

                <div className={"field" + (touched && bad.email ? " invalid" : "")}>
                  <label htmlFor="email">Email</label>
                  <input id="email" type="email" placeholder="you@example.com" autoComplete="email" value={form.email} onChange={set("email")} />
                  <div className="err">That email does not look right.</div>
                </div>

                <div className={"field" + (touched && bad.msg ? " invalid" : "")}>
                  <label htmlFor="msg">Message</label>
                  <textarea id="msg" maxLength={800} placeholder="What are you working on?" value={form.msg} onChange={set("msg")} />
                  <div className="err">A sentence or two, at least.</div>
                </div>

                <button className="btn btn-primary" type="submit" style={{ width: "100%" }} disabled={sending}>
                  {sending ? <span className="spinner" /> : "Send message"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
