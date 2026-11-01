import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { DetailSkeleton } from "./Skeleton";

/* Client-side gate only — the real API still has to reject
   unauthenticated writes. This is UX, not security.
   While a stored token is being re-validated we show the skeleton
   instead of bouncing to /login and back. */
export default function ProtectedRoute({ children }) {
  const { isAuthed, checking } = useAuth();
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

  return children;
}
