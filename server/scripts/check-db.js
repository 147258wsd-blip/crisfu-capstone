/* Real connectivity check against Atlas: connect, ping, report server info,
   then write + read one document so we know the database is writable. */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const dns = require("dns");
const mongoose = require("mongoose");

/* On this machine Node's resolver is refused for SRV queries while the
   system resolver works, so allow an explicit list via .env. On Linux
   (Railway / any Linux container) this stays unset and the default
   resolver is used. */
if (process.env.DNS_SERVERS) {
  const servers = process.env.DNS_SERVERS.split(",").map((s) => s.trim()).filter(Boolean);
  dns.setServers(servers);
  console.log("使用自定义 DNS:", servers.join(", "));
}

const URI = process.env.MONGODB_URI;

(async () => {
  if (!URI) {
    console.error("FAIL  .env 里没有 MONGODB_URI");
    process.exit(1);
  }

  console.log("正在连接 Atlas ...");
  const t0 = Date.now();

  try {
    await mongoose.connect(URI, { serverSelectionTimeoutMS: 12000 });
  } catch (err) {
    console.error("FAIL  连接失败:", err.message);
    if (/bad auth/i.test(err.message)) console.error("  -> 用户名或密码不对");
    if (/ENOTFOUND|ETIMEDOUT|Could not connect/i.test(err.message))
      console.error("  -> 网络不通，或 IP 白名单没有 0.0.0.0/0");
    process.exit(1);
  }

  const ms = Date.now() - t0;
  const conn = mongoose.connection;

  console.log("PASS  已连接，耗时 " + ms + "ms");
  console.log("      数据库:", conn.name);
  console.log("      主机  :", conn.host);

  const pingStart = Date.now();
  await conn.db.admin().ping();
  console.log("PASS  ping 成功，" + (Date.now() - pingStart) + "ms");

  // round-trip write/read/delete
  const probe = conn.db.collection("__probe");
  await probe.insertOne({ at: new Date(), note: "connectivity check" });
  const found = await probe.findOne({ note: "connectivity check" });
  await probe.deleteOne({ _id: found._id });
  console.log("PASS  写入 / 读取 / 删除 正常");

  const collections = await conn.db.listCollections().toArray();
  console.log("      当前集合:", collections.length ? collections.map((c) => c.name).join(", ") : "(空，等待导入)");

  await mongoose.disconnect();
  console.log("DONE  连接串可用，可以开始建模型了");
})();
