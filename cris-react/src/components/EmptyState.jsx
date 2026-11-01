import { Link } from "react-router-dom";

export default function EmptyState({ icon = "·", title, message, actionTo, actionLabel }) {
  return (
    <div className="state-box">
      <div className="ico">{icon}</div>
      <p className="ttl">{title || "Nothing here yet"}</p>
      {message && <p className="txt">{message}</p>}
      {actionTo && (
        <div className="acts">
          <Link className="btn btn-ghost btn-sm" to={actionTo}>
            {actionLabel}
          </Link>
        </div>
      )}
    </div>
  );
}
