const dns = require("dns");
const mongoose = require("mongoose");

/* Windows 上 Node 的 c-ares 解析器有时会被本地 DNS 拒绝 SRV 查询
   （nslookup 却正常）。允许通过 DNS_SERVERS 指定解析服务器；
   Render 等 Linux 环境不设这个变量，走系统默认。 */
if (process.env.DNS_SERVERS) {
  const servers = process.env.DNS_SERVERS.split(",").map((s) => s.trim()).filter(Boolean);
  if (servers.length) dns.setServers(servers);
}

/**
 * 连接 MongoDB Atlas。失败时抛出，由调用方决定是否退出进程。
 */
async function connectDB(uri = process.env.MONGODB_URI) {
  if (!uri) throw new Error("MONGODB_URI is not defined");

  mongoose.set("strictQuery", true);

  mongoose.connection.on("connected", () => {
    console.log(`[db] connected to ${mongoose.connection.name} @ ${mongoose.connection.host}`);
  });
  mongoose.connection.on("error", (err) => {
    console.error("[db] connection error:", err.message);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("[db] disconnected");
  });

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 12000,
  });

  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
