# Cris Fu — Personal Portfolio, Blog & Debate Simulator

Capstone project. A REST API built with Express + MongoDB, and a React client that talks to it.

---

## Live deployment

The rubric asks for two things to be reachable on the public internet: the **built React
application** and the **API**. Both are served from one Alibaba Cloud Function Compute
instance, so they are two addresses on one host:

| What | URL |
|---|---|
| Front-end (React, `npm run build`) | `https://<trigger-id>.<region>.fcapp.run` |
| Back-end API | `https://<trigger-id>.<region>.fcapp.run/api` |

Replace `<trigger-id>.<region>` with the value shown under *Trigger → Configuration* in the
FC console.

Why one host instead of two: the free tier gives a single container, so the compiled site is
served by the same process as the API (`server/api/fc.js` reads `public/` for every non-`/api`
GET). The client calls the API at the relative path `/api`, meaning every request the browser
makes in production goes to the deployed back-end — never to a mock and never to `localhost`.
That is also why there are no CORS settings to get wrong.

Verification:

```bash
curl https://<host>/api/health     # {"success":true,"status":"ok",...}
curl https://<host>/api/projects   # {"success":true,"count":6,"data":[...]}
curl -I https://<host>/portfolio   # 200 text/html — SPA route, not a 404
```

---

## Two halves

| Folder | What it is |
|---|---|
| `server/` | Express API — models, JWT auth, ownership checks, 22 endpoints, seed script. See `server/README.md` for the full endpoint table. |
| `cris-react/` | React 18 client — Vite, React Router, an `adapters` layer that maps API documents onto view models, and a mock fallback for offline development. |

Pages: `/` home, `/projects` + `/projects/:id`, `/blog` + `/blog/:id`, `/debate`, `/contact`,
`/login`, `/register`, `/admin` (protected).

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
