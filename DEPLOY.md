# 部署手册（Vercel 双项目）

## 为什么不用 Render / Railway / Zeabur

| 平台 | 现状 |
|---|---|
| Render | 注册触发风控，要求信用卡/手机验证 |
| Railway | 2026-10-21 安全事件（加密环境变量被解密），**新注册暂停至今，无重开日期** |
| Zeabur | 2026-10-14 被入侵，320 万条环境变量记录泄露，**已宣布关停**（12-01 共享集群暂停，12-31 全部下线） |
| Northflank | 2026-10-30 被入侵，要求全员轮换凭据，且要卡验证 |
| Koyeb | 要卡验证 |

结论：能免费跑常驻 Node 且不要卡的国际 PaaS，这一轮基本清空。改用 **Vercel**
（不在这批事故名单里、不要信用卡、GitHub 登录即可），前端本来就要放它家，
后端用 `server/api/` 下的两个入口函数接进同一套代码——业务逻辑一行没改。

## 架构

```
仓库 crisfu-capstone
├── server/          → Vercel 项目 A（crisfu-api）     https://crisfu-api.vercel.app/api/…
│   ├── api/index.js          GET /api
│   ├── api/[...slug].js      GET|POST /api/**
│   └── server.js             Express app（本地仍可 app.listen）
└── cris-react/      → Vercel 项目 B（crisfu-site）    https://crisfu-site.vercel.app
```

两个项目同一个仓库、同一分支，靠 **Root Directory** 区分。

---

## 第 1 步：代码推 GitHub ✅ 已完成

<https://github.com/147258wsd-blip/crisfu-capstone>，`main` 分支。后续改动：

```bash
cd /c/Users/Lenovo/WorkBuddy/2026-10-30-09-34-47
git add -A && git commit -m "说明" && git push
```

两个 Vercel 项目都监听 `main`，推上去自动重新部署。

---

## 第 2 步：部署后端（Vercel 项目 A）

1. 打开 <https://vercel.com> → **Continue with GitHub**（不要用邮箱注册）
2. **Add New… → Project** → 找到 `crisfu-capstone` → **Import**
3. 关键配置，**Import 之前**就要设好：
   - **Root Directory** → 点 **Edit** → 输入 `server`
   - **Framework Preset** → 选 `Other`
   - Build Command / Output Directory → 全部留空
4. 展开 **Environment Variables**，加四条：

   | Key | Value |
   |---|---|
   | `MONGODB_URI` | 从 `server/.env` 整行复制，**末尾 `/crisfu` 不能丢** |
   | `JWT_SECRET` | `GfKkmFsOUqiaQlCCoIsSyezL5uGBw1EXQ7H-OsszJqJlgnI9HoyxkFcC03MTz2cd` |
   | `JWT_EXPIRES_IN` | `7d` |
   | `NODE_ENV` | `production` |

   **不要**加 `DNS_SERVERS`，那是 Windows 本地专用的，Linux 上加了反而可能解析失败。
   `CLIENT_ORIGIN` 等到第 4 步再补。

5. **Deploy**。项目名建议就叫 `crisfu-api`，域名会是 `https://crisfu-api.vercel.app`
6. 验证：

   ```bash
   curl https://crisfu-api.vercel.app/api/health
   # {"success":true,"status":"ok",...}
   curl https://crisfu-api.vercel.app/api
   # 端点清单
   ```

   首次访问要等 2~5 秒（函数冷启动 + 连 Atlas），之后是毫秒级。

> 后端不需要 `Dockerfile` / `railway.toml` 了，但保留着——换平台时能直接用。

---

## 第 3 步：部署前端（Vercel 项目 B）

1. **Add New… → Project** → 还是选 `crisfu-capstone` → **Import**（同一个仓库可以导入多次）
2. 配置：
   - **Root Directory** → `cris-react`
   - **Framework Preset** → 自动识别 `Vite`
   - Build Command `npm run build`，Output Directory `dist`（默认）
3. **Environment Variables** 两条：

   | Key | Value |
   |---|---|
   | `VITE_USE_MOCK` | `false` |
   | `VITE_API_URL` | `https://crisfu-api.vercel.app/api` |

   `VITE_USE_MOCK` 默认是 `true`，不改会走本地假数据——评分时看不到真实接口调用，这条最容易漏。

4. **Deploy**，拿到 `https://<项目名>.vercel.app`

---

## 第 4 步：回填 CORS

回到 Vercel 的 `crisfu-api` 项目 → **Settings → Environment Variables** → 新增：

```
CLIENT_ORIGIN = https://<第 3 步的前端域名>
```

保存后到 **Deployments** 点最新一次部署右侧的 **⋯ → Redeploy**（改环境变量不会自动生效）。

> `server.js` 的 CORS 已经放行 `localhost` 和 `*.vercel.app`，所以前后端都在 Vercel 时
> 即使漏了这步也能通；`CLIENT_ORIGIN` 是给以后换自定义域名留的。

---

## 第 5 步：端到端验收

1. 打开前端首页，F12 → Network，`/api/projects` 返回 200 且带数据
2. `/login` 用 `cris@crisfu.dev` / `crisfu2026` 登录成功
3. `/projects` 新建一个项目 → 刷新仍在（POST 打到线上 API 了）
4. 退出后直访 `/admin` 被弹回登录页（受保护路由生效）
5. `/contact` 提交留言成功
6. `curl https://crisfu-api.vercel.app/api/health` 返回 200

---

## 第 6 步：常见问题

| 现象 | 原因与处理 |
|---|---|
| 部署后访问 404 | Root Directory 没设成 `server`；Vercel 找不到 `api/` 目录就不会建函数 |
| `/api/health` 返回 503 `Database unavailable` | `MONGODB_URI` 错。检查密码里的特殊字符是否 URL 编码、末尾是否带 `/crisfu` |
| 首次访问很慢（3~10s） | serverless 冷启动，正常。连续访问会快 |
| 前端列表为空 | `VITE_USE_MOCK` 还是 `true`，或 `VITE_API_URL` 少了 `/api` 后缀 |
| 改环境变量后没生效 | Vercel 不会自动重启，要手动 Redeploy |
| 前端刷新子路由 404 | `cris-react/vercel.json` 的 rewrite 没生效，确认 Root Directory 是 `cris-react` |
| 登录后立刻掉线 | `JWT_SECRET` 变了，重新登录 |

---

## 交付清单

- [x] 仓库 URL：`https://github.com/147258wsd-blip/crisfu-capstone`
- [ ] 前端 URL：`https://__________.vercel.app`
- [ ] 后端 URL：`https://__________.vercel.app`
- [ ] `StudentID_StudentName_CapstoneProject.zip`（剔除 `node_modules`、`dist`、`.env`）
- [ ] README 的 endpoint 列表与实际路由一致
