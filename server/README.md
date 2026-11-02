# Cris Fu — Capstone API

The back-end half of the project: Express + MongoDB Atlas + Mongoose, JWT auth, five
models, 27 endpoints, one error handler. The React SPA in `../cris-react` is the only
client.

> **Status** — built, seeded, and verified end to end against a live Atlas cluster.
> Live API: _pending deployment_ · Client: _pending deployment_

---

## Run it

```bash
npm install
cp .env.example .env      # then fill in MONGODB_URI and JWT_SECRET
npm run seed              # 6 projects, 5 posts, 2 comments, 2 messages, 1 owner
npm start                 # http://localhost:5000/api
npm run test:api          # 53 assertions against the running server
```

`npm run dev` restarts on file changes. `npm run clean:test` removes the records the
tests create and leaves the seeded content untouched.

### Environment

| Variable | Required | Notes |
|---|---|---|
| `MONGODB_URI` | yes | Atlas SRV string, **with** a database name: `…/crisfu?retryWrites=true` |
| `JWT_SECRET` | yes | long random string; changing it invalidates every issued token |
| `JWT_EXPIRES_IN` | no | default `7d` |
| `PORT` | no | default `5000` |
| `NODE_ENV` | no | `production` hides stack traces and switches logs to `combined` |
| `CLIENT_ORIGIN` | no | comma-separated frontend origins; `localhost` and `*.vercel.app` are always allowed |
| `SERVE_STATIC` | no | folder (relative to `server/`) holding a built SPA; when set, the same process serves the site and the API from one origin |
| `DNS_SERVERS` | no | Windows only — see *Two problems worth knowing* below |

---

## Layout

```
server/
├── server.js              helmet, cors, json, request log, routes, 404, error handler
├── config/db.js           Atlas connection (+ optional DNS override)
├── models/                User, Project, Skill, BlogPost, Comment, Message
├── controllers/           one per model + adminController for the dashboard
├── routes/                six resource routers + an index that documents itself
├── middleware/
│   ├── auth.js            signToken, protect, owns(model, field)
│   ├── validate.js        validId — a malformed id is a 404, not a 500
│   └── error.js           normalise Mongoose/JWT errors, then one JSON shape
├── scripts/               inspect-uri, probe-dns, check-db, check-models,
│                          test-api, clean-test
├── data/seed.json         the content the frontend ships, exported once
└── seed.js                idempotent import (upsert by title)
```

Request flow: `server.js` → router → `protect` (who are you) → `owns` (is it yours) →
controller → model → JSON. Errors of any kind surface in one place with one shape:

```json
{ "success": false, "message": "You can only change projects you created." }
```

Validation failures add a per-field map: `{ "success": false, "message": "…", "errors": { "email": "…" } }`.

---

## Models

Field names are the ones the spec fixes — no renaming for convenience.

| Model | Columns | Rules |
|---|---|---|
| **User** | `username`, `email`, `password`, timestamps | password hashed by a `pre('save')` hook (bcrypt, 10 rounds), `select: false`, `comparePassword()` |
| **Project** | `title`, `description`, `imageUrl`, `repoUrl`, `liveUrl`, `user` → User, timestamps | `description` required, owner required |
| **Skill** | `name`, `category`, `level` 1–5, `order`, `user` → User, timestamps | `category` from a fixed list (Frontend/Backend/Tools/Design/Other); `order` keeps the toolbox stable |
| **BlogPost** | `title`, `content`, `author` → User, timestamps | `content` a `String` as specified |
| **Comment** | `body`, `author` → User, `post` → BlogPost, timestamps | both refs required |
| **Message** | `name`, `email`, `message`, `read`, timestamps | detached from User on purpose — visitors write without an account |

**On `description` and `content`.** Both are `String` columns in the spec, but the pages
need structure (problem / what I built / stack / body blocks). Rather than add columns the
spec does not have, the client stores a JSON payload in them and the server treats the
column as opaque text. Paste plain prose into Atlas by hand and the pages still render —
`adapters.js` falls back to splitting on blank lines and treating `## x` as a heading.

---

## Endpoints

