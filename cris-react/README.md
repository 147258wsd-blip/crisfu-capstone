# Cris Fu — Portfolio & Blog (React frontend)

The frontend half of the Capstone project: a React SPA with a portfolio, a blog with
comments, a protected admin area, and a playable debate simulator.

> **Status** — front-end and back-end both complete and talking to each other. The SPA
> reads and writes real records in MongoDB Atlas through the Express API in `../server`.
> Live front-end: _pending deployment_ · Live API: _pending_ ·
> Submission: `StudentID_StudentName_CapstoneProject.zip` (exclude `node_modules`)

Built with **Vite + React 18 + React Router 6 + Context API + axios**, styled with one
hand-written CSS file (no UI framework).

---

## Run it

```bash
npm install
npm run dev          # http://localhost:5173, talks to the API via .env.local
npm run dev:mock     # same, but reads the offline mock — no backend needed
npm run build        # -> dist/ (real API baked in)
npm run build:mock   # -> dist-mock/ (offline demo build)
npm run preview      # serves dist/  on http://localhost:4173
npm run preview:mock # serves dist-mock/ on http://localhost:4174
```

Verification:

```bash
npm run smoke        # 13 headless scenarios against the mock build (needs preview:mock)
npm run smoke:real   # 9 headless scenarios against the real API + Atlas (needs preview + server)
npm run test:api     # 53 assertions straight at the API, no browser
npm run check-api    # static check: every request hits an endpoint from the spec
```

`dist/` must be served over HTTP — deep links such as `/blog/:id` load `/assets/*`, so
double-clicking `dist/index.html` from disk will not work. Use `npm run preview`.

---

## Routes

| Route | Page | Notes |
|---|---|---|
| `/` | Home | hero, 3 featured projects, debate banner, 3 latest posts, skills |
| `/projects` | Projects | category filter with counts |
| `/projects/:id` | Project detail | `useParams`, 404 state for unknown ids |
| `/blog` | Blog index | category filter, post count |
| `/blog/:id` | Post + comments | comment form gated on auth |
| `/debate` | Debate Simulator | 3-round match, scoring, result |
| `/contact` | Contact | validated form, success state |
| `/login`, `/register` | Auth | validation, error message, redirect back via `?next=` |
| `/admin` | Dashboard | **protected**, CRUD for projects and posts |
| `*` | 404 | catch-all |

---

## Structure

```
src/
├── components/        Background, Header, Footer, Layout, Reveal,
│                      ProjectCard, PostRow, Filters, Modal,
│                      Skeleton, ErrorState, EmptyState, ProtectedRoute
├── context/
│   ├── AuthContext.jsx    session, login/register/logout, pending + error
│   └── ToastContext.jsx   one toast surface for the whole app
├── hooks/
│   └── useApi.js          { data, loading, error, reload } + useTitle
├── lib/
│   ├── scoring.js         pure five-axis argument scorer (+ debate constants)
│   └── bot.js             opponent replies (quotes only real user words)
├── pages/             Home, Projects, ProjectDetail, Blog, PostDetail,
│                      Debate, Contact, Login, Register, Admin, NotFound
├── services/
│   ├── http.js            axios instance: base URL, JWT header, 401 → logout, error mapping
│   ├── api.js             every endpoint the UI uses (mock ⇄ real switch)
│   └── adapters.js        API field names ⇄ page field names (both directions)
├── data/
│   ├── site.js        seed projects, posts, the eight English debate topics
│   └── topics.js      the full 100-topic library (+ language switch data)
├── App.jsx            route table
├── main.jsx           router bootstrap
└── index.css          the whole design system

public/
└── shots/             project cover art (see "Cover images" below)
```

---

## Cover images

Two kinds, on purpose — and the difference is visible on the cards:

| File | Kind | Why |
|---|---|---|
| `debate-full.png` | real screenshot of `/debate` | the thing actually runs, so it gets photographed |
| `portfolio-full.png` | real screenshot of `/` | same |
| `campus.svg` | drawn illustration | no live build; a fake screenshot would be a lie |
| `scheduler.svg` | drawn illustration | same |
| `screentime.svg` | drawn illustration | same |
| `habit.svg` | drawn illustration | same |

