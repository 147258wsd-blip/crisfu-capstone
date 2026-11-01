import { Link, useParams } from "react-router-dom";
import ErrorState from "../components/ErrorState";
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

  const demoOk = project.demo && project.demo !== "#";
  /* the seed data still points at the old multi-page filenames */
  const internalDemo = { "debate.html": "/debate", "index.html": "/", "projects.html": "/projects" }[project.demo];
  const demoHref = internalDemo || project.demo;

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
            {demoOk ? (
              internalDemo ? (
                <Link className="btn btn-primary" to={demoHref}>
                  Open the demo
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17 17 7M9 7h8v8" />
                  </svg>
                </Link>
              ) : (
                <a className="btn btn-primary" href={demoHref}>
                  Open the demo
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17 17 7M9 7h8v8" />
                  </svg>
                </a>
              )
            ) : (
              <span className="btn btn-ghost" style={{ opacity: 0.55, cursor: "default" }}>
                Not deployed
              </span>
            )}
            <a className="btn btn-ghost" href={project.source}>
              Source code
            </a>
          </div>

          <div className="meta-grid">
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
            <img className="banner-shot" src={project.imageUrl} alt={`${project.title} screenshot`} />
          )}
          <span className="cv-label">
            {project.coverLabel} · {project.year}
          </span>
        </div>

        <div className="prose">
          <h2>The problem</h2>
          <p>{project.problem}</p>
          <h2>What I built</h2>
          <ul>
            {project.built.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          <h2>What I'd change</h2>
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
