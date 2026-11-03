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
  console.log("using custom DNS:", servers.join(", "));
}

const URI = process.env.MONGODB_URI;

(async () => {
  if (!URI) {
    console.error("FAIL  no MONGODB_URI in .env");
    process.exit(1);
  }

  console.log("connecting to Atlas ...");
  const t0 = Date.now();

  try {
    await mongoose.connect(URI, { serverSelectionTimeoutMS: 12000 });
  } catch (err) {
    console.error("FAIL  connection failed:", err.message);
    if (/bad auth/i.test(err.message)) console.error("  -> wrong username or password");
    if (/ENOTFOUND|ETIMEDOUT|Could not connect/i.test(err.message))
      console.error("  -> network unreachable, or the IP allow-list is not 0.0.0.0/0");
    process.exit(1);
  }

  const ms = Date.now() - t0;
  const conn = mongoose.connection;

  console.log("PASS  connected in " + ms + "ms");
  console.log("      database:", conn.name);
  console.log("      host    :", conn.host);

  const pingStart = Date.now();
  await conn.db.admin().ping();
  console.log("PASS  ping ok, " + (Date.now() - pingStart) + "ms");

  // round-trip write/read/delete
  const probe = conn.db.collection("__probe");
  await probe.insertOne({ at: new Date(), note: "connectivity check" });
  const found = await probe.findOne({ note: "connectivity check" });
  await probe.deleteOne({ _id: found._id });
  console.log("PASS  write / read / delete all work");

  const collections = await conn.db.listCollections().toArray();
  console.log("      collections:", collections.length ? collections.map((c) => c.name).join(", ") : "(empty, nothing imported yet)");

  await mongoose.disconnect();
  console.log("DONE  connection string works — safe to build the models");
})();