The four SVGs are hand-authored, not generated: no text inside them (text becomes
unreadable at 132px card height), colours taken from the site variables, and each
one shows the single mechanism that makes the project worth reading about — the
sold listing, the clashing drop target, the missing days in the chart, the streak
dots. They are deliberately **not** dressed up as product screenshots.

`ProjectCard` renders `<img>` over the gradient when `imageUrl` exists and keeps
the gradient otherwise, so a missing file degrades quietly instead of showing a
broken image.

---

## Mock ⇄ real API

One environment variable decides where the data comes from:

```
# .env.local
VITE_USE_MOCK=false
VITE_API_URL=http://localhost:5000/api
```

`src/services/api.js` reads it:

```js
export const USE_MOCK = String(import.meta.env.VITE_USE_MOCK ?? "true") !== "false";
```

**Mock mode** (`VITE_USE_MOCK=true`, the default) — data comes from `src/data/site.js`
plus `localStorage`, with a simulated 380–700 ms latency. That latency is deliberate: it
is what makes the Loading skeletons and the Error/Retry path real instead of decorative.
With no backend running, `npm run dev:mock` still gives a complete, clickable site.

**Real mode** — every read and write goes through `services/http.js` to Express and
Atlas. Every call attaches `Authorization: Bearer <token>` through the axios request
interceptor, and failures are normalised into `ApiError { message, status }`. A `401`
clears the stored token, fires one app-wide event and `AuthContext` logs out, so a stale
session cannot leave the UI half-signed-in. API responses are fetched with
`cache: "no-store"`, and the server sends `Cache-Control: no-store` — without both, a
comment posted a second ago can come back invisible because the browser reused its
cached copy of the thread.

Seeded login for the real backend: **cris@crisfu.dev / crisfu2026** (see
`../server/README.md`).

---

## API contract

The backend lives in `../server` and is implemented — this table is what it serves, under
`VITE_API_URL` (the axios `baseURL` already ends in `/api`).

| Method | Endpoint | Auth | Returns |
|---|---|---|---|
| POST | `/users/register` | public | `{ token, user }` |
| POST | `/users/login` | public | `{ token, user }` |
| GET | `/users/me` | Bearer | `{ user }` |
| GET | `/projects` | public | `{ count, projects[] }` |
| GET | `/projects/:id` | public | `{ project }` |
| POST | `/projects` | Bearer | `{ project }` |
| PUT/PATCH | `/projects/:id` | Bearer, owner only | `{ project }` |
| DELETE | `/projects/:id` | Bearer, owner only | `{ message, id }` |
| GET | `/blog` | public | `{ count, posts[] }` with `author.username` |
| GET | `/blog/:id` | public | `{ post }` + `commentCount` |
| POST | `/blog` | Bearer | `{ post }` |
| PUT/PATCH | `/blog/:id` | Bearer, author only | `{ post }` |
| DELETE | `/blog/:id` | Bearer, author only | `{ message, id }` (cascades comments) |
| GET | `/blog/:postId/comments` | public | `{ count, comments[] }` with `author.username` |
| POST | `/blog/:postId/comments` | Bearer | `{ comment }` |
| DELETE | `/blog/:postId/comments/:commentId` | Bearer, comment or post author | `{ message, id }` |
| POST | `/contact` | public | `{ message, id }` |
| GET | `/contact` | Bearer | `{ count, unread, messages[] }` |
| PATCH | `/contact/:id/read` | Bearer | `{ message }` |
| GET | `/admin/stats` | Bearer | `{ projects, posts, comments, inbox }` |
| GET | `/admin/activity` | Bearer | `{ count, activity: [{ t, at }] }` |
| GET | `/health` | public | `{ status, uptime }` |

### Field mapping

