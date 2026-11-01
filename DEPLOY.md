# 部署手册（Railway + Vercel）

Render 注册被卡在信用卡/手机验证，不再走它。本手册用 **Railway 跑后端 API + Vercel 跑前端**，
两个平台都不需要信用卡。

- 后端：`server/` — Express + Mongoose，仓库里已有 `Dockerfile`，平台不用猜构建命令
- 前端：`cris-react/` — Vite + React，`vercel.json` 已配好 SPA 重写

---

## 第 0 步：检查前置

| 需要什么 | 说明 |
|---|---|
| GitHub 账号 | 已有 |
| MongoDB Atlas 连接串 | `server/.env` 里的 `MONGODB_URI`，**必须带 `/crisfu` 库名** |
| Atlas 网络访问 | Network Access 里保留 `0.0.0.0/0`，云平台出口 IP 不固定 |

---

## 第 1 步：把代码推到 GitHub ✅ 已完成

仓库已上线：<https://github.com/147258wsd-blip/crisfu-capstone>（Public，`main` 分支）。
后续改动只需：

```bash
cd /c/Users/Lenovo/WorkBuddy/2026-10-30-09-34-47
git add -A && git commit -m "说明改了什么" && git push
```

Railway 和 Vercel 都会监听 `main`，推上去即自动重新部署。

---

## 第 2 步：Railway 部署后端

1. 打开 <https://railway.com> → **Login** → 选 **Continue with GitHub**（用 GitHub 登录，不要填邮箱注册，
   这条路径不会索要信用卡）
2. **New Project** → **Deploy from GitHub repo** → 第一次会要求安装 GitHub App，
   选 **Only select repositories** → 勾选 `crisfu-capstone` → Install
3. 项目创建后，点进那个服务 → **Settings**：
   - **Root Directory** 填 `server` ← 这一步不能漏，否则 Railway 会在仓库根目录找 `package.json`
   - **Build** 保持 `Dockerfile`（仓库里的 `railway.toml` 已经指定）
4. 切到 **Variables**，逐条添加：

   ```
   MONGODB_URI   = mongodb+srv://...@....mongodb.net/crisfu?retryWrites=true&w=majority
   JWT_SECRET    = <换成一串新的长随机字符串，不要用本地那个>
   JWT_EXPIRES_IN= 7d
   NODE_ENV      = production
   ```

   `CLIENT_ORIGIN` 先留空，等第 3 步拿到前端域名再回来填。**不要**加 `DNS_SERVERS`，
   那是 Windows 本地才需要的。

5. 切到 **Settings → Networking → Public Networking**，点 **Generate Domain**，
   得到形如 `crisfu-capstone-production.up.railway.app` 的域名
6. 验证：

   ```bash
   curl https://<你的域名>/api/health
   # {"success":true,"status":"ok","uptime":12,...}
   curl https://<你的域名>/api
   # 端点清单
   ```

   刚部署完第一次访问可能要等 20~60 秒（构建 + 冷启动）。

> Railway 新账号送 $5（30 天），之后每月 $1 滚动额度。这套 API 空闲时占用很低，
> 用来交 Capstone 演示完全够。额度耗尽服务会暂停，重新部署或升到 Hobby（$5/月）即可恢复。

---

## 第 3 步：Vercel 部署前端

1. 打开 <https://vercel.com> → **Continue with GitHub**
2. **Add New → Project** → 选中 `crisfu-capstone` → **Import**
3. 配置：
   - **Root Directory** 点 **Edit**，选 `cris-react` ← 不能漏
   - **Framework Preset** 会自动识别成 Vite
   - **Build Command** `npm run build`，**Output Directory** `dist`（默认即可）
4. 展开 **Environment Variables**，加两条：

   ```
   VITE_USE_MOCK = false
   VITE_API_URL  = https://<第 2 步的 Railway 域名>/api
   ```

   `VITE_USE_MOCK=false` 是关键：默认值是 `true`，会走本地假数据，评分时看不到真实接口调用。

5. **Deploy**，拿到 `https://<项目名>.vercel.app`
6. 回到 Railway → Variables → 填 `CLIENT_ORIGIN` = `https://<项目名>.vercel.app`，保存后服务会自动重新部署

---

## 第 4 步：端到端验收

按顺序确认，任何一步失败先看第 5 节：

1. `https://<vercel 域名>` 打开首页，控制台没有红色报错
2. 首页项目卡片来自 Atlas（不是假数据）——用 F12 → Network 看 `/api/projects` 返回 200
3. `/login` 用 `cris@crisfu.dev` / `crisfu2026` 登录 → 跳转成功，LocalStorage 里有 `cf_token`
4. `/projects` 新建一个项目 → 刷新页面仍在（说明 POST 打到了线上 API）
5. 退出登录 → 直接访问 `/projects/new` 被弹回登录页（受保护路由生效）
6. `/contact` 提交一条留言 → 说明 `POST /api/contact` 通
7. `curl https://<railway 域名>/api/health` 返回 200

---

## 第 5 步：常见问题

| 现象 | 原因与处理 |
|---|---|
| Railway 构建报 `npm ERR! enoent package.json` | Root Directory 没设成 `server` |
| 部署成功但 `/api/health` 502 | 容器启动时连不上 Atlas。看 Deploy Logs 里是否有 `MongoServerError` / `ECONNREFUSED`；九成是 `MONGODB_URI` 少了库名或密码有特殊字符没转义 |
| 前端页面能开但所有列表为空 | `VITE_USE_MOCK` 还是 `true`，或者 `VITE_API_URL` 少了 `/api` 后缀 |
| 前端报 CORS 错误 | Railway 的 `CLIENT_ORIGIN` 和实际 Vercel 域名不一致（注意 `https://`、结尾不能带 `/`）；改完等自动重新部署完成 |
| Vercel 刷新子路由 404 | `vercel.json` 的 rewrite 没生效。确认 Root Directory 是 `cris-react`，文件在它下面 |
| 登录后立刻掉线 | `JWT_SECRET` 在两次部署之间变了，重新登录即可 |

---

## 交付清单

- [ ] 前端 URL：`https://__________.vercel.app`
- [ ] 后端 URL：`https://__________.up.railway.app`
- [x] 仓库 URL：`https://github.com/147258wsd-blip/crisfu-capstone`
- [ ] `StudentID_StudentName_CapstoneProject.zip`（剔除 `node_modules`、`dist`、`.env`）
- [ ] README 里 endpoint 列表与实际路由一致
