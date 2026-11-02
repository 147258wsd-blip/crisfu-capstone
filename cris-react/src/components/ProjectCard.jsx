import { Link } from "react-router-dom";
import Reveal from "./Reveal";

/* How far each thing actually got. The label is deliberately unglamorous —
   a reader should be able to tell a shipped app from a sketch. */
export const STATUS_LABEL = {
  live: "Live",
  prototype: "Prototype",
  partial: "In progress",
  concept: "Concept",
};

export function statusLabel(status) {
  return STATUS_LABEL[String(status || "").toLowerCase()] || "Concept";
}

/* Used by the home page strip and the projects grid. One component,
   two contexts — that is the whole point of pulling it out. */
export default function ProjectCard({ project, delay = 0, animate = true }) {
  const body = (
    <>
      <div className={`cover cv-${project.cover}${project.imageUrl ? " has-shot" : ""}`}>
        {project.imageUrl && (
          <img className="cover-shot" src={project.imageUrl} alt={`${project.title} screenshot`} loading="lazy" />
        )}
        <span className="cv-label">
          {project.coverLabel} · {project.year}
        </span>
        <span className={`status-pill st-${String(project.status || "concept").toLowerCase()}`}>
          {statusLabel(project.status)}
        </span>
      </div>
      <div className="card-body">
        <h3>
          {project.title} <span className="arrow">↗</span>
        </h3>
        <p>{project.blurb}</p>
        <div className="tags">
          {project.tags.map((t) => (
            <span className="tag" key={t}>
              {t}
            </span>
          ))}
        </div>
      </div>
    </>
  );

  if (animate) {
    return (
      <Reveal as={Link} to={`/projects/${project.id}`} className="card" delay={delay}>
        {body}
      </Reveal>
    );
  }

  return (
    <Link className="card" to={`/projects/${project.id}`}>
      {body}
    </Link>
  );
}