The spec fixes database names (`description`, `imageUrl`, `liveUrl`, `body`,
`author.username`…). The pages were written against friendlier ones (`blurb`, `demo`,
`source`, `text`, `name`). `src/services/adapters.js` is the only place that translates,
so nothing in `components/` or `pages/` knows which convention the server uses.

| API | Page |
|---|---|
| `_id` | `id` |
| Project `description` | `blurb`, `problem`, `built[]`, `learned`, `stack[]`, `timeline` |
| Project `imageUrl` / `liveUrl` / `repoUrl` | `imageUrl` / `demo` / `source` |
| BlogPost `content` | `body[]` (typed blocks) + `excerpt`, `cat`, `tags`, `read`, `status` |
| BlogPost `author.username` | byline |
| Comment `body` / `author.username` / `createdAt` | `text` / `name` / `at` |
| User `username` | `name` |

`description` and `content` are the only `String` columns that have to carry structured
data, so the adapter stores a JSON payload in them and parses it back on read. If you
paste plain text into MongoDB by hand, the detail pages still render: the adapter falls
back to treating it as a paragraph (and `## Heading` lines become headings).

---

## Deployment checklist

1. Deploy `../server` first (Render), note its URL, and set `CLIENT_ORIGIN` there to the
   frontend origin once Vercel gives you one.
2. In the Vercel project set `VITE_USE_MOCK=false` and
   `VITE_API_URL=https://<api-host>/api`, then `npm run build`. The SPA needs a rewrite so
   deep links survive a refresh — `vercel.json` and `public/_redirects` already do this.
3. Paste both live URLs into the top of this file (grading asks for them explicitly).
4. Zip the repo as `StudentID_StudentName_CapstoneProject.zip` **without**
   `node_modules`, `dist` and `dist-mock`.

### Seeing the error state

**Mock build:** click **“mock API: healthy”** in the footer to flip it to `failing`; every
request then rejects and each page shows its error surface with a working **Try again**.
`?fail=1` on any URL has the same effect.

**Real build:** stop the API process. Every page falls into the same error surface with a
**Try again** button, and restarting the server plus a retry recovers without a reload.

### Demo credentials

`VITE_USE_MOCK=true` — any valid email + a 6+ character password signs in; `wrongpass` is
rejected on purpose, and **Use a demo account** skips typing.

`VITE_USE_MOCK=false` — the seeded account only: **cris@crisfu.dev / crisfu2026**.

---

## Where the grading criteria live

| Requirement | Where |
|---|---|
| React SPA, no full reloads | `src/App.jsx`, `main.jsx` |
| React Router incl. dynamic route | `/blog/:id`, `/projects/:id` |
| Context API for auth | `src/context/AuthContext.jsx` |
| Auth-aware navigation | `src/components/Header.jsx` |
| Protected route | `src/components/ProtectedRoute.jsx` (`/admin`) |
| Controlled forms + validation | Login, Register, Contact, comment form, admin modal |
| Loading / Error / Empty states | `Skeleton.jsx`, `ErrorState.jsx`, `EmptyState.jsx`, `useApi` |
| Full CRUD | `src/pages/Admin.jsx` → `api.admin.*` |
| API layer ready for JWT + axios interceptors | `src/services/http.js` |
| Component reuse | `ProjectCard`, `PostRow`, `Filters` used in two places each |

---

## Known, deliberate limits

- The admin dashboard lists every project and post, not just the signed-in user's. The
  spec does not ask for a per-user filter, and with one author it would only hide things.
  Ownership is still enforced server-side on write (`owns` middleware) — the read is wide
  on purpose, the write is not.
- The admin page has no Messages tab yet. `GET /contact` exists and returns the inbox, so
  the data is there; only the table is missing.
- The debate simulator scores in the browser and keeps match history locally. The spec has
  no model for it, so those two calls deliberately never hit the API.
- Project covers for the four unshipped projects are authored SVGs, not screenshots. The
  two that actually run use real screenshots. See "Cover images" above.

The earlier multi-page prototype is kept in `../cris-site/` untouched, as the visual
reference this app was ported from.
