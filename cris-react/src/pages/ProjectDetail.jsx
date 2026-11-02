import { Link, useParams } from "react-router-dom";
import ErrorState from "../components/ErrorState";
import { statusLabel } from "../components/ProjectCard";
import { DetailSkeleton } from "../components/Skeleton";
import { useApi, useTitle } from "../hooks/useApi";
import { api } from "../services/api";

export default function ProjectDetail() {
  const { id } = useParams();
  const projectQ = useApi(() => api.projects.get(id), [id]);
  const listQ = useApi(() => api.projects.list(), []);

  const project = projectQ.data;
  useTitle(project ? project.title : "Project");

  const list = listQ.data || [];
  const index = project ? list.findIndex((p) => p.id === project.id) : -1;
  const next = index >= 0 && list.length > 1 ? list[(index + 1) % list.length] : null;

  if (projectQ.loading) return <DetailSkeleton />;

  if (projectQ.error) {
    return (
      <div className="wrap detail">
        <div className="crumbs">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to="/projects">Work</Link>
          <span>/</span>
          <span>Error</span>
        </div>
        <div style={{ marginTop: 32 }}>
          <ErrorState
            error={projectQ.error}
            title={projectQ.error.status === 404 ? "This project does not exist" : "Could not load this project"}
            message={
              projectQ.error.status === 404
                ? "The link may be old, or the id is wrong. The rest of the work is still there."
                : projectQ.error.message
            }
            onRetry={projectQ.error.status === 404 ? undefined : projectQ.reload}
            backTo="/projects"
            backLabel="Back to all projects"
          />
        </div>
      </div>
    );
  }

  /* Only render a button when the target exists. The old version mapped the
     seed's "debate.html" onto a route and still rendered "Source code" with
     href="#", i.e. a button that looked real and did nothing. */
  const demoHref = project.demo;
  const sourceHref = project.source;
  const extraLinks = project.links || [];

  return (
    <>
      <div className="wrap detail">
        <div className="crumbs">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to="/projects">Work</Link>
          <span>/</span>
          <span>{project.title}</span>
        </div>

        <div className="detail-head">
          <span className="kicker">
            <span className="num">01</span>
            {project.cat} · {project.year}
          </span>
          <h1>{project.title}</h1>
          <p className="lead">{project.blurb}</p>

          <div className="hero-actions">
            {demoHref ? (
              <a className="btn btn-primary" href={demoHref} target="_blank" rel="noreferrer">
                {project.status === "concept" ? "View the proposal" : "Open the live app"}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17 17 7M9 7h8v8" />
                </svg>
              </a>
            ) : (
              <span className="btn btn-ghost" style={{ opacity: 0.55, cursor: "default" }}>
                Not deployed — concept only
              </span>
            )}
            {sourceHref && (
              <a className="btn btn-ghost" href={sourceHref} target="_blank" rel="noreferrer">
                Source code
              </a>
            )}
            {extraLinks.map((l) => (
              <a className="btn btn-ghost" key={l.href} href={l.href} target="_blank" rel="noreferrer">
                {l.label}
              </a>
            ))}
          </div>

          <div className="meta-grid">
            <div>
              <div className="k">Current status</div>
              <div className="v">
                <span className={`status-pill st-${String(project.status || "concept").toLowerCase()}`}>
                  {statusLabel(project.status)}
                </span>
                {project.statusNote ? <span className="status-note">{project.statusNote}</span> : null}
              </div>
            </div>
            <div>
              <div className="k">Role</div>
              <div className="v">{project.role}</div>
            </div>
            <div>
              <div className="k">Stack</div>
              <div className="v">{project.stack.join(" · ")}</div>
            </div>
            <div>
              <div className="k">Timeline</div>
              <div className="v">{project.timeline}</div>
            </div>
          </div>
        </div>

        <div className={`banner cv-${project.cover}${project.imageUrl ? " has-shot" : ""}`}>
          {project.imageUrl && (
            <img
              className="banner-shot"
              src={project.imageUrl}
              alt={`${project.title} ${/\.svg$/i.test(project.imageUrl) ? "interface sketch" : "screenshot of the running app"}`}
            />
          )}
          <span className="cv-label">
            {project.coverLabel} · {project.year}
          </span>
        </div>

        <div className="prose">
          <h2>The problem</h2>
          <p>{project.problem}</p>
          <h2>{project.status === "concept" ? "What it would do" : "What I built"}</h2>
          {project.status === "concept" && (
            <p className="concept-note">
              None of the following is built. This is the scope I would implement, written down while
              the idea was still concrete — not a list of finished features.
            </p>
          )}
          <ul>
            {project.built.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          <h2>{project.status === "concept" ? "What is still open" : "What I'd change"}</h2>
          <p>{project.learned}</p>
          <p>
            {project.tags.map((t) => (
              <span className="tag" key={t} style={{ marginRight: 6 }}>
                {t}
              </span>
            ))}
          </p>
        </div>

        {next && (
          <div className="next">
            <div>
              <div className="lbl">Next project</div>
              <Link className="t" to={`/projects/${next.id}`}>
                {next.title}
              </Link>
            </div>
            <Link className="more" to="/projects">
              All projects →
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
