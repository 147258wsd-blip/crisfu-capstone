# Cris Fu — Personal Portfolio, Blog & Debate Simulator

Capstone project. A REST API built with Express + MongoDB, and a React client that talks to it.

**Student ID 24998018 · Fu Zhenyu** — submitted as `24998018_FuZhenyu_CapstoneProject.zip`.
The two live URLs are in [Live deployment](#live-deployment) below; the endpoint list with
request bodies starts at [API endpoints](#api-endpoints).

Two things worth knowing before reading the code:

- **Every project record says how far it got.** `status` is one of `live` (deployed and
  testable), `prototype` (runs, not a product) or `concept` (design only). The seeded data has
  one live project — this site — one playable prototype, and four concepts. The UI renders a
  badge from that field and hides the "Source code" button when `repoUrl` is empty, so there
  are no buttons that go nowhere.
- **The debate simulator's source ships in this archive** at `prototypes/debate-simulator.html`
  (a single self-contained file, no dependencies) and is also served at
  `/debate-simulator/` on the deployed site.

---

## Live deployment

The rubric asks for two things to be reachable on the public internet: the **built React
application** and the **API**. They run on two hosts:

| What | URL |
|---|---|
| Front-end (React, `npm run build`) | `https://147258wsd-blip.github.io/crisfu-capstone/` |
| Back-end API | `https://crisfu-api-ngpxktjcws.cn-hangzhou.fcapp.run/api` |
| API reference (opens in a browser, live calls) | `https://147258wsd-blip.github.io/crisfu-capstone/api-docs.html` |

The site is the Vite build published to GitHub Pages (`npm run publish:pages`); the API is an
Express app running on Alibaba Cloud Function Compute, backed by MongoDB Atlas.

Why the front-end is not on the same host as the API: Function Compute's default domain
answers every response with `Content-Disposition: attachment`, so a browser downloads the page
instead of rendering it. Removing that header requires binding a custom domain, which requires
an ICP filing. The header does not affect XHR, so the API stays where it is and the static
build lives on Pages. The client is compiled with an absolute API base
(`VITE_API_URL`), so every request the browser makes in production goes to the deployed
back-end — never to a mock and never to `localhost`. CORS is handled by the API: the origin is
reflected, including the pre-flight for the `Authorization` header.

Verification:

```bash
curl -I https://147258wsd-blip.github.io/crisfu-capstone/               # 200 text/html, no attachment header
curl https://crisfu-api-ngpxktjcws.cn-hangzhou.fcapp.run/api/health     # {"success":true,"status":"ok",...}
curl https://crisfu-api-ngpxktjcws.cn-hangzhou.fcapp.run/api/projects   # {"success":true,"count":6,...}
curl https://crisfu-api-ngpxktjcws.cn-hangzhou.fcapp.run/api/skills     # {"success":true,"count":18,...}
```

Deep links (`/blog/:id`, `/admin`) survive a hard refresh: `publish:pages` also writes a
`404.html` copy of `index.html`, which is the SPA fallback GitHub Pages honours.

---

## Two halves

| Folder | What it is |
|---|---|
| `server/` | Express API — models, JWT auth, ownership checks, 27 endpoints, seed script. See `server/README.md` for the full endpoint table. |
| `cris-react/` | The client folder — React 18 + Vite, React Router, an `adapters` layer that maps API documents onto view models, and a mock fallback for offline development. |

Pages: `/` home, `/projects` + `/projects/:id`, `/blog` + `/blog/:id`, `/debate`, `/contact`,
`/login`, `/register`, `/admin` (admin only — a member who signs in gets an explanation page).

---

## Who can write

Registration is public because the spec asks for it, but registering does not make you an author.
`User.role` is `member` by default and `admin` only for the addresses in `ADMIN_EMAILS`; the value
comes from the server, never from the request body, so `{"role":"admin"}` in a signup payload is
ignored.

| | member (a visitor who registered) | admin (the author account) |
|---|---|---|
| read projects / skills / posts / comments | yes | yes |
| comment on a post | yes | yes |
| create / edit / delete content | **403** | yes, for records they own |
| read the contact inbox, `/admin/stats` | **403** | yes |

Two gates run in order: `protect` (is this a real session?) then `requireAdmin` (may this account
write?), and `owns` still runs underneath so even an admin cannot edit a record another author
created. This is why a fresh account sees a plain "this dashboard is the author's" page instead of
a dashboard of somebody else's numbers.

To promote an existing account (or list who currently can write):

```bash
cd server && npm run set:admin -- --list
cd server && npm run set:admin -- someone@example.com
```

---

## API endpoints

Everything is mounted under `/api`; `GET /api` returns this same map at runtime.
**Bearer** = any signed-in account · **Admin** = `role: "admin"` only (a member gets 403).

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | — | uptime probe |
| POST | `/users/register` | — | 201 + JWT; creates a `member`; 409 on duplicate email or username |
| POST | `/users/login` | — | one message for both "no such email" and "wrong password" |
| GET | `/users/me` | Bearer | also the token re-validation call the SPA makes on load; includes `role` |
| GET | `/projects` | — | `?cat=` filters on the category inside the payload |
| GET | `/projects/:id` | — | 404 on a malformed id instead of a cast error |
| POST | `/projects` | Admin | owner comes from the token, never from the body |
| PUT/PATCH | `/projects/:id` | Admin + owner | 403 for anyone else |
| DELETE | `/projects/:id` | Admin + owner | |
| GET | `/skills` | — | `?category=` and `?minLevel=` filter; sorted by category then `order` |
| GET | `/skills/:id` | — | 404 on a malformed id |
| POST | `/skills` | Admin | level must be 1–5, category from a fixed list |
| PUT/PATCH | `/skills/:id` | Admin + owner | 403 for anyone else |
| DELETE | `/skills/:id` | Admin + owner | |
| GET | `/blog` | — | author populated |
| GET | `/blog/:id` | — | includes `commentCount` |
| POST | `/blog` | Admin | |
| PUT/PATCH | `/blog/:id` | Admin + author | |
| DELETE | `/blog/:id` | Admin + author | removes the post's comments with it |
| GET | `/blog/:postId/comments` | — | populated author |
| POST | `/blog/:postId/comments` | Bearer | author taken from the token — commenting is the one write a member may make |
| DELETE | `/blog/:postId/comments/:commentId` | Bearer | comment author or post author |
| POST | `/contact` | — | 400 on an invalid email |
| GET | `/contact` | Admin | inbox, newest first — other people's names and addresses |
| PUT/PATCH | `/contact/:id/read` | Admin | mark one message as read. The client sends **PUT**: the Function Compute HTTP trigger rejects PATCH at the gateway (403) before Express sees it, so both verbs point at the same handler. |
| GET | `/admin/stats` | Admin | five counters via `countDocuments` |
| GET | `/admin/activity` | Admin | merged feed of the 10 newest events |

Errors are always JSON with the same shape:

```json
{ "success": false, "message": "…", "errors": { "field": "…" } }
```

### Request bodies and query parameters

Every body is JSON. `pick()` in `controllers/helpers.js` is the allow-list that sits between
the request and the model: only the fields named below reach the database, so a body carrying
`{"role":"admin"}` or `{"user":"<someone else's id>"}` is stripped rather than trusted.

**Write endpoints — what to send**

| Endpoint | Body | Rules |
|---|---|---|
| `POST /users/register` | `{ username, email, password }` | username 2–60, email must match a basic address pattern, password ≥ 6. Duplicate email or username → 409. `role` in the body is ignored. Returns `201 { success, token, user }`. |
| `POST /users/login` | `{ email, password }` | Returns `200 { success, token, user }`. "No such email" and "wrong password" return the same message on purpose, so the endpoint cannot be used to enumerate accounts. |
| `POST /projects` | `{ title, description, imageUrl?, repoUrl?, liveUrl? }` | `title` required, ≤ 120 chars. `description` is a string; the client stores a JSON payload in it (`blurb`, `problem`, `built`, `learned`, `stack`, `tags`, `status`, `statusNote`, `links`) and the API never parses it. `user` comes from the token, never from the body. |
| `PUT`/`PATCH /projects/:id` | any subset of those five fields | 404 on a malformed id (not a cast error), 403 if the record is not yours |
| `POST /skills` | `{ name, category, level?, order? }` | `name` required, ≤ 60. `category` ∈ `Frontend`, `Backend`, `Tools`, `Design`, `Other`. `level` 1–5, default 3. `order` default 0, used for display order. |
| `PUT`/`PATCH /skills/:id` | any subset of `{ name, category, level, order }` | |
| `POST /blog` | `{ title, content }` | both required; `title` ≤ 160. `content` is plain text or the client's JSON block payload. `author` comes from the token. |
| `PUT`/`PATCH /blog/:id` | any subset of `{ title, content }` | |
| `POST /blog/:postId/comments` | `{ body }` | required, ≤ 2000. `author` comes from the token. This is the only write a `member` may make. |
| `DELETE /blog/:postId/comments/:commentId` | no body | allowed for the comment's author or the post's author |
| `POST /contact` | `{ name, email, message }` | `name` 2–80, `email` must match, `message` 10–4000. No account required — this is the one write the public can make. |
| `PUT`/`PATCH /contact/:id/read` | no body | marks that one message read and returns it |

**Read endpoints — query parameters**

| Endpoint | Params |
|---|---|
| `GET /projects` | `?cat=` — exact match on the category inside the payload |
| `GET /skills` | `?category=` (one of the five, or `All`) and `?minLevel=` (1–5) |
| `GET /blog` | `?cat=` |
| `GET /blog/:id` | — (response carries `commentCount`) |
| `GET /blog/:postId/comments` | — (author populated) |
| `GET /contact` | — (newest first) |
| `GET /admin/stats`, `/admin/activity` | — |

**A complete authenticated call**

```bash
API=https://crisfu-api-ngpxktjcws.cn-hangzhou.fcapp.run/api

TOKEN=$(curl -s -X POST "$API/users/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"cris@crisfu.dev","password":"crisfu2026"}' \
  | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

curl -s -X POST "$API/projects" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Demo","description":"Created from curl","liveUrl":"https://example.com"}'
```

---

## Run it locally

You need Node 18+, a MongoDB database (Atlas free tier works) and two terminals.

```bash
# 1. API — reads server/.env
cd server
cp .env.example .env          # then fill in MONGODB_URI and JWT_SECRET
npm install
npm run seed                  # creates the admin account + 6 projects, 18 skills, 6 posts
npm run dev                   # http://localhost:5000

# 2. Client — reads cris-react/.env.local
cd ../cris-react
cp .env.example .env.local    # VITE_API_URL already points at localhost:5000/api
npm install
npm run dev                   # http://localhost:5173
```

Open `http://localhost:5173`. If the home page shows projects and the toolbox fills up, the
two halves are connected.

### Environment variables

`server/.env` (the API reads it through `dotenv`; there is no other config file):

| Variable | Required | What it does |
|---|---|---|
| `MONGODB_URI` | yes | Atlas connection string **including the database name**, e.g. `mongodb+srv://user:pass@cluster.mongodb.net/crisfu?retryWrites=true&w=majority`. Without the name, Mongoose writes to `test`. |
| `JWT_SECRET` | yes | any long random string; changing it logs every session out |
| `JWT_EXPIRES_IN` | no | default `7d` |
| `PORT` | no | default `5000` |
| `NODE_ENV` | no | `development` turns on the verbose error handler |
| `ADMIN_EMAILS` | no | comma-separated addresses that become `admin` on register — set this to your own address or you will not be able to write. Exact addresses only, no wildcards. |
| `CLIENT_ORIGIN` | no | extra CORS origin. `localhost` and `*.vercel.app` are always allowed. |
| `SEED_USERNAME` / `SEED_EMAIL` / `SEED_PASSWORD` | no | the account `npm run seed` creates |

On Function Compute and Vercel these are set in the platform's environment panel instead of a
file — `api/fc.js` injects them, so the same code runs unmodified.

`cris-react/.env.local` (the client):

| Variable | What it does |
|---|---|
| `VITE_USE_MOCK` | `false` = talk to the real API (default). `true` = read from `src/data` and write to localStorage, so the UI can be developed with no backend at all. |
| `VITE_API_URL` | where the API lives. Local: `http://localhost:5000/api`. Production: an absolute URL (`https://…fcapp.run/api`), which is what the deployed build is compiled with, or `/api` when the page and the API share an origin. |

### Connecting front-end to back-end

The client never builds a URL by hand. `services/http.js` reads `VITE_API_URL` once and every
request goes through it, so switching from local to deployed is one line. Three notes:

- The API reflects the request's origin for CORS and answers the `Authorization` pre-flight, so
  no CORS configuration is needed on the client.
- The browser sends `Authorization: Bearer <token>` on protected calls. The token is stored in
  localStorage and re-validated against `GET /users/me` when the app loads — that call is also
  how the client learns whether the account is `admin`, which is what decides whether `/admin`
  shows a dashboard or an explanation page.
- If the API is unreachable the client degrades to the mock instead of showing an empty shell,
  so a dead back-end looks like "working but read-only" rather than "broken".

Seeded admin account: `cris@crisfu.dev` / `crisfu2026`.
Promote any other account with `cd server && npm run set:admin -- you@example.com`.

---

## Tests

```bash
cd server
npm run test:api          # 76 assertions against a real Express + Atlas stack
npm run test:serverless   # 12 assertions for the serverless entry point
npm run test:fc           # 15 assertions for the Function Compute event adapter
npm run clean:test        # deletes the accounts and records the tests created

cd ../cris-react
npm run build             # production build
npm run smoke             # 13 browser scenarios against the mock build
SMOKE_BASE=https://147258wsd-blip.github.io/crisfu-capstone npm run smoke:real
                          # the same checks against the deployed site + live API
```

`test:api` is not mocked: it registers real accounts, creates real documents and asserts on
status codes and response bodies, then `clean:test` removes what it made. The role gate is
covered from both sides — a member is expected to be refused, an admin to be served.

---

## What is in this archive

`24998018_FuZhenyu_CapstoneProject.zip` — 153 files. `node_modules` is excluded from **both**
halves, as are `.git`, the build output (`cris-react/dist`) and any real `.env`. Only
`.env.example` templates ship.

```
README.md               ← this file
DEPLOY.md               the same app on a plain Ubuntu VPS (nginx + pm2)
部署-FC.md              the Alibaba Cloud Function Compute walkthrough — the one in use
server/                 Express API: models, controllers, routes, middleware, tests, seed
cris-react/             React 18 + Vite client: pages, services, adapters, build scripts
prototypes/             the debate simulator, as one self-contained HTML file
```

Counts worth quoting: **27 API endpoints** · **76 + 12 + 15** server-side assertions ·
**6 projects** (1 live, 1 prototype, 4 concepts) · **18 skills** · **6 posts**.

---

## Deploy notes

- `部署-FC.md` — step-by-step Function Compute deployment (this is the one in use)
- `DEPLOY.md` — the same app on a plain Ubuntu VPS with nginx + pm2
- `server/Dockerfile` — single-container build (site + API), used by container hosts
- `server/api/_app.js` — Express app shared by every hosting shape; `api/fc.js` and
  `api/[...slug].js` only translate the platform's request format into Node's `req`/`res`
