import { Link } from "react-router-dom";
import Reveal from "../components/Reveal";
import ProjectCard from "../components/ProjectCard";
import PostRow from "../components/PostRow";
import ErrorState from "../components/ErrorState";
import { ProjectGridSkeleton, PostListSkeleton } from "../components/Skeleton";
import { useApi, useTitle } from "../hooks/useApi";
import { api } from "../services/api";

const SKILLS = [
  { title: "Frontend", items: ["React", "JavaScript", "TypeScript", "Tailwind", "HTML / CSS", "Vite"] },
  { title: "Backend", items: ["Node.js", "Express", "MongoDB", "Mongoose", "REST API", "JWT"] },
  { title: "Tools", items: ["Git", "Postman", "Vercel", "Render", "Figma", "Linux"] },
];

export default function Home() {
  useTitle(null);

  const projectsQ = useApi(() => api.projects.list(), []);
  const postsQ = useApi(() => api.posts.list(), []);

  return (
    <>
      {/* ============ hero ============ */}
      <div className="wrap">
        <section className="hero">
          <div>
            <div className="status">
              <i /> OPEN TO 2026 INTERNSHIPS
            </div>
            <h1>
              Hi, I'm Cris Fu
              <br />
              <span className="grad">
                I build things
                <br />
                that actually run
              </span>
            </h1>
            <p className="lede">
              Full-stack developer, still in school. I like taking an idea all the way to
              <b> something you can click</b> — writing the API, tuning the spacing, and arguing about
              the parts that are actually interesting. This is where I keep the results.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" to="/projects">
                View my work
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17 17 7M9 7h8v8" />
                </svg>
              </Link>
              <Link className="btn btn-ghost" to="/blog">
                Read the blog
              </Link>
            </div>
          </div>

          <div className="terminal">
            <div className="tbar">
              <i className="r" />
              <i className="y" />
              <i className="g" />
              <span className="path">~/crisfu — zsh</span>
            </div>
            <div className="tbody">
              <div className="ln">
                <span className="p">$</span> <span className="c">whoami</span>
              </div>
              <div className="ln">
                <span className="s">cris fu</span> <span className="cm">// full-stack dev · CS student</span>
              </div>
              <div className="ln">
                <span className="p">$</span> <span className="c">cat</span> <span className="k">focus.json</span>
              </div>
              <div className="ln">
                <span className="cm">{"{"}</span> <span className="k">"stack"</span>
                <span className="cm">:</span> <span className="s">"React · Node · MongoDB"</span>
                <span className="cm">,</span>
              </div>
              <div className="ln">
                <span className="cm">  </span>
                <span className="k">"building"</span>
                <span className="cm">:</span> <span className="s">"a site that argues back"</span>{" "}
                <span className="cm">{"}"}</span>
              </div>
              <div className="ln">
                <span className="p">$</span> <span className="ok">▍</span>
                <span className="cursor" />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ============ projects preview ============ */}
      <section className="sec" id="projects">
        <div className="wrap">
          <Reveal className="sec-head">
            <div>
              <span className="sec-tag">
                <span className="num">01</span>Selected work
              </span>
              <h2>Things I've built</h2>
              <p className="sec-desc">Three I still open for no reason</p>
            </div>
            <Link className="more" to="/projects">
              All projects →
            </Link>
          </Reveal>

          {projectsQ.loading && <ProjectGridSkeleton count={3} />}

          {projectsQ.error && (
            <ErrorState
              error={projectsQ.error}
              title="Could not load the work"
              message="The project list did not come back. Retry, or open the full list again."
              onRetry={projectsQ.reload}
              backTo="/projects"
              backLabel="Open all projects"
            />
          )}

          {!projectsQ.loading && !projectsQ.error && (
            <div className="proj-grid">
              {projectsQ.data.slice(0, 3).map((p, i) => (
                <ProjectCard key={p.id} project={p} delay={(i % 3) * 80} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============ debate feature ============ */}
      <section className="sec" id="debate" style={{ paddingTop: 20 }}>
        <div className="wrap">
          <Reveal className="feature">
            <div>
              <span className="badge">FEATURED · PLAYABLE</span>
              <h3>Argue with an opponent that listens</h3>
              <p>
                Draw a topic, pick a side, choose a difficulty. It picks up the exact words you just
                used before pushing back — and scores every sentence on logic, relevance, evidence and
                rebuttal.
              </p>
              <div className="hero-actions">
                <Link className="btn btn-primary" to="/debate">
                  Enter the arena
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
                <Link className="btn btn-ghost" to="/projects/debate-simulator">
                  How it works
                </Link>
              </div>
            </div>
            <div className="mini">
              <div className="bubble pro">
                <span className="who">PRO · YOU</span>
                Reading widely is good, because books build knowledge. The kids in my class who read a
                lot write better essays.
              </div>
              <div className="bubble con">
                <span className="who">CON · AI OPPONENT</span>
                You mentioned “books” — but not every book deserves to be read. Nobody is picking them
                for you.
              </div>
              <div className="mini-score">
                <span>
                  PRO <b>18</b>
                </span>
                <span className="bar" />
                <span>
                  <b>12</b> CON
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ blog preview ============ */}
      <section className="sec" id="blog">
        <div className="wrap">
          <Reveal className="sec-head">
            <div>
              <span className="sec-tag">
                <span className="num">02</span>Writing
              </span>
              <h2>Recent writing</h2>
              <p className="sec-desc">Notes on things I broke, then understood</p>
            </div>
            <Link className="more" to="/blog">
              All posts →
            </Link>
          </Reveal>

          {postsQ.loading && <PostListSkeleton count={3} />}

          {postsQ.error && (
            <ErrorState
              error={postsQ.error}
              title="Could not load the notes"
              message="The post list did not come back. Retry, or read them on the blog page."
              onRetry={postsQ.reload}
              backTo="/blog"
              backLabel="Open the blog"
            />
          )}

          {!postsQ.loading && !postsQ.error && (
            <Reveal className="posts">
              {postsQ.data.slice(0, 3).map((p) => (
                <PostRow key={p.id} post={p} />
              ))}
            </Reveal>
          )}
        </div>
      </section>

      {/* ============ skills ============ */}
      <section className="sec" id="skills" style={{ paddingTop: 20 }}>
        <div className="wrap">
          <Reveal className="sec-head">
            <div>
              <span className="sec-tag">
                <span className="num">03</span>Toolbox
              </span>
              <h2>What I work with</h2>
              <p className="sec-desc">Not an expert in all of it — but I can ship with all of it</p>
            </div>
          </Reveal>
          <div className="skills">
            {SKILLS.map((group, i) => (
              <Reveal className="skill-box" key={group.title} delay={i * 80}>
                <h4>{group.title}</h4>
                <div className="skill-list">
                  {group.items.map((s) => (
                    <span className="skill" key={s}>
                      {s}
                    </span>
                  ))}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ contact ============ */}
      <section className="sec" id="contact" style={{ paddingTop: 36 }}>
        <div className="wrap">
          <Reveal className="cta">
            <h2>Got an idea? Let's talk.</h2>
            <p>
              Internships, side projects, or just someone to argue about a tech choice with — my inbox
              is open.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" to="/contact">
                Send a message
              </Link>
              <a className="btn btn-ghost" href="#">
                Download CV
              </a>
            </div>
            <div className="mail">
              or mail me at <a href="mailto:hello@crisfu.dev">hello@crisfu.dev</a>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
