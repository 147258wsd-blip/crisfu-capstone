# Cris Fu — Personal Portfolio, Blog & Debate Simulator

Capstone project. A REST API built with Express + MongoDB, and a React client that talks to it.

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
```

Deep links (`/blog/:id`, `/admin`) survive a hard refresh: `publish:pages` also writes a
`404.html` copy of `index.html`, which is the SPA fallback GitHub Pages honours.

---

## Two halves

| Folder | What it is |
|---|---|
| `server/` | Express API — models, JWT auth, ownership checks, 22 endpoints, seed script. See `server/README.md` for the full endpoint table. |
| `cris-react/` | The client folder — React 18 + Vite, React Router, an `adapters` layer that maps API documents onto view models, and a mock fallback for offline development. |

Pages: `/` home, `/projects` + `/projects/:id`, `/blog` + `/blog/:id`, `/debate`, `/contact`,
`/login`, `/register`, `/admin` (protected).

---

## API endpoints

Everything is mounted under `/api`; `GET /api` returns this same map at runtime.

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | — | uptime probe |
| POST | `/users/register` | — | 201 + JWT; 409 on duplicate email or username |
| POST | `/users/login` | — | one message for both "no such email" and "wrong password" |
| GET | `/users/me` | Bearer | also the token re-validation call the SPA makes on load |
| GET | `/projects` | — | `?cat=` filters on the category inside the payload |
| GET | `/projects/:id` | — | 404 on a malformed id instead of a cast error |
| POST | `/projects` | Bearer | owner comes from the token, never from the body |
| PUT/PATCH | `/projects/:id` | Bearer + owner | 403 for anyone else |
| DELETE | `/projects/:id` | Bearer + owner | |
| GET | `/blog` | — | author populated |
| GET | `/blog/:id` | — | includes `commentCount` |
| POST | `/blog` | Bearer | |
| PUT/PATCH | `/blog/:id` | Bearer + author | |
| DELETE | `/blog/:id` | Bearer + author | removes the post's comments with it |
| GET | `/blog/:postId/comments` | — | populated author |
| POST | `/blog/:postId/comments` | Bearer | author taken from the token |
| DELETE | `/blog/:postId/comments/:commentId` | Bearer | comment author or post author |
| POST | `/contact` | — | 400 on an invalid email |
| GET | `/contact` | Bearer | admin inbox, newest first |
| PUT/PATCH | `/contact/:id/read` | Bearer | mark one message as read. The client sends **PUT**: the Function Compute HTTP trigger rejects PATCH at the gateway (403) before Express sees it, so both verbs point at the same handler. |
| GET | `/admin/stats` | Bearer | four counters via `countDocuments` |
| GET | `/admin/activity` | Bearer | merged feed of the 10 newest events |

Errors are always JSON with the same shape:

```json
{ "success": false, "message": "…", "errors": { "field": "…" } }
```

---

## Run it locally

```bash
# API — needs server/.env with MONGODB_URI and JWT_SECRET
cd server && npm install && npm run seed && npm run dev      # http://localhost:5000

# Client
cd cris-react && npm install && npm run dev                  # http://localhost:5173
```

`cris-react/.env.local` sets `VITE_USE_MOCK=false` so the client hits the API. Removing that
file flips the client to a localStorage-backed mock, which is how the UI can be developed
without a database.

Seeded admin account: `cris@crisfu.dev` / `crisfu2026`.

---

## Tests

```bash
cd server
npm run test:api          # 53 assertions against a real Express + Atlas stack
npm run test:serverless   # 12 assertions for the Vercel serverless entry point
npm run test:fc           # 13 assertions for the Function Compute event adapter

cd ../cris-react
npm run build             # production build
npm run smoke             # 13 browser checks against the mock build
```

---

## Deploy notes

- `部署-FC.md` — step-by-step Function Compute deployment (this is the one in use)
- `DEPLOY.md` — the same app on a plain Ubuntu VPS with nginx + pm2
- `server/Dockerfile` — single-container build (site + API), used by container hosts
- `server/api/_app.js` — Express app shared by every hosting shape; `api/fc.js` and
  `api/[...slug].js` only translate the platform's request format into Node's `req`/`res`
