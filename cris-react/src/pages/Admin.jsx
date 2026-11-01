import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ErrorState from "../components/ErrorState";
import Modal from "../components/Modal";
import { StatsSkeleton } from "../components/Skeleton";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useApi, useTitle } from "../hooks/useApi";
import { api } from "../services/api";

const PROJECT_CATS = ["Full-stack", "Frontend", "Experiment"];
const POST_CATS = ["Engineering", "Backend", "Frontend", "Algorithms"];

/* ---------------- create / edit form ---------------- */
function ItemForm({ kind, item, onCancel, onSave }) {
  const isProject = kind === "project";

  const [form, setForm] = useState({
    title: item ? item.title : "",
    cat: item ? item.cat : isProject ? "Frontend" : "Engineering",
    when: item ? (isProject ? item.year : item.date) : isProject ? String(new Date().getFullYear()) : new Date().toISOString().slice(0, 10).replace(/-/g, "."),
    blurb: item ? (isProject ? item.blurb || "" : item.excerpt || "") : "",
    /* deliberately not prefilled when editing: leaving it empty keeps
       whatever the record already has, so an edit cannot flatten a
       structured post body into one paragraph */
    detail: "",
    status: item ? item.status || "draft" : "draft",
  });
  const [invalid, setInvalid] = useState(false);
  const [saving, setSaving] = useState(false);

  const cats = isProject ? PROJECT_CATS : POST_CATS;

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (invalid) setInvalid(false);
  };

  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      setInvalid(true);
      return;
    }
    setSaving(true);
    try {
      /* Editing must not wipe the fields this form does not show.
         The project detail page still needs problem/built/learned/demo/source,
         and a post still needs its body — so start from the stored record
         and overwrite only what the form owns. */
      const base = item || {};
      const detail = form.detail.trim();
      const blocks = detail
        ? detail
            .split(/\n{2,}/)
            .map((s) => s.trim())
            .filter(Boolean)
            .map((t) => (t.startsWith("## ") ? { type: "h2", text: t.slice(3) } : { type: "p", text: t }))
        : null;

      const payload = isProject
        ? {
            ...base,
            title: form.title.trim(),
            cat: form.cat,
            year: form.when.trim(),
            blurb: form.blurb.trim(),
            status: form.status,
            ...(detail ? { problem: detail } : {}),
          }
        : {
            ...base,
            title: form.title.trim(),
            cat: form.cat,
            date: form.when.trim(),
            excerpt: form.blurb.trim(),
            status: form.status,
            ...(blocks ? { body: blocks } : {}),
          };
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="modal-card" onSubmit={submit} noValidate>
      <h3>
        {item ? "Edit" : "New"} {isProject ? "project" : "post"}
      </h3>

      <div className={"field" + (invalid ? " invalid" : "")}>
        <label htmlFor="mTitle">Title</label>
        <input id="mTitle" value={form.title} onChange={set("title")} />
        <div className="err">A title is required.</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="field">
          <label htmlFor="mCat">Category</label>
          <select id="mCat" value={form.cat} onChange={set("cat")}>
            {cats.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="mWhen">{isProject ? "Year" : "Date"}</label>
          <input id="mWhen" value={form.when} onChange={set("when")} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="mBlurb">{isProject ? "Short description" : "Excerpt"}</label>
        <textarea id="mBlurb" style={{ minHeight: 80 }} value={form.blurb} onChange={set("blurb")} />
      </div>

      <div className="field">
        <label htmlFor="mDetail">{isProject ? "Detail page — problem" : "Body"}</label>
        <textarea
          id="mDetail"
          style={{ minHeight: 96 }}
          value={form.detail}
          onChange={set("detail")}
          placeholder={
            item
              ? "Leave blank to keep the current text."
              : isProject
              ? "Why did this project exist? This is the first paragraph of the detail page."
              : "Blank line separates paragraphs. Start a line with ## for a heading."
          }
        />
      </div>

      <div className="field">
        <label htmlFor="mStatus">Status</label>
        <select id="mStatus" value={form.status} onChange={set("status")}>
          <option value="live">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      <div className="modal-foot">
        <button className="btn btn-ghost" type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? <span className="spinner" /> : item ? "Save changes" : "Create"}
        </button>
      </div>
    </form>
  );
}

