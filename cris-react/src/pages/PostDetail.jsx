import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ErrorState from "../components/ErrorState";
import { DetailSkeleton } from "../components/Skeleton";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useApi, useTitle } from "../hooks/useApi";
import { api } from "../services/api";

function Block({ block }) {
  switch (block.type) {
    case "h2":
      return <h2>{block.text}</h2>;
    case "h3":
      return <h3>{block.text}</h3>;
    case "quote":
      return <blockquote>{block.text}</blockquote>;
    case "ul":
      return (
        <ul>
          {block.items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      );
    case "code":
      return (
        <pre>
          <code>{block.text}</code>
        </pre>
      );
    default:
      return <p>{block.text}</p>;
  }
}

const initials = (name) => name.trim().slice(0, 2).toUpperCase();

export default function PostDetail() {
  const { id } = useParams();
  const { user, logout } = useAuth();
  const toast = useToast();

  const postQ = useApi(() => api.posts.get(id), [id]);
  const commentsQ = useApi(() => api.posts.comments(id), [id]);

  const post = postQ.data;
  useTitle(post ? post.title : "Post");

  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (commentsQ.data) setComments(commentsQ.data);
  }, [commentsQ.data]);

  async function submit(e) {
    e.preventDefault();
    const body = text.trim();
    if (body.length < 3) {
      setInvalid(true);
      return;
    }
    setSending(true);
    try {
      const created = await api.posts.addComment(post.id, { name: user.name, text: body });
      setComments((list) => list.concat(created));
      setText("");
      setInvalid(false);
      toast("Comment posted");
    } catch (err) {
      toast(err.message || "Could not post that comment");
    } finally {
      setSending(false);
    }
  }

  if (postQ.loading) return <DetailSkeleton />;

  if (postQ.error) {
    return (
      <div className="wrap detail">
        <div className="crumbs">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to="/blog">Blog</Link>
          <span>/</span>
          <span>Error</span>
        </div>
        <div style={{ marginTop: 32 }}>
          <ErrorState
            error={postQ.error}
            title={postQ.error.status === 404 ? "This post does not exist" : "Could not load this post"}
            message={
              postQ.error.status === 404
                ? "It may have been renamed. The rest of the notes are still up."
                : postQ.error.message
            }
            onRetry={postQ.error.status === 404 ? undefined : postQ.reload}
            backTo="/blog"
            backLabel="Back to the blog"
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="wrap">
        <div className="article-head">
          <div className="crumbs">
            <Link to="/">Home</Link>
            <span>/</span>
            <Link to="/blog">Blog</Link>
            <span>/</span>
            <span>{post.cat}</span>
          </div>
          <h1>{post.title}</h1>
          <div className="article-meta">
            <span>{post.dateLabel}</span>
            <span className="dot">·</span>
            <span>{post.read} min read</span>
            <span className="dot">·</span>
            <span>{post.cat}</span>
          </div>
        </div>

        <div className="article-body">
          <div className="prose">
            {post.body.map((b, i) => (
              <Block key={i} block={b} />
            ))}
          </div>

          <div className="author">
            <div className="ava">CF</div>
            <div>
              <div className="n">Cris Fu</div>
              <div className="b">Full-stack developer. Writes about what broke and why.</div>
            </div>
          </div>

          <section className="comments">
            <h2>Comments</h2>
            <div className="count">
              {comments.length} {comments.length === 1 ? "response" : "responses"}
            </div>

            {commentsQ.loading && (
              <div aria-hidden="true">
                {[0, 1].map((i) => (
                  <div className="skel-row" key={i}>
                    <div className="skel" style={{ width: 34, height: 34, borderRadius: 10 }} />
                    <div className="grow">
                      <div className="skel skel-line w45" />
                      <div className="skel skel-line" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!commentsQ.loading &&
              comments.map((c) => (
                <div className="comment" key={c.id}>
                  <div className="ava">{initials(c.name)}</div>
                  <div>
                    <span className="n">{c.name}</span>
                    <span className="t">{c.at}</span>
                    <p>{c.text}</p>
                  </div>
                </div>
              ))}

            {user ? (
              <form className={"comment-form" + (invalid ? " invalid" : "")} onSubmit={submit} noValidate>
                <div className={"field" + (invalid ? " invalid" : "")}>
                  <label htmlFor="cText">Reply as {user.name}</label>
                  <textarea
                    id="cText"
                    maxLength={400}
                    placeholder="Say something useful…"
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      if (invalid) setInvalid(false);
                    }}
                  />
                  <div className="err">Write a few words first.</div>
                </div>
                <div className="modal-foot" style={{ marginTop: 0, justifyContent: "flex-start" }}>
                  <button className="btn btn-primary btn-sm" type="submit" disabled={sending}>
                    {sending ? <span className="spinner" /> : "Post comment"}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    onClick={() => {
                      logout();
                      toast("Signed out");
                    }}
                  >
                    Sign out
                  </button>
                </div>
              </form>
            ) : (
              <div className="comment-gate">
                <span>Sign in to join the discussion.</span>
                <Link className="btn btn-ghost btn-sm" to={`/login?next=${encodeURIComponent(`/blog/${post.id}`)}`}>
                  Sign in
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="wrap">
        <div className="next">
          <div>
            <div className="lbl">Back to</div>
            <Link className="t" to="/blog">
              All notes
            </Link>
          </div>
          <Link className="more" to="/projects">
            See the work →
          </Link>
        </div>
      </div>
    </>
  );
}