All under `/api`. `GET /api` returns this map at runtime.

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | — | uptime probe |
| POST | `/users/register` | — | 201 + JWT; 409 on duplicate email/username |
| POST | `/users/login` | — | same message for unknown email and wrong password |
| GET | `/users/me` | Bearer | also the token re-validation call the SPA makes on load |
| GET | `/projects` | — | `?cat=` filters on the category inside the payload |
| GET | `/projects/:id` | — | 404 on a malformed id rather than a cast error |
| POST | `/projects` | Bearer | owner taken from the token, never the body |
| PUT/PATCH | `/projects/:id` | Bearer + owner | 403 for anyone else |
| DELETE | `/projects/:id` | Bearer + owner | |
| GET | `/skills` | — | `?category=` and `?minLevel=` filter; sorted by category then `order` |
| GET | `/skills/:id` | — | 404 on a malformed id |
| POST | `/skills` | Bearer | `name` required, `level` 1–5, `category` from the fixed list |
| PUT/PATCH | `/skills/:id` | Bearer + owner | 403 for anyone else |
| DELETE | `/skills/:id` | Bearer + owner | |
| GET | `/blog` | — | author populated |
| GET | `/blog/:id` | — | includes `commentCount` |
| POST | `/blog` | Bearer | |
| PUT/PATCH | `/blog/:id` | Bearer + author | |
| DELETE | `/blog/:id` | Bearer + author | deletes the post's comments with it |
| GET | `/blog/:postId/comments` | — | `populate("author", "username")` |
| POST | `/blog/:postId/comments` | Bearer | author from the token, so no display name is trusted |
| DELETE | `/blog/:postId/comments/:commentId` | Bearer | comment author **or** post author |
| POST | `/contact` | — | 400 on an invalid email |
| GET | `/contact` | Bearer | admin inbox, newest first |
| PATCH | `/contact/:id/read` | Bearer | |
| GET | `/admin/stats` | Bearer | four counters, computed with `countDocuments` |
| GET | `/admin/activity` | Bearer | merged feed of the 10 newest events |

---

## Security

- **bcrypt** (10 rounds) in a `pre('save')` hook; the hash never leaves the API because
  the column is `select: false` and `toJSON` deletes it.
- **JWT** signed with `JWT_SECRET`, 7-day expiry, minimal payload (`{ id }`). `protect`
  loads the user on every request, so a deleted account cannot keep using a live token.
- **Ownership** is a middleware (`owns`), not a checkbox in the UI: it loads the document,
  compares `user`/`author` to `req.user._id`, and hands the document to the controller so
  the query is not repeated.
- **helmet** on every response; **CORS** allow-lists localhost and `*.vercel.app`, and any
  origin in `CLIENT_ORIGIN`. Requests with no origin (curl, Postman) pass.
- **`Cache-Control: no-store`** on `/api`. Without it a browser can serve a cached comment
  thread right after you post to it.
- **NoSQL injection**: bodies are filtered through a field allow-list (`pick`) and ids are
  checked with `mongoose.isValidObjectId` before they reach a query, so `{"$gt": ""}`
  never becomes a filter.

---

## Two problems worth knowing

**1. `querySrv ECONNREFUSED` on Windows.** Node's c-ares resolver can be refused by the
local DNS server for SRV lookups while `nslookup` works fine. Proven by resolving the same
`_mongodb._tcp.…` record against 8.8.8.8 successfully. Workaround is the optional
`DNS_SERVERS` variable (`config/db.js` calls `dns.setServers`). Linux hosts such as Railway
or Zeabur do not need it.

**2. `NODE_TLS_REJECT_UNAUTHORIZED=0` in the system environment.** Not set by this
project, but it is global: every Node process on that machine skips TLS certificate
verification. It does not affect deployment (PaaS hosts have no such variable), and it should be
deleted from the machine after the submission.

---

## Deploy

The same Express app ships in two shapes.

**Serverless (Vercel).** `api/index.js` serves `GET /api`, `api/[...slug].js` serves
everything below it. Both delegate to `api/_app.js`, which does the one thing Express
cannot do on its own: reuse the Mongoose connection across invocations of a warm instance,
so a burst of traffic does not open a connection per request. Project settings are Root
Directory `server`, framework `Other`, no build command. `npm run test:serverless` runs the
whole surface through that wrapper against the real Atlas cluster before you deploy.

**Long-lived process (Docker, VPS, Railway, Koyeb, …).** The repo ships a `Dockerfile`, so
the platform does not have to guess a build command — point it at `server/` and it builds,
then `server.js` calls `app.listen`.

Steps that apply to either shape:

1. Create a **web service** from the GitHub repo with **Root Directory** `server`.
   Railway/Zeabur detect the `Dockerfile`; on a buildpack host use build `npm ci` and start
   `npm start`.
2. Environment variables:

   | key | value |
   |---|---|
   | `MONGODB_URI` | your Atlas SRV string, **with** the `/crisfu` database name |
   | `JWT_SECRET` | a long random string (different from local) |
   | `JWT_EXPIRES_IN` | `7d` |
   | `NODE_ENV` | `production` |
   | `CLIENT_ORIGIN` | the deployed frontend origin, e.g. `https://crisfu.vercel.app` |

3. Health check path: **`/api/health`** — returns `200` with an uptime counter.
4. In Atlas → Network Access keep `0.0.0.0/0`: PaaS egress IPs are not fixed. Do not set
   `DNS_SERVERS` on Linux — that workaround is Windows-only.
5. Seed once from your machine against the same Atlas cluster (`npm run seed`). The database
   is shared, so the deployed API serves the same records.

`server/railway.toml` is only read on the container path — it pins the Dockerfile builder,
the health-check path and a restart policy, so such a host needs no dashboard tweaking
beyond the variables above. On Vercel the file is ignored.
