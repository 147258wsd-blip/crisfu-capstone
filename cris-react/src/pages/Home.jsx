import { useMemo } from "react";
import { Link } from "react-router-dom";
import Reveal from "../components/Reveal";
import ProjectCard from "../components/ProjectCard";
import PostRow from "../components/PostRow";
import ErrorState from "../components/ErrorState";
import { ProjectGridSkeleton, PostListSkeleton } from "../components/Skeleton";
import { useApi, useTitle } from "../hooks/useApi";
import { api } from "../services/api";
import { groupSkills } from "../services/adapters";

/* Shown only when /api/skills is empty or unreachable — the section is part
   of the page, so it should never collapse to nothing because a request
   failed. The live list comes from the API and is grouped below. */
const SKILLS_FALLBACK = [
  { title: "Frontend", items: ["React", "JavaScript", "TypeScript", "Tailwind", "HTML / CSS", "Vite"] },
  { title: "Backend", items: ["Node.js", "Express", "MongoDB", "Mongoose", "REST API", "JWT"] },
  { title: "Tools", items: ["Git", "Postman", "Vercel", "Render", "Figma", "Linux"] },
];

export default function Home() {
  useTitle(null);

  const projectsQ = useApi(() => api.projects.list(), []);
  const postsQ = useApi(() => api.posts.list(), []);
  const skillsQ = useApi(() => api.skills.list(), []);

  const skillGroups = useMemo(() => {
    const live = groupSkills(skillsQ.data || []);
    return live.length ? live : SKILLS_FALLBACK;
  }, [skillsQ.data]);

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
            <p className="hero-meta">
              Fu Zhenyu (Cris) · Inner Mongolia, China · computer science student
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

      {/* ============ capstone ============ */}
      {/* The graded project should be the first thing anyone can verify, so it
          gets the slot directly under the hero and three real entry points. */}
      <section className="sec" id="capstone" style={{ paddingTop: 8 }}>
        <div className="wrap">
          <Reveal className="feature capstone">
            <div>
              <span className="badge">CAPSTONE · FULL-STACK · 2026</span>
              <h3>This site is the capstone</h3>
              <p>
                Everything you are reading is one project: a <b>React 18</b> single-page app talking
                to an <b>Express</b> REST API and a <b>MongoDB Atlas</b> database. JWT auth, comments
                on posts, a contact form that lands in a real inbox, and an admin dashboard that
                writes back to the same collections the public pages read from.
              </p>
              <div className="capstack">
                <span>React 18 · Vite</span>
                <span>React Router</span>
                <span>Express</span>
                <span>Mongoose / Atlas</span>
                <span>JWT + bcrypt</span>
                <span>27 endpoints</span>
              </div>
              <div className="hero-actions">
                <a className="btn btn-primary" href={`${import.meta.env.BASE_URL}api-docs.html`} target="_blank" rel="noreferrer">
                  API reference
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17 17 7M9 7h8v8" />
                  </svg>
                </a>
                <a className="btn btn-ghost" href="https://github.com/147258wsd-blip/crisfu-capstone" target="_blank" rel="noreferrer">
                  Source on GitHub
                </a>
              </div>
              <p className="capnote">
                The API runs on Alibaba Cloud Function Compute, the client is a static build on GitHub
                Pages. Both are separate deployments talking over CORS — no mock data, no localhost.
                The signed-in side is at <Link to="/admin">/admin</Link> (the demo account is printed in
                the README).
              </p>
            </div>
            <div className="mini capmini">
              <div className="caprow">
                <span className="capk">GET</span>
                <span className="capp">/api/projects</span>
                <span className="capv">6 docs</span>
              </div>
              <div className="caprow">
                <span className="capk">GET</span>
                <span className="capp">/api/skills</span>
                <span className="capv">18 docs</span>
              </div>
              <div className="caprow">
                <span className="capk">POST</span>
                <span className="capp">/api/users/login</span>
                <span className="capv">JWT 7d</span>
              </div>
              <div className="caprow">
                <span className="capk">POST</span>
                <span className="capp">/api/contact</span>
                <span className="capv">→ Inbox</span>
              </div>
              <div className="caprow">
                <span className="capk">DELETE</span>
                <span className="capp">/api/projects/:id</span>
                <span className="capv">owner only</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ projects preview ============ */}
      <section className="sec" id="projects">
        <div className="wrap">
          <Reveal className="sec-head">
            <div>
              <span className="sec-tag">
                <span className="num">01</span>Selected work
              </span>
              <h2>Things I've built</h2>
              <p className="sec-desc">
                The capstone, one playable prototype, and four ideas I have not built yet — each card
                says which it is
              </p>
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
                <a
                  className="btn btn-ghost"
                  href={`${import.meta.env.BASE_URL}debate-simulator/`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open the original prototype
                </a>
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
            {skillGroups.map((group, i) => (
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

      {/* ============ about ============ */}
      <section className="sec" id="about" style={{ paddingTop: 36 }}>
        <div className="wrap">
          <Reveal className="sec-head">
            <div>
              <span className="sec-tag">
                <span className="num">04</span>About
              </span>
              <h2>Who is writing this</h2>
            </div>
          </Reveal>
          <Reveal className="about-grid">
            <div>
              <p>
                I am <b>Fu Zhenyu</b>, from Inner Mongolia, China. I study computer science and I spend
                most of my free time on the same question: why does one tool feel obvious and another
                one makes you read the manual twice?
              </p>
              <p>
                The pattern I keep coming back to is feedback. The debate simulator exists because
                arguing with a polite chatbot taught me nothing; the admin inbox on this site exists
                because a contact form you never read is just a hole in the page. Both are the same
                complaint — a loop that never closes.
              </p>
            </div>
            <div>
              <p>
                What I am working on now: this capstone, and the gap between "it runs on my machine"
                and "someone else can open it". That gap turned out to be most of the work — gateways
                that rewrite headers, platforms that reject new accounts, a single missing environment
                variable turning a login into a 500.
              </p>
              <p>
                I would rather show a small thing that runs than describe a large thing that does not.
                That is why every project page above says how far it actually got.
              </p>
            </div>
          </Reveal>
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
              <a className="btn btn-ghost" href="mailto:hello@crisfu.dev">
                Email me
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
