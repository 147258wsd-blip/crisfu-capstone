const dns = require("dns");
const mongoose = require("mongoose");

/* On Windows, Node's c-ares resolver sometimes refuses SRV lookups
   (while nslookup works). DNS_SERVERS lets you name the resolvers;
   Linux hosts leave it unset and use the system default. */
if (process.env.DNS_SERVERS) {
  const servers = process.env.DNS_SERVERS.split(",").map((s) => s.trim()).filter(Boolean);
  if (servers.length) dns.setServers(servers);
}

/**
 * Connects to MongoDB Atlas. Throws on failure; the caller decides whether to exit.
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
