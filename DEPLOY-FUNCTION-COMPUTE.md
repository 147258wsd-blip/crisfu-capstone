# Deploying the API to Alibaba Cloud Function Compute

This is the path the deployed API actually uses. International hosts were unusable in this
cycle: Render froze sign-ups behind a risk check, Railway suspended new registrations after
its 21 October incident, Zeabur announced shutdown after the 14 October breach (3.2 million
environment variables exposed), Northflank and Koyeb require card verification, and Vercel
rate-limits new accounts created from mainland-China IPs. Function Compute was the remaining
option needing no card, no always-on instance, and giving a permanent URL.

**The cost, stated plainly.** It requires real-name verification (ID number + face scan,
about 10 minutes). The free allowance is "new-user trial **plus** a monthly quota", not
unlimited free forever — at this API's traffic it works out to roughly ¥0–1 (under US$0.20)
per month.

> **Important: the default domain cannot serve the website.**
> Function Compute adds `Content-Disposition: attachment` to **every** response from
> `*.fcapp.run`, so a browser downloads the page instead of rendering it. The header is
> injected by the gateway — no application code can remove it. Clearing it requires binding a
> custom domain, which requires an ICP filing.
>
> It does **not** affect API calls (XHR ignores that header), which is why the two halves are
> split:
>
> - **API on Function Compute** → `https://<trigger-id>.<region>.fcapp.run/api`
> - **static front-end on GitHub Pages** → `npm run publish:pages`
>   (see `cris-react/scripts/publish-pages.cjs`)
>
> `npm run pack:fc` still copies the built site into `public/` so a same-origin deployment
> (VPS, container) keeps working, but the submitted front-end URL is the GitHub Pages one.

---

## 1. Build the package (one command, on your own machine)

```bash
cd server
npm run pack:fc
```

It does four things: rebuilds the client with `VITE_API_URL=/api`, copies the API code plus
production dependencies, drops `dist` into `public/`, and zips the result to `fc-api.zip`
(about 4 MB) in the repository root.

> Re-run this command after every code change, then upload the new zip.

---

## 2. Activate Function Compute

<https://www.aliyun.com> → search **Function Compute (函数计算 FC)** → **Activate now**
(activation is free; the first time it asks for real-name verification).

---

## 3. Create the function

Console → **Function Compute** → **Functions** in the left menu → **Create Function** →
choose **Start from scratch**, then match each field:

| Field | Value |
|---|---|
| Creation method | Start from scratch |
| Function name | `crisfu-api` |
| Runtime | **Node.js 20** (built-in runtime — not "Custom Runtime") |
| Function type | **Event function** (it handles HTTP requests) |
| Code upload | **Upload ZIP package** → pick `fc-api.zip` |
| Handler | **`api/fc.handler`** (the leading `api/` matters — the entry file lives in `api/`) |
| Memory | **512 MB** |
| Execution timeout | **30 seconds** |
| Instance concurrency | 1 (default) |

Environment variables — add these four under **Advanced settings → Environment variables**:

```
MONGODB_URI     = copy the whole line from server/.env — the trailing /crisfu must stay
JWT_SECRET      = <generate your own long random string>
JWT_EXPIRES_IN  = 7d
NODE_ENV        = production
```

**Do not add `PORT`** (the platform forwards requests; the function never listens on a port)
and **do not add `DNS_SERVERS`** (that is a Windows-only workaround; setting it on Linux can
break DNS resolution).

---

## 4. Add the HTTP trigger (the step that is easy to miss)

With the function open → **Configuration** → **Triggers** → **Create Trigger**:

| Field | Value |
|---|---|
| Trigger type | **HTTP trigger** |
| Request methods | select **all** (GET, POST, PUT, DELETE, HEAD, OPTIONS) |
| Authentication | **No authentication** (⚠️ never pick signature auth — browsers get 403 immediately) |

Saving gives you a public URL:

```
https://<trigger-id>.<region>.fcapp.run
```

That host is the back-end URL; the API is that host plus `/api`.

---

## 5. Verify (three commands)

```bash
curl https://<your-host>/api/health      # {"success":true,"status":"ok",...}
curl https://<your-host>/api/projects    # success true, count 6
curl -I https://<your-host>/portfolio    # 200 + text/html (SPA routes do not 404)
```

Then open the host in a browser. If the home page renders and the projects page shows six
records, the client really is calling the deployed API.

---

## 6. Troubleshooting

| Symptom | Cause |
|---|---|
| Whole domain returns 404 / 403 | Authentication was set to signature auth — change it to **No authentication** |
| Pages load but the API returns 503 | `MONGODB_URI` lost its trailing `/crisfu`, or Atlas Network Access is not `0.0.0.0/0` |
| Plain-text `Internal Server Error` with HTTP 502, returned within ~50 ms | The handler points at a file that is not in the zip. The real entry is `api/fc.js`; current packages also add root `fc.js` / `index.js` forwarders, so `fc.handler`, `index.handler` and `api/fc.handler` all resolve. Still 502 → the uploaded zip is stale; re-run `npm run pack:fc` |
| Requests time out at 30 s | Cold start connecting to Atlas. Keep the timeout at 30 s; if it still times out, check the Atlas IP allow-list is `0.0.0.0/0` |
| `Cannot find module 'api/fc'` | The uploaded zip is stale — rebuild and re-upload |
| Login with the correct password returns 500 `Something went wrong on the server.` | `JWT_EXPIRES_IN` contains an invisible character (trailing space, full-width letter, a word instead of `7d`). **Delete the variable** — the code defaults to `7d` |
| Changed an environment variable, behaviour did not change | Variables are injected only when an instance starts. After saving you must click **Deploy Code**; confirm the restart by watching `uptime` in `/api/health` drop back to a small number |
| You need to see the real error | Temporarily set `NODE_ENV=development` and deploy — 500 responses then carry a `stack` field. Set it back to `production` as soon as you are done |
| Blank page | Stale zip — rebuild and re-upload |
| First request takes 1–3 seconds | Normal cold start; later requests are fast. Open the site once before a demo to warm it |

---

## 7. How the code runs on this platform

Function Compute 3.0's built-in runtime does not hand you an `http.Server`. It turns the
request into an `event` JSON and expects `{ statusCode, headers, body }` back. The repository
adds two layers for that:

- `server/api/fc.js` — the event adapter. Non-`/api` GETs are served straight from `public/`
  (long cache headers, SPA fallback to `index.html`); everything else is rebuilt into a Node
  `req`/`res` pair and handed to `server/api/_app.js`, **the same Express app the serverless
  entry point uses**. Routes, authentication and error shapes are therefore identical to
  local development.
- `server/api/_fc-response.js` — Express calls `Object.setPrototypeOf(res, app.response)` in
  its middleware, which replaces the prototype wholesale, so every response method is
  attached to the instance itself instead.

Check it locally: `npm run test:fc` builds real Function Compute events and asserts on 15
behaviours — static files, SPA fallback, binary responses as base64, path-traversal
protection, login success and failure, 401, 404, and the OPTIONS pre-flight.
