# Alternative: one Ubuntu VPS for both halves

This is **not** the arrangement that is deployed — the live submission uses GitHub Pages for
the site and Function Compute for the API (see [DEPLOY.md](DEPLOY.md)). This path is kept
because it is the simplest to reason about: one machine, one origin, no CORS, and no
dependence on any hosting platform's free-tier policy. It is also the fallback if a free host
becomes unavailable.

## Why it was considered

| Platform | Status, November 2026 |
|---|---|
| Render | sign-up triggers a risk check; card or phone verification required |
| Railway | **new registrations suspended** after the 21 October security incident; no reopening date |
| Zeabur | breached 14 October (3.2 million environment variables exposed); **shutdown announced**, everything offline from 31 December |
| Northflank / Koyeb | card verification; Northflank also breached on 30 October |
| Vercel | accounts created from mainland-China IPs are frequently flagged as "restricted" |

The pool of international platforms that run a resident Node process for free had emptied. A
single domestic VPS avoids platform policy entirely: **front end and back end on the same
machine**, nginx serving the static build and reverse-proxying `/api` to Express.

```
visitor → http://<IP>/        nginx → /opt/crisfu/cris-react/dist   (static site)
              /api/*         nginx → 127.0.0.1:5000                 (Express, kept alive by pm2)
                                        └──► MongoDB Atlas
```

Two URLs, same origin:

- Front end: `http://<IP>/`
- Back end: `http://<IP>/api`

Same origin means CORS never fires. (`server.js` still carries an allow-list, which matters
only if you move to a custom domain.)

---

## Step 1 — Rent the server

1. Register at <https://cloud.tencent.com> → **personal real-name verification** (ID card; a
   few minutes). Without it you cannot buy a machine in a mainland region.
2. **Lighthouse (轻量应用服务器)** → create:
   - **Image**: **Ubuntu Server 22.04 LTS 64bit** — a clean system image, *not* the
     WordPress / Docker / Node.js application templates
   - **Spec**: 2 vCPU / 2 GB is enough (first-order discount for new users; student
     verification is cheaper still — verify first, then order)
   - **Region**: nearest to you (Guangzhou / Shanghai / Beijing)
   - **Login**: **password** — choose a strong one and write it down
3. In the console **Firewall** page, confirm port **80** is open (22/80/443 are open by
   default).
4. Note the **public IP**.

> No domain needed — the raw IP is enough for a submission. You only need a domain for HTTPS.

---

## Step 2 — Pack and upload the code

On your own machine:

```bash
cd <repository>
git archive --format=tar.gz -o crisfu.tar.gz HEAD
scp crisfu.tar.gz root@<server-ip>:/root/
scp server/.env  root@<server-ip>:/root/crisfu.env
```

`.env` already carries `MONGODB_URI` and `JWT_SECRET`; the setup script strips the
Windows-only `DNS_SERVERS` line.

On Windows (PowerShell) the same two `scp` commands work; use `server\.env` for the path.

---

## Step 3 — Log in and run the one-shot setup

```bash
ssh root@<server-ip>
```

Then paste three lines:

```bash
mkdir -p /opt/crisfu && tar -xzf /root/crisfu.tar.gz -C /opt/crisfu
sed -i 's/\r$//' /opt/crisfu/deploy/setup.sh
bash /opt/crisfu/deploy/setup.sh /root/crisfu.env
```

The script, in order: installs nginx → adds 2 GB of swap (a 2 GB machine can be OOM-killed
during the Vite build) → installs Node 20 (falls back to the npmmirror binaries if NodeSource
is unreachable) → installs pm2 → installs API dependencies → writes and sanitises `.env` →
starts the API → builds the client with `VITE_USE_MOCK=false` and the API at same-origin
`/api` → configures nginx → runs one health check.

Three to six minutes. It ends by printing both URLs:

```
============================================================
  API    http://1.2.3.4/api
  {"success":true,"status":"ok","uptime":8,...}
  Site   http://1.2.3.4/          (HTTP 200)
============================================================
```

---

## Step 4 — Verify

1. Open `http://<IP>/` — the home page shows projects with real data.
2. DevTools → Network: `/api/projects` returns 200.
3. Sign in at `/login` as `cris@crisfu.dev` / `crisfu2026`.
4. Create a project under `/projects`, refresh — it is still there (it was really written).
5. Sign out and go straight to `/admin` — you are sent back to the login page.
6. Submit a message at `/contact`.
7. `http://<IP>/api/health` returns 200.

---

## Step 5 — Routine

```bash
pm2 logs crisfu-api          # API logs
pm2 restart crisfu-api       # after changing .env
systemctl reload nginx       # after changing nginx config
```

To deploy a new commit (after `git push` locally):

```bash
git archive --format=tar.gz -o crisfu.tar.gz HEAD
scp crisfu.tar.gz root@<IP>:/root/
```

```bash
cd /opt/crisfu && tar -xzf /root/crisfu.tar.gz -C /opt/crisfu --overwrite
bash /opt/crisfu/deploy/setup.sh /root/crisfu.env
```

The script is idempotent — it will not start a second process.

---

## Step 6 — Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Browser cannot connect, `ssh` works | port 80 not opened in the console firewall |
| Page returns 502 Bad Gateway | API is down: `pm2 logs crisfu-api --lines 40`, usually a `MONGODB_URI` error |
| `/api/health` returns 500 | Atlas unreachable — check Atlas → Network Access is `0.0.0.0/0` |
| Blank page, 404s in console | client build failed — re-run `cd /opt/crisfu/cris-react && npm run build` |
| Refreshing a sub-route 404s | nginx `try_files ... /index.html` was overwritten — check `/etc/nginx/sites-available/crisfu` |
| Build dies with `Killed` | out of memory — confirm swap is active (`free -h`, expect ~2.0 Gi swap) |
| Lists render but are mock data | `VITE_USE_MOCK` must be `false` at build time; rebuild |
| Files show mojibake on the server | CRLF line endings — `sed -i 's/\r$//'` |

---

## If you would rather not rent a machine

Tencent Cloud **CloudBase** has a free trial: static hosting for the site, a managed container
for the API. It costs a WeChat-official-account redemption code, the back end goes through
"build image → push to the container registry → create service", and it needs Docker locally.
For a one-off submission it is more roundabout than a ¥68 machine, and worth considering only
if spending nothing is a hard requirement.
