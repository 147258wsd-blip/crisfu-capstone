import { Link } from "react-router-dom";

/* The one error surface in the app. Pages decide the wording,
   this component keeps the look (and the retry affordance) consistent. */
export default function ErrorState({
  error,
  title,
  message,
  onRetry,
  retryLabel = "Try again",
  backTo,
  backLabel = "Go back",
  children,
}) {
  const status = error && error.status;
  const notFound = status === 404;

  return (
    <div className="state-box err" role="alert">
      <div className="ico">{notFound ? "404" : "!"}</div>
      <p className="ttl">{title || (notFound ? "Nothing here" : "That request did not come back")}</p>
      <p className="txt">{message || (error && error.message) || "Something went wrong. Please try again."}</p>
      <div className="acts">
        {onRetry && (
          <button className="btn btn-primary btn-sm" onClick={onRetry}>
            {retryLabel}
          </button>
        )}
        {backTo && (
          <Link className="btn btn-ghost btn-sm" to={backTo}>
            {backLabel}
          </Link>
        )}
        {children}
      </div>
      {status ? <div className="code">HTTP {status}</div> : null}
    </div>
  );
}
