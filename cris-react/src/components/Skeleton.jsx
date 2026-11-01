/* Loading placeholders. They mirror the real layout so the page
   does not jump when data arrives. */

export function ProjectCardSkeleton() {
  return (
    <div className="skel-card" aria-hidden="true">
      <div className="skel skel-cover" />
      <div className="skel-body">
        <div className="skel skel-line w70" />
        <div className="skel skel-line" />
        <div className="skel skel-line w45" />
      </div>
    </div>
  );
}

export function ProjectGridSkeleton({ count = 3 }) {
  return (
    <div className="proj-grid">
      {Array.from({ length: count }).map((_, i) => (
        <ProjectCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function PostRowSkeleton() {
  return (
    <div className="skel-row" aria-hidden="true">
      <div className="skel" style={{ width: 74, height: 11 }} />
      <div className="grow">
        <div className="skel skel-line w70" />
        <div className="skel skel-line w45" />
      </div>
    </div>
  );
}

export function PostListSkeleton({ count = 3 }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <PostRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="wrap detail" aria-hidden="true">
      <div className="skel skel-line" style={{ width: 180, height: 12 }} />
      <div className="skel skel-line" style={{ width: "62%", height: 34, marginTop: 26, marginBottom: 18 }} />
      <div className="skel skel-line" style={{ width: "80%", height: 13 }} />
      <div className="skel" style={{ height: 150, margin: "34px 0", borderRadius: 14 }} />
      <div className="skel skel-line" style={{ width: "92%" }} />
      <div className="skel skel-line" style={{ width: "88%" }} />
      <div className="skel skel-line" style={{ width: "70%" }} />
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="stats" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div className="skel skel-stat" key={i} />
      ))}
    </div>
  );
}
