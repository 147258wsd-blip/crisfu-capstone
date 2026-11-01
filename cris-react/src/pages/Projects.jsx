import { useMemo, useState } from "react";
import Filters from "../components/Filters";
import ProjectCard from "../components/ProjectCard";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";
import { ProjectGridSkeleton } from "../components/Skeleton";
import { useApi, useTitle } from "../hooks/useApi";
import { api } from "../services/api";

const ALL = "All";

export default function Projects() {
  useTitle("Projects");
  const [active, setActive] = useState(ALL);
  const { data, loading, error, reload } = useApi(() => api.projects.list(), []);

  const projects = data || [];

  const options = useMemo(() => [ALL, ...Array.from(new Set(projects.map((p) => p.cat)))], [projects]);

  const counts = useMemo(() => {
    const map = { [ALL]: projects.length };
    projects.forEach((p) => {
      map[p.cat] = (map[p.cat] || 0) + 1;
    });
    return map;
  }, [projects]);

  const visible = active === ALL ? projects : projects.filter((p) => p.cat === active);

  return (
    <div className="wrap">
      <div className="page-head">
        <span className="kicker">
          <span className="num">01</span>Work
        </span>
        <h1>Projects</h1>
        <p>
          Six things I finished, from a weekend CLI to a full-stack site. Each one has a write-up: what
          broke, what I would do differently.
        </p>
      </div>

      {!loading && !error && (
        <Filters options={options} counts={counts} active={active} onChange={setActive} label="Filter projects" />
      )}

      {loading && <ProjectGridSkeleton count={6} />}

      {error && (
        <ErrorState
          error={error}
          title="The project list did not load"
          message="Nothing was lost — the request just failed. Retry and it will come back."
          onRetry={reload}
          backTo="/"
          backLabel="Back home"
        />
      )}

      {!loading && !error && (
        <div className="proj-grid" aria-live="polite">
          {visible.length === 0 ? (
            <div style={{ gridColumn: "1/-1" }}>
              <EmptyState
                icon="∅"
                title={`Nothing in “${active}” yet`}
                message="Try another category — everything else is still here."
                actionTo="/projects"
                actionLabel="Show all"
              />
            </div>
          ) : (
            visible.map((p, i) => <ProjectCard key={p.id} project={p} delay={(i % 3) * 80} />)
          )}
        </div>
      )}
    </div>
  );
}
