import { Link } from "react-router-dom";

/* A blog row. `excerpt` is only rendered on the blog index, so the
   home page can reuse the same component with a tighter look. */
export default function PostRow({ post, excerpt = false }) {
  return (
    <Link className="post" to={`/blog/${post.id}`}>
      <span className="date">{post.dateLabel}</span>
      <div>
        <h3>{post.title}</h3>
        <div className="sub">
          <span>{post.cat}</span>
          <span>·</span>
          <span>{post.read} min read</span>
        </div>
        {excerpt && <p className="excerpt">{post.excerpt}</p>}
      </div>
      <span className="go">→</span>
    </Link>
  );
}
