import { Link } from "react-router-dom";
import { useTitle } from "../hooks/useApi";

export default function NotFound() {
  useTitle("Not found");

  return (
    <div className="wrap">
      <div className="auth-wrap">
        <div style={{ textAlign: "center", maxWidth: 460 }}>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 72,
              fontWeight: 700,
              letterSpacing: "-4px",
              background: "linear-gradient(100deg,var(--cyan),var(--violet))",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              lineHeight: 1,
            }}
          >
            404
          </div>
          <h1 style={{ margin: "14px 0 10px", fontSize: 24, letterSpacing: "-.4px" }}>This page never existed</h1>
          <p style={{ color: "var(--muted)", margin: "0 0 26px", fontSize: 14.5 }}>
            Or it did, and I renamed it without telling anyone. Either way, here are two doors.
          </p>
          <div className="hero-actions" style={{ justifyContent: "center" }}>
            <Link className="btn btn-primary" to="/">
              Back home
            </Link>
            <Link className="btn btn-ghost" to="/projects">
              See the work
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
