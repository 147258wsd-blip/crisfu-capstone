# Deployment

How the two submitted URLs are produced, and how to reproduce them from a clean checkout.

## What runs where

```
visitor's browser
    │
    ├── static site ──► GitHub Pages      https://147258wsd-blip.github.io/crisfu-capstone/
    │                   cris-react/dist, pushed to the `gh-pages` branch
    │
    └── XHR ─────────► Alibaba Cloud Function Compute
                       https://crisfu-api-ngpxktjcws.cn-hangzhou.fcapp.run/api
                            └──► MongoDB Atlas  (cluster ac-rwewqeg, database `crisfu`)
```

| Half | Host | Built by |
|---|---|---|
| Front-end | GitHub Pages | `cd cris-react && npm run publish:pages` |
| API | Alibaba Cloud Function Compute | `cd server && npm run pack:fc`, then upload the zip |
| Database | MongoDB Atlas | `cd server && npm run seed` (once) |

They are on two hosts **on purpose**. Function Compute's default `*.fcapp.run` domain answers
every response with `Content-Disposition: attachment`, so a browser downloads the HTML instead
of rendering it. That header is added by the platform gateway, cannot be removed in code, and
can only be cleared by binding a custom domain — which requires an ICP filing. It does not
affect XHR, so the API stays where it is and the static build is served from Pages, calling it
cross-origin. CORS is handled by the API: the request's origin is reflected, and the
pre-flight for the `Authorization` header is answered.

Because the client is compiled with an absolute API base (`VITE_API_URL`), every request the
deployed site makes goes to the deployed back end — never to a mock and never to `localhost`.

---

## Deploying the front-end

```bash
cd cris-react
npm run publish:pages
```

`scripts/publish-pages.cjs` does three things:

1. builds with `VITE_API_URL` set to the live API
   (override with `LIVE_API=https://other.host/api npm run publish:pages`);
2. copies `index.html` to `404.html` — this is the SPA fallback GitHub Pages honours, and it is
   why a hard refresh on `/projects/:id` or `/admin` does not 404;
3. pushes the build to the `gh-pages` branch.

One-time setup: repository **Settings → Pages → Source: Deploy from a branch → `gh-pages` →
`/ (root)` → Save**.

## Deploying the API

See **[DEPLOY-FUNCTION-COMPUTE.md](DEPLOY-FUNCTION-COMPUTE.md)** — packaging, function
configuration, the HTTP trigger (authentication must be **No authentication**), environment
variables and a troubleshooting table.

Environment variables on the platform (never in a file — there is no `.env` in the archive):

| Variable | Value |
|---|---|
| `MONGODB_URI` | Atlas connection string including `/crisfu` |
| `JWT_SECRET` | any long random string — generate your own |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` |
| `ADMIN_EMAILS` | the addresses that should be able to write, e.g. `cris@crisfu.dev` |

Do not set `PORT` (the platform forwards requests) or `DNS_SERVERS` (a Windows-only
workaround).

## Seeding the database

```bash
cd server
npm run seed     # 1 admin account, 6 projects, 18 skills, 6 posts
npm run set:admin -- --list
```

Atlas → **Network Access** must allow `0.0.0.0/0`. Cloud egress IPs are not fixed, so
narrowing the list to your own address produces a site that renders but shows empty lists.

---

## Verifying a deployment

```bash
curl -I https://147258wsd-blip.github.io/crisfu-capstone/              # 200 text/html
curl https://crisfu-api-ngpxktjcws.cn-hangzhou.fcapp.run/api/health    # {"success":true,"status":"ok"}
curl https://crisfu-api-ngpxktjcws.cn-hangzhou.fcapp.run/api/projects  # count 6
curl https://crisfu-api-ngpxktjcws.cn-hangzhou.fcapp.run/api/skills    # count 18
```

Then, in a browser:

1. Home page shows the six projects and the skills grid — proves the cross-origin call works.
2. Open a project detail page.
3. Sign in as the author → `/admin` shows five counters.
4. Sign out, register a fresh account, open `/admin` again → "This dashboard is the author's."
   A member is refused by the server (403 on every write and on the inbox), not merely hidden
   from by the client.

---

## Day-to-day

```bash
cd server  && npm run pack:fc          # after any API change → upload the new zip
cd cris-react && npm run publish:pages # after any client change
cd server  && npm run clean:test       # remove accounts and records the test suite created
```

The function is serverless: there is no machine to keep running, no console to leave open. It
starts on the first request and stays warm for a while. The first request after an idle period
takes 1–3 seconds — open the site once before a demo.

---

## Other ways to run it

The API is the same Express app in every shape — `server/api/_app.js` is assembled once and
each host only translates its own request format into Node's `req`/`res`.

| Path | Document |
|---|---|
| Same origin on one Ubuntu VPS (nginx + pm2), the arrangement this project first used | [DEPLOY-VPS.md](DEPLOY-VPS.md) |
| Free-tier hosting compared, including why Render / Railway / Zeabur / Vercel were ruled out | [DEPLOY-FREE-HOSTING.md](DEPLOY-FREE-HOSTING.md) |
| Opening a Chinese cloud account (real-name verification), evaluated but not used | [CLOUD-ACCOUNT-SETUP.md](CLOUD-ACCOUNT-SETUP.md) |
| Docker, single container serving site + API | the `Dockerfile` in the repository root |

---

## Submission checklist

- [x] Repository: `https://github.com/147258wsd-blip/crisfu-capstone`
- [x] Front-end URL: `https://147258wsd-blip.github.io/crisfu-capstone/`
- [x] Back-end URL: `https://crisfu-api-ngpxktjcws.cn-hangzhou.fcapp.run/api`
- [x] Author account: `cris@crisfu.dev` / `crisfu2026`
- [x] Archive `24998018_FuZhenyu_CapstoneProject.zip` — no `node_modules`, no `dist`, no `.env`
- [x] README endpoint list matches the mounted routes (`GET /api` prints the same map live)
