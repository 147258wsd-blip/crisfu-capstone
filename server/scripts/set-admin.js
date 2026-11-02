/* Promote or demote an account, or list who can write.
   Usage:
     node scripts/set-admin.js --list
     node scripts/set-admin.js cris@crisfu.dev            (promote)
     node scripts/set-admin.js --demote someone@x.dev     (back to member)

   Registration only hands out `admin` to addresses listed in ADMIN_EMAILS.
   This script is the other way in — for the owner account that already
   exists, and for turning a mistake back into a plain member. */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { connectDB, disconnectDB } = require("../config/db");
const User = require("../models/User");

async function run() {
  const args = process.argv.slice(2);
  const list = args.includes("--list");
  const demote = args.includes("--demote");
  const email = args.find((a) => !a.startsWith("--"));

  await connectDB();

  if (list || !email) {
    const users = await User.find().select("username email role").sort({ createdAt: 1 });
    console.log(`\n${users.length} account(s):`);
    for (const u of users) {
      console.log(`  ${u.role === "admin" ? "[admin ]" : "[member]"} ${u.email}  (${u.username})`);
    }
    await disconnectDB();
    return;
  }

  const role = demote ? "member" : "admin";
  const res = await User.updateOne({ email: String(email).toLowerCase() }, { $set: { role } });
  if (res.matchedCount === 0) console.log(`no account with email ${email}`);
  else console.log(`${email} -> ${role}`);

  await disconnectDB();
}

run().catch(async (err) => {
  console.error(err.message);
  try {
    await disconnectDB();
  } catch (e) {
    /* already closed */
  }
  process.exit(1);
});
