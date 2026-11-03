# Opening a Chinese cloud account

Recording of a path that was **evaluated but not used**. The submitted deployment needs only
GitHub and Alibaba Cloud (see [DEPLOY.md](DEPLOY.md)); this document exists because renting a
server in a mainland region requires real-name verification, and that step is unfamiliar if
you have not done it before. Read it only if you take the VPS route
([DEPLOY-VPS.md](DEPLOY-VPS.md)).

About 15 minutes, most of it waiting for identity verification.

---

## 0. Have these ready

- A phone number (for the SMS code)
- A national ID card (number + face recognition)
- WeChat or Alipay (to pay)
- A 学信网 (CHSI) student account — only if you want the student discount

---

## 1. Register

1. Open <https://cloud.tencent.com>
2. **Register** (top right), or **Log in** → "立即注册" under the login box
3. **WeChat QR registration** is quickest — confirm on your phone, no password to remember
   - Phone registration also works, via SMS code
4. You are signed in automatically once registered

> A Tencent Cloud account is separate from your QQ / WeChat account. Scanning the QR code is
> only the *registration* method; afterwards you log in by scanning the same code again.

---

## 2. Real-name verification (mandatory)

Mainland servers require it; an unverified account is blocked at checkout.

1. Hover your avatar (top right) → **实名认证**
   (or go to <https://console.cloud.tencent.com/developer> — the entry is at the top)
2. Type: **个人认证** (individual)
3. Fill in real name + ID number
4. Method: **微信扫码人脸识别** (WeChat face scan — quickest: scan, blink)
   - Alternative: verify by binding a bank card in your own name
5. Approved in **1–10 minutes**; the page then shows 已实名 (verified)

---

## 3. Student verification (optional, roughly halves the price)

- Entry: <https://cloud.tencent.com/act/campus>, or search 腾讯云校园计划
- Needs a 学信网 enrolment verification code generated on that site
- After approval, a 2 vCPU / 2 GB Lighthouse instance can drop to about **¥25.92 for three
  months**

Skipping it is fine — the new-user first order is about ¥68 for a year.

---

## 4. Buy the server

1. Search **轻量应用服务器** → product page → **立即购买 / 新建**
2. Match each row:

   | Field | Choose | Note |
   |---|---|---|
   | Region | Guangzhou / Shanghai / Beijing | nearest to you, lowest latency |
   | Image type | **系统镜像** (system image) | ⚠️ do not pick an 应用镜像 (WordPress / Docker / Node.js template) |
   | OS | **Ubuntu Server 22.04 LTS 64bit** | the setup script is written for it |
   | Plan | **2 vCPU / 2 GB** (3 Mbps is plenty) | enough for the site plus the API |
   | Duration | 1 year | monthly is more expensive |
   | Login | **password** | choose a strong one |

3. Password rules: 8+ characters, upper and lower case plus digits. **Save it immediately** —
   you need it for SSH.
4. Accept the terms → **Buy now** → pay with WeChat or Alipay.

> Why not an application image: those templates pre-install WordPress, aaPanel and similar,
> which occupy port 80 and a pile of services that fight with nginx. Clean Ubuntu is far less
> work.

---

## 5. Get the connection details

1. <https://console.cloud.tencent.com/lighthouse> (Lighthouse console)
2. Find the new instance in the list; note its **public IP** (`43.xxx.xxx.xxx`)
3. Open the instance:
   - **Firewall** tab: confirm rules for **80** and **22** (both exist by default)
   - Forgot the password: instance page → **重置密码** → set a new one → **restart** to apply

---

## 6. Test the connection

Open **PowerShell** on your own machine:

```bash
ssh root@<public-ip>
```

- First time it asks `Are you sure you want to continue connecting (yes/no)?` → type **yes**
- At `password:` → **nothing appears on screen as you type, which is normal** — type it and
  press Enter
- A prompt like `root@VM-0-xx-ubuntu:~#` means it worked

If SSH fails, use the browser terminal instead: instance page → **登录** (top right) opens a
WebShell that works the same way with no SSH setup.

---

## Common mistakes

| Mistake | Consequence | Avoid by |
|---|---|---|
| Ordering before verifying identity | checkout blocks, you cannot buy | do step 2 first |
| Choosing an application image | port 80 taken, nginx will not start | choose 系统镜像 → Ubuntu 22.04 |
| Not saving the password | password reset + restart, +5 minutes | save it in your phone's notes immediately |
| Firewall not allowing 80 | browser fails while `ssh` works | add the rule in the console |
| Choosing an overseas region | slow, and needs extra configuration | pick Guangzhou / Shanghai / Beijing |
| Using the Node.js application image | may ship Node 16 | harmless — the script upgrades to 20 |
