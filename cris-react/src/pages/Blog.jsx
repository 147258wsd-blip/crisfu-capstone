import { useMemo, useState } from "react";
import Filters from "../components/Filters";
import PostRow from "../components/PostRow";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";
import { PostListSkeleton } from "../components/Skeleton";
import { useApi, useTitle } from "../hooks/useApi";
import { api } from "../services/api";

const ALL = "All";

export default function Blog() {
  useTitle("Notes");
  const [active, setActive] = useState(ALL);
  const { data, loading, error, reload } = useApi(() => api.posts.list(), []);

  const posts = data || [];
  const options = useMemo(() => [ALL, ...Array.from(new Set(posts.map((p) => p.cat)))], [posts]);

  const counts = useMemo(() => {
    const map = { [ALL]: posts.length };
    posts.forEach((p) => {
      map[p.cat] = (map[p.cat] || 0) + 1;
    });
    return map;
  }, [posts]);

  const visible = active === ALL ? posts : posts.filter((p) => p.cat === active);

  return (
    <div className="wrap">
      <div className="page-head">
        <span className="kicker">
          <span className="num">02</span>Writing
        </span>
        <h1>Notes</h1>
        <p>
          Things I broke, then understood. Mostly about the gap between a tutorial and a thing that
          ships.
        </p>
      </div>

      {!loading && !error && (
        <Filters options={options} counts={counts} active={active} onChange={setActive} label="Filter posts" />
      )}

      {loading && <PostListSkeleton count={5} />}

      {error && (
        <ErrorState
          error={error}
          title="The blog did not load"
          message="The request failed — your reading position is not lost, there is just nothing to show yet."
          onRetry={reload}
          backTo="/"
          backLabel="Back home"
        />
      )}

      {!loading && !error && (
        <>
          {visible.length === 0 ? (
            <div style={{ marginTop: 20 }}>
              <EmptyState
                icon="∅"
                title={`No posts in “${active}”`}
                message="Other categories still have something to read."
                actionTo="/blog"
                actionLabel="Show all posts"
              />
            </div>
          ) : (
            <div className="posts" aria-live="polite">
              {visible.map((p) => (
                <PostRow key={p.id} post={p} excerpt />
              ))}
            </div>
          )}
          <p style={{ color: "var(--dim)", fontSize: 13, margin: "26px 0 0" }}>
            {visible.length} {visible.length === 1 ? "post" : "posts"}
          </p>
        </>
      )}
    </div>
  );
}
