import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { DetailSkeleton } from "./Skeleton";

/* Client-side gate only — the real API still has to reject
   unauthenticated writes. This is UX, not security.
   While a stored token is being re-validated we show the skeleton
   instead of bouncing to /login and back.

   `adminOnly` is the second gate. Any visitor can register, so "signed in"
   and "runs this site" are different questions — the dashboard answers the
   second one. A member who lands here gets a plain explanation instead of a
   dashboard full of somebody else's numbers. */
export default function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthed, isAdmin, user, logout, checking } = useAuth();
  const location = useLocation();

  if (checking) {
    return (
      <div style={{ paddingTop: 96 }}>
        <DetailSkeleton />
      </div>
    );
  }

  if (!isAuthed) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (adminOnly && !isAdmin) {
    return (
      <div className="wrap" style={{ paddingTop: 120, paddingBottom: 120, maxWidth: 620 }}>
        <div
          style={{
            border: "1px solid var(--line)",
            background: "var(--panel)",
            borderRadius: "var(--radius)",
            padding: "32px 28px",
          }}
        >
          <span style={{ color: "var(--cyan)", fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase" }}>
            Signed in
          </span>
          <h1 style={{ fontSize: 28, margin: "10px 0 14px" }}>This dashboard is the author&rsquo;s.</h1>
          <p style={{ color: "var(--muted)", margin: "0 0 16px" }}>
            You are signed in as <strong style={{ color: "var(--text)" }}>{user?.email}</strong>. This is a
            single-author portfolio, so an account lets you comment on posts — it does not open the
            publishing side.
          </p>
          <p style={{ color: "var(--dim)", fontSize: 14, margin: "0 0 24px" }}>
            The API enforces this too: writes and the contact inbox answer 403 for a member account, not
            just a hidden button here.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <Link className="btn btn-primary" to="/">
              Back to the site
            </Link>
            <Link className="btn btn-ghost" to="/blog">
              Read the blog
            </Link>
            <button className="btn btn-ghost" type="button" onClick={logout} style={{ cursor: "pointer" }}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
