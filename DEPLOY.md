# 部署手册（腾讯云轻量应用服务器）

## 为什么不用那些 PaaS

| 平台 | 2026-11 现状 |
|---|---|
| Render | 注册触发风控，要信用卡/手机验证 |
| Railway | 10-21 安全事件后**新注册暂停**，官方无重开日期 |
| Zeabur | 10-14 入侵，320 万条环境变量泄露，**已宣布关停**（12-31 全部下线） |
| Northflank / Koyeb | 要卡验证；Northflank 10-30 也发生入侵 |
| Vercel | 中国大陆 IP 新账号易被风控，提示"账号被限制" |

能免费跑常驻 Node 的国际平台这一轮基本清空。改用一台国内 VPS：**前端和后端跑在同一台机器**，
nginx 托管静态站并把 `/api` 反代给 Express。不依赖任何平台政策，国内访问也最快。

```
用户 → http://<IP>/            nginx → /opt/crisfu/cris-react/dist  (静态站)
              /api/*           nginx → 127.0.0.1:5000 (pm2 守护的 Express)
                                          └→ MongoDB Atlas
```

两个交付 URL：

- 前端 `http://<IP>/`
- 后端 `http://<IP>/api`

同域，所以 CORS 天然不触发（`server.js` 的白名单仍保留，换域名时有用）。

---

## 第 1 步：买服务器

1. <https://cloud.tencent.com> 注册 → **个人实名认证**（身份证，几分钟出结果，不认证买不了境内机器）
2. 进 **轻量应用服务器** → 新建：
   - **镜像**：选 **Ubuntu Server 22.04 LTS 64bit**（纯净系统，别选 WordPress/Docker 那些应用模板）
   - **配置**：2核2G 足够（新用户首单 68 元/年上下；学生认证后更便宜，先做认证再下单）
   - **地域**：选离你近的（广州/上海/北京）
   - **登录方式**：选「密码」，自己设一个强密码并记下来
3. 创建完在控制台「防火墙」页确认 **80** 端口是放行的（默认就有 22/80/443）
4. 记下**公网 IP**

> 不需要买域名。IP 直接能访问，`http://1.2.3.4/` 就能交作业。要 HTTPS 才需要域名。

---

## 第 2 步：打包并上传代码

在**你自己的 Windows** 上打开 PowerShell，逐段执行：

```powershell
cd C:\Users\Lenovo\WorkBuddy\2026-10-30-09-34-47
git archive --format=tar.gz -o crisfu.tar.gz HEAD
```

把代码包和 `.env` 传上去（会提示输入服务器密码）：

```powershell
scp crisfu.tar.gz root@<服务器IP>:/root/
scp server\.env root@<服务器IP>:/root/crisfu.env
```

`.env` 里已经有 `MONGODB_URI` 和 `JWT_SECRET`，脚本会自动去掉 Windows 专用的 `DNS_SERVERS`。

---

## 第 3 步：登录服务器并一键部署

```powershell
ssh root@<服务器IP>
```

进去后粘贴这三行：

```bash
mkdir -p /opt/crisfu && tar -xzf /root/crisfu.tar.gz -C /opt/crisfu
sed -i 's/\r$//' /opt/crisfu/deploy/setup.sh
bash /opt/crisfu/deploy/setup.sh /root/crisfu.env
```

脚本会依次：装 nginx → 加 2G swap（2G 内存构建 Vite 时容易 OOM）→ 装 Node 20
（NodeSource 不可达就回退 npmmirror 二进制包）→ 装 pm2 → 装后端依赖 →
写入并清洗 `.env` → 启动 API → 构建前端（`VITE_USE_MOCK=false`，API 走同源 `/api`）→
配置 nginx → 跑一次健康检查。

全程约 3~6 分钟，最后会打印两个地址。看到这个就成功了：

```
============================================================
  后端  http://1.2.3.4/api
  {"success":true,"status":"ok","uptime":8,...}
  前端  http://1.2.3.4/          (HTTP 200)
============================================================
```

---

## 第 4 步：验收

1. 浏览器打开 `http://<IP>/`，首页项目卡片有数据
2. F12 → Network，`/api/projects` 返回 200
3. `/login` 用 `cris@crisfu.dev` / `crisfu2026` 登录
4. `/projects` 新建一个项目 → 刷新还在
5. 退出后直访 `/admin` 被弹回登录页
6. `/contact` 提交留言成功
7. `http://<IP>/api/health` 返回 200

---

## 第 5 步：日常维护

```bash
pm2 logs crisfu-api          # 后端日志
pm2 restart crisfu-api       # 改完 .env 后重启
systemctl reload nginx       # 改完 nginx 后重载
```

代码更新后（本地 `git push` 之后）：

```powershell
git archive --format=tar.gz -o crisfu.tar.gz HEAD
scp crisfu.tar.gz root@<IP>:/root/
```

```bash
cd /opt/crisfu && tar -xzf /root/crisfu.tar.gz -C /opt/crisfu --overwrite
bash /opt/crisfu/deploy/setup.sh /root/crisfu.env
```

脚本可重复运行，不会起第二个进程。

---

## 第 6 步：常见问题

| 现象 | 原因与处理 |
|---|---|
| 浏览器打不开，`ssh` 能连 | 腾讯云控制台「防火墙」没放行 80 |
| 页面 502 Bad Gateway | API 没起来：`pm2 logs crisfu-api --lines 40` 看是否 `MONGODB_URI` 报错 |
| `/api/health` 返回 500 | Atlas 连不上。检查 Atlas → Network Access 是否为 `0.0.0.0/0` |
| 前端白屏、控制台 404 | 前端没构建成功，重跑 `cd /opt/crisfu/cris-react && npm run build` |
| 刷新子路由 404 | nginx 的 `try_files ... /index.html` 被覆盖了，检查 `/etc/nginx/sites-available/crisfu` |
| 构建时 `Killed` | 内存不够，确认 swap 生效：`free -h` 看 Swap 是否有 2.0Gi |
| 列表是假数据 | `cris-react/.env.production` 里必须 `VITE_USE_MOCK=false`，改完重新 build |
| 中文注释在服务器上乱码 | 文件是 CRLF，`sed -i 's/\r$//'` 处理一下 |

---

## 备选：不想买服务器

腾讯云 **CloudBase**（云开发）也有免费体验版：静态网站托管放前端，云托管放后端容器。
代价是要关注公众号领兑换码、后端要走「构建镜像 → 推容器镜像服务 → 创建服务」三步，
而且本机没装 Docker。对一次性交作业来说，比买台 68 元的机器更绕，只在完全不想花钱时考虑。

---

## 交付清单

- [x] 仓库 URL：`https://github.com/147258wsd-blip/crisfu-capstone`
- [ ] 前端 URL：`http://__________/`
- [ ] 后端 URL：`http://__________/api`
- [ ] 登录账号：`cris@crisfu.dev` / `crisfu2026`
- [ ] `StudentID_StudentName_CapstoneProject.zip`（剔除 `node_modules`、`dist`、`.env`）
- [ ] README 的 endpoint 列表与实际路由一致