/* ---------------- dashboard ---------------- */
export default function Admin() {
  useTitle("Admin");
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState("overview");
  const [editing, setEditing] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState(false);

  const dash = useApi(async () => {
    const [projects, posts, log, counts, inbox] = await Promise.all([
      api.admin.projects(),
      api.admin.posts(),
      api.admin.log(),
      api.admin.counts(),
      api.contact.list(),
    ]);
    return { projects, posts, log, counts, inbox };
  }, []);

  const data = dash.data;
  const projects = useMemo(() => (data ? data.projects : []), [data]);
  const posts = useMemo(() => (data ? data.posts : []), [data]);
  const inbox = useMemo(() => (data ? data.inbox : []), [data]);
  const unread = useMemo(() => inbox.filter((m) => !m.read).length, [inbox]);

  async function markRead(id) {
    try {
      await api.contact.markRead(id);
      toast("Marked as read");
      dash.reload();
    } catch (err) {
      toast(err.message || "Could not update the message");
    }
  }

  async function save(payload) {
    const { kind, item } = editing;
    try {
      if (kind === "project") {
        if (item) await api.admin.updateProject(item.id, payload);
        else await api.admin.createProject(payload);
      } else if (item) await api.admin.updatePost(item.id, payload);
      else await api.admin.createPost(payload);

      setEditing(null);
      toast(item ? "Changes saved" : "Created");
      dash.reload();
    } catch (err) {
      toast(err.message || "Save failed");
    }
  }

  async function remove() {
    const { kind, item } = confirming;
    setBusy(true);
    try {
      if (kind === "project") await api.admin.deleteProject(item.id);
      else await api.admin.deletePost(item.id);
      setConfirming(null);
      toast("Deleted");
      dash.reload();
    } catch (err) {
      toast(err.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    logout();
    navigate("/", { replace: true });
  }

  const tableLoading = dash.loading && !data;

  return (
    <div className="wrap">
      <div className="page-head" style={{ paddingBottom: 0, borderBottom: 0 }}>
        <span className="kicker">
          <span className="num">05</span>Admin
        </span>
        <h1 style={{ marginBottom: 8 }}>Dashboard</h1>
        <p>
          Writes go through <code className="code-chip">services/api.js</code>. In mock mode they land in
          localStorage; flip <code className="code-chip">USE_MOCK</code> and the same calls hit{" "}
          <code className="code-chip">/api/projects</code> and <code className="code-chip">/api/posts</code>.
        </p>
      </div>

      <div className="admin-grid">
        <aside className="side">
          {[
            ["overview", "◈ Overview"],
            ["projects", "▤ Projects"],
            ["posts", "✎ Blog posts"],
            ["inbox", `✉ Inbox${unread ? ` (${unread})` : ""}`],
          ].map(([key, label]) => (
            <a key={key} className={tab === key ? "on" : undefined} onClick={() => setTab(key)}>
              {label}
            </a>
          ))}
          <div className="who">
            Signed in as
            <br />
            <strong style={{ color: "var(--text)" }}>{user.email}</strong>
          </div>
          <a id="signOut" style={{ color: "var(--dim)" }} onClick={signOut}>
            ↩ Sign out
          </a>
        </aside>

        <section style={{ opacity: dash.loading && data ? 0.55 : 1, transition: "opacity .2s" }}>
          {tableLoading && <StatsSkeleton />}

          {dash.error && (
            <ErrorState
              error={dash.error}
              title="The dashboard could not load"
              message="The admin endpoints failed. Nothing was written — retry, or sign in again."
              onRetry={dash.reload}
              backTo="/"
              backLabel="Back home"
            />
          )}

          {data && tab === "overview" && (
            <>
              <div className="stats">
                <div className="stat">
                  <div className="l">Projects</div>
                  <div className="v">{data.counts.projects}</div>
                </div>
                <div className="stat">
                  <div className="l">Posts</div>
                  <div className="v">{data.counts.posts}</div>
                </div>
                <div className="stat">
                  <div className="l">Comments</div>
                  <div className="v">{data.counts.comments}</div>
                </div>
                <div className="stat">
                  <div className="l">Inbox</div>
                  <div className="v">{data.counts.inbox}</div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-head">
                  <h2>Recent activity</h2>
                  <span className="pill">{data.log.length} events</span>
                </div>
                <div className="panel-body">
                  {data.log.map((l, i) => (
                    <div className="comment" style={{ padding: "14px 0" }} key={i}>
                      <div className="ava" style={{ width: 30, height: 30, borderRadius: 8 }}>
                        ·
                      </div>
                      <div>
                        <span className="n" style={{ fontWeight: 500 }}>
                          {l.t}
                        </span>
                        <span className="t">{l.at}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {data && tab === "projects" && (
            <div className="panel">
              <div className="panel-head">
                <h2>
                  Projects <span style={{ color: "var(--dim)", fontWeight: 400 }}>({projects.length})</span>
                </h2>
                <button className="btn btn-primary btn-sm" onClick={() => setEditing({ kind: "project", item: null })}>
                  + New project
                </button>
              </div>
              <div className="panel-body">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Year</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className="t-title">{p.title}</div>
                          <div className="t-sub">/projects/{p.id}</div>
                        </td>
                        <td>{p.cat}</td>
                        <td style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--dim)" }}>{p.year}</td>
                        <td>
                          <span className={"pill " + (p.status === "draft" ? "draft" : "live")}>{p.status || "live"}</span>
                        </td>
                        <td>
                          <div className="ops">
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditing({ kind: "project", item: p })}>
                              Edit
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => setConfirming({ kind: "project", item: p })}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data && tab === "posts" && (
            <div className="panel">
              <div className="panel-head">
                <h2>
                  Blog posts <span style={{ color: "var(--dim)", fontWeight: 400 }}>({posts.length})</span>
                </h2>
                <button className="btn btn-primary btn-sm" onClick={() => setEditing({ kind: "post", item: null })}>
                  + New post
                </button>
              </div>
              <div className="panel-body">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className="t-title">{p.title}</div>
                          <div className="t-sub">/blog/{p.id}</div>
                        </td>
                        <td>{p.cat}</td>
                        <td style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--dim)" }}>{p.date}</td>
                        <td>
                          <span className={"pill " + (p.status === "draft" ? "draft" : "live")}>{p.status || "live"}</span>
                        </td>
                        <td>
                          <div className="ops">
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditing({ kind: "post", item: p })}>
                              Edit
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => setConfirming({ kind: "post", item: p })}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {data && tab === "inbox" && (
            <div className="panel">
              <div className="panel-head">
                <h2>
                  Inbox <span style={{ color: "var(--dim)", fontWeight: 400 }}>({inbox.length})</span>
                </h2>
                <span className="pill">{unread} unread</span>
              </div>
              <div className="panel-body">
                {inbox.length === 0 ? (
                  <p className="t-sub" style={{ margin: 0 }}>
                    Nothing here yet. Messages sent through <code className="code-chip">/contact</code> land in
                    this list — they are stored in the <code className="code-chip">messages</code> collection.
                  </p>
                ) : (
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>From</th>
                        <th>Message</th>
                        <th>Received</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {inbox.map((m) => (
                        <tr key={m.id}>
                          <td>
                            <div className="t-title">{m.name}</div>
                            <div className="t-sub">{m.email}</div>
                          </td>
                          <td style={{ maxWidth: 340, whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.55 }}>
                            {m.msg}
                          </td>
                          <td style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--dim)" }}>{m.at}</td>
                          <td>
                            <span className={"pill " + (m.read ? "live" : "draft")}>{m.read ? "read" : "new"}</span>
                          </td>
                          <td>
                            <div className="ops">
                              <button
                                className="btn btn-ghost btn-sm"
                                disabled={m.read}
                                onClick={() => markRead(m.id)}
                              >
                                Mark read
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)}>
        {editing && (
          <ItemForm kind={editing.kind} item={editing.item} onCancel={() => setEditing(null)} onSave={save} />
        )}
      </Modal>

      <Modal open={!!confirming} onClose={() => setConfirming(null)} className="dialog-backdrop">
        {confirming && (
          <div className="dialog-card" role="alertdialog" aria-modal="true">
            <h3>Delete “{confirming.item.title}”?</h3>
            <p>This removes it from the dashboard for good. There is no undo in mock mode.</p>
            <div className="row">
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirming(null)} disabled={busy}>
                Cancel
              </button>
              <button className="btn btn-danger btn-sm" onClick={remove} disabled={busy}>
                {busy ? <span className="spinner" /> : "Delete"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
