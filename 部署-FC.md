# 免费部署：阿里云函数计算（FC 3.0）

国际平台这轮全躺了（Render 卡验证、Railway 关注册、Zeabur 关停、Vercel 限号、Back4App 免费版链接 60 分钟过期），
国内能不要信用卡、不睡觉、链接永久的，只剩函数计算。

**代价说清楚**：要实名认证；免费额度是"新用户试用 + 每月额度"，不是永久无限免费——
但按这套 API 的用量折算，正常使用一个月在 0~1 元级别。

一条函数同时跑前端和 API，只需一个域名，不存在跨域问题。

---

## 1. 打包（本地，一条命令）

```powershell
cd C:\Users\Lenovo\WorkBuddy\2026-10-30-09-34-47\server
npm run pack:fc
```

它会做四件事：用 `VITE_API_URL=/api` 重新构建前端 → 复制 API 代码和生产依赖 → 把 `dist` 放进 `public/`
→ 打成 `fc-api.zip`（约 3.8 MB）。

产物在仓库根目录：`C:\Users\Lenovo\WorkBuddy\2026-10-30-09-34-47\fc-api.zip`

> 代码改了以后重新跑这一条命令，重新上传即可。

---

## 2. 开通函数计算

<https://www.aliyun.com> → 搜索 **函数计算 FC** → **立即开通**（免费开通，首次会要求实名认证）。

---

## 3. 创建函数

控制台 → **函数计算** → 左侧 **函数** → **创建函数** → 选 **从头开始**，逐项对照：

| 配置项 | 填什么 |
|---|---|
| 创建方式 | 从头开始 |
| 函数名称 | `crisfu-api` |
| 运行环境 | **Node.js 20**（内置运行时，不要选自定义运行时） |
| 函数类型 | **事件函数**（处理 HTTP 请求） |
| 代码上传方式 | **通过 ZIP 包上传代码** → 选 `fc-api.zip` |
| 处理器（Handler） | **`api/fc.handler`**（注意前面的 `api/`，handler 文件在 `api/` 目录里） |
| 内存规格 | **512 MB** |
| 执行超时时间 | **30 秒** |
| 实例并发度 | 1（默认） |

环境变量（在「高级配置 / 环境变量」里加四条）：

```
MONGODB_URI     = 从 server/.env 整行复制，末尾的 /crisfu 不能丢
JWT_SECRET      = GfKkmFsOUqiaQlCCoIsSyezL5uGBw1EXQ7H-OsszJqJlgnI9HoyxkFcC03MTz2cd
JWT_EXPIRES_IN  = 7d
NODE_ENV        = production
```

**不要加 `PORT`**（FC 由平台转发，函数不需要监听端口），**不要加 `DNS_SERVERS`**（那是 Windows 本地专用的，
Linux 上设了反而可能解析失败）。

---

## 4. 加 HTTP 触发器（关键一步）

函数创建好后 → 进入函数 → **配置** → **触发器** → **创建触发器**：

| 配置项 | 填什么 |
|---|---|
| 触发器类型 | **HTTP 触发器** |
| 请求方法 | 全选（GET/POST/PUT/DELETE/HEAD/OPTIONS） |
| 认证方式 | **无需认证**（⚠️ 不要选签名认证，否则浏览器直接 403） |

保存后会给你一个公网地址：

```
https://<触发器ID>.<地域>.fcapp.run
```

**这个地址就是你的两个交付 URL**：网站是它本身，API 是它加 `/api`。

---

## 5. 验证（三条命令）

```bash
curl https://<你的地址>/api/health      # {"success":true,"status":"ok",...}
curl https://<你的地址>/api/projects    # success true, count 6
curl -I https://<你的地址>/portfolio    # 200 + text/html（SPA 路由不 404）
```

再打开浏览器访问根地址，看到首页、进 Portfolio 能看到 6 个项目，就是真在调线上 API。

---

## 6. 故障对照表

| 现象 | 原因 |
|---|---|
| 整个域名 404 / 403 | 认证方式选了「签名认证」，改成**无需认证** |
| 首页能开，接口 503 | `MONGODB_URI` 少了 `/crisfu`，或 Atlas 白名单不是 `0.0.0.0/0` |
| 打开域名返回纯文本 `Internal Server Error`（HTTP 502，50ms 内返回） | Handler 写成了 `index.handler` 或 `fc.handler`。压缩包里 handler 位于 `api/fc.js`，必须填 **`api/fc.handler`**。改完保存 5~10 秒生效，不用重新上传 |
| 报 `Cannot find module 'api/fc'` | 上传的 zip 不是最新版，重新 `npm run pack:fc` 再上传 |
| 前 30 秒超时 | 冷启动连 Atlas 慢，把执行超时加到 30 秒；仍超时就查白名单 |
| 页面白屏 | zip 是旧的，重新 `npm run pack:fc` 再上传 |
| 第一次访问慢 1~3 秒 | 正常的冷启动，之后快；演示前自己先点一遍预热 |

---

## 7. 这套代码是怎么跑起来的

FC 3.0 的内置运行时不给你 `http.Server`，它把请求变成一个 `event` JSON，函数返回
`{statusCode, headers, body}`。仓库里为此加了两层：

- `server/api/fc.js` — 事件适配：非 `/api` 的 GET 直接从 `public/` 读文件（带长缓存和 SPA 回退），
  其余请求重建成 Node 的 req/res 后交给 **和 Vercel 共用的** `server/api/_app.js`，
  所以路由、鉴权、错误形状跟本地开发完全一致。
- `server/api/_fc-response.js` — Express 在中间件里会执行 `Object.setPrototypeOf(res, app.response)`，
  原型上的方法会被整个换掉，所以响应对象的方法全部挂在实例自身上。

本地验证：`npm run test:fc` 会构造真实的 FC event 跑 13 条断言（静态文件、SPA 回退、
二进制 base64、路径穿越防护、登录成功/失败、401、404、OPTIONS 预检）。
