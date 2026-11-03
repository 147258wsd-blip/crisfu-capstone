# Alternative: free hosting, and why most of it was ruled out

Written while choosing a host, kept as evidence of what was evaluated. **The deployment that
was submitted uses Function Compute for the API and GitHub Pages for the site** — see
[DEPLOY.md](DEPLOY.md). This document records the two free options that survived the October
2026 wave of platform failures, and why the other well-known ones did not.

## The shortlist

After the October 2026 incidents, only two directions remained that need no credit card, have
not closed registration, and can run resident Node code:

| | Option A: Back4App Containers | Option B: Alibaba Cloud Function Compute |
|---|---|---|
| Cost | free tier, long-running | 400,000 CU-seconds free per month |
| Credit card | **no** | **no** |
| Identity verification | no | **yes** (ID + face scan, ~10 min) |
| Latency from China | US node, works but slow | domestic node, fastest |
| Code changes needed | **none** — the root `Dockerfile` builds as-is | yes — wrap Express as a function (the serverless entry point is reused) |
| Front end + API | one container, one domain | two hosts, configured separately |
| Risk | small free tier; an idle app is reclaimed, so a first visit after inactivity waits 10–60 s | idle costs nothing; cold start 1–3 s |

**Option A first** was the original plan — no code changes, a result in ten minutes. Option B
was the fallback if A's build failed or the latency was unacceptable. B is what shipped.

---

## Option A: Back4App Containers

### 1. Register

<https://www.back4app.com> → **Sign Up** → **Sign up with GitHub** (authorise through GitHub;
do not use the email path).

### 2. Create the container

Console → **Containers** (left menu — *not* "Backend") → **Create New App** → **Containers as
a Service**.

### 3. Connect the repository

- **GitHub** → authorise → **Only select repositories** → tick `crisfu-capstone`
- Repository: `147258wsd-blip/crisfu-capstone`
- Branch: `main`
- **Dockerfile Path**: `Dockerfile` — the one in the repository *root*, not `server/Dockerfile`
- **Port**: `3000`

> The root `Dockerfile` is a two-stage build: stage one compiles the React app to static files,
> stage two puts those files and Express into one image. One URL is therefore both the site and
> the API — no CORS, and only one deployment.

### 4. Environment variables

Add these four (no `DNS_SERVERS`, no `PORT` — the platform provides the port):

```
MONGODB_URI     = copy the whole line from server/.env — the trailing /crisfu must stay
JWT_SECRET      = <generate your own long random string>
JWT_EXPIRES_IN  = 7d
NODE_ENV        = production
```

### 5. Deploy and verify

Click **Deploy**; the build takes 3–8 minutes (two sets of npm dependencies plus a Vite build).

With a domain of the form `https://xxxx.b4a.run`:

```bash
curl https://<domain>/api/health          # {"success":true,"status":"ok",...}
curl https://<domain>/api/projects        # 6 projects
curl -I https://<domain>/portfolio        # 200 text/html (SPA routes do not 404)
```

Then open `https://<domain>/` in a browser. Home page renders and the projects page shows six
records ⇒ the client is calling the live API rather than falling back to mock data.

### 6. Failures seen

| Symptom | Cause |
|---|---|
| Build log shows `npm ERR! enoent package.json` | Dockerfile Path was filled with a directory instead of a filename |
| 502 or endless spinner | Port is not 3000, or the container has not finished starting |
| `/api/health` returns 500 | `MONGODB_URI` missing `/crisfu`, or Atlas allow-list is not `0.0.0.0/0` |
| Blank page, CSP error in console | image built from an older commit — deploy again |
| Lists empty but API returns 200 | database was never seeded — run `npm run seed` locally once |

---

## Option B: Alibaba Cloud Function Compute

Chosen only after A proved unusable. Full steps in
[DEPLOY-FUNCTION-COMPUTE.md](DEPLOY-FUNCTION-COMPUTE.md). Allowance: 1,000,000 invocations and
400,000 CU-seconds per month for new users; at this API's size (100–200 ms per call, 256 MB)
normal use stays **well under 2,000 CU-seconds a month**, so the free tier covers years.

---

## One check that applies to every option

Atlas → **Network Access** must be `0.0.0.0/0`.

Cloud egress IPs are not fixed. Narrowing the list to "only my IP" guarantees the deployed app
cannot reach the database, and the symptom is misleading: pages render, but every list is
empty.
