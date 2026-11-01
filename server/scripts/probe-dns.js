/* Node's c-ares resolver can be refused by the local DNS on Windows
   while nslookup works fine. Try a few resolvers and report which one
   can actually answer the SRV query. */
const dns = require("dns");
const HOST = "_mongodb._tcp.blogplatformcluster.pb3ljzk.mongodb.net";

const candidates = [null, "202.96.64.68", "114.114.114.114", "8.8.8.8", "1.1.1.1"];

(async () => {
  for (const server of candidates) {
    if (server) dns.setServers([server]);
    const label = server || "(系统默认)";
    try {
      const res = await dns.promises.resolveSrv(HOST);
      console.log("PASS  " + label + " -> " + res.length + " 条记录，例如 " + res[0].name);
    } catch (err) {
      console.log("FAIL  " + label + " -> " + err.code + " " + err.message.slice(0, 60));
    }
  }
})();
