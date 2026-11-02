/* Adds the capstone write-up. The body is deliberately specific: every
   problem below actually happened during this build, which is the point —
   "it deployed fine" would be a shorter and less useful post.

   Run: node scripts/add-capstone-post.js
   Idempotent: upserts by title.
*/

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { connectDB, disconnectDB } = require("../config/db");
const User = require("../models/User");
const BlogPost = require("../models/BlogPost");

const POST = {
  title: "From design to a URL someone else can open",
  dateLabel: "2026.11.02",
  cat: "Engineering",
  read: 11,
  excerpt:
    "The capstone worked on my machine in week one and took three more weeks to become a link a stranger could open. Here is what actually broke: four hosting platforms, one rewritten response header, and a PATCH request that never reached my code.",
  tags: ["Deployment", "Express", "Serverless"],
  body: [
    {
      type: "p",
      text: "The brief was two pieces: a REST API with Node and Express over MongoDB Atlas, and a React single-page app that consumes it. The interesting part was never the CRUD. It was the gap between \"npm start works\" and \"open this URL on your phone\". That gap ate more time than the API did.",
    },
    { type: "h2", text: "What I designed first" },
    {
      type: "p",
      text: "Six collections: users, projects, skills, posts, comments, messages. Every write route sits behind a JWT, and every write route also checks ownership — the user id comes from the token, never from the request body, so a forged body field is simply ignored. The admin dashboard reads the same collections the public pages read, which means a bug shows up in two places instead of hiding in a panel nobody opens.",
    },
    {
      type: "p",
      text: "One decision paid for itself repeatedly: a single error handler. A malformed ObjectId returns 404 instead of a 500 with a Mongoose stack trace, and every error comes back as the same { success, message, errors } shape, so the client has exactly one branch to write.",
    },
    { type: "h2", text: "Platform one through four" },
    {
      type: "p",
      text: "Render wanted card verification I could not complete. Railway had suspended new sign-ups after a breach. My Vercel account was restricted with no appeal path. A container host did start the app — the logs were clean — but only served 404s from its edge, and its free URL expired after sixty minutes.",
    },
    {
      type: "p",
      text: "I stopped optimising for \"which platform is best\" and started optimising for \"which platform will still answer on the day I have to demo this\". That turned out to be Alibaba Cloud Function Compute for the API plus GitHub Pages for the static build. Not the fashionable answer, but it produced two URLs that a teacher can open without installing anything.",
    },
    { type: "h2", text: "Bug one: the gateway rewrites your headers" },
    {
      type: "p",
      text: "On the function host's default domain, every response is served with Content-Disposition: attachment. Not my code — the gateway adds it after my handler returns. Browser navigation therefore downloads a JSON file instead of rendering it, which looks exactly like a broken deployment to anyone evaluating the link.",
    },
    {
      type: "p",
      text: "fetch() and XHR ignore that header, so the app was never actually broken. But \"it works if you use the right tool\" is a bad answer for a graded submission. I moved the front end to GitHub Pages — a different origin, so nothing inherits the header — and left the API where it was. The fix was architectural, not a one-line patch.",
    },
    { type: "h2", text: "Bug two: PATCH never reached Express" },
    {
      type: "p",
      text: "The admin inbox has a \"mark as read\" button. It returned 403 in production and 200 locally. The request was not being rejected by my auth middleware — it was rejected by the HTTP trigger, before Express saw it. The platform's gateway does not allow the PATCH method at all.",
    },
    {
      type: "p",
      text: "The fix is two lines: mount the same handler on PUT, and make the client send PUT. I kept PATCH registered as well, so the API stays honest about REST semantics while the deployed path uses a verb the gateway accepts. I wrote the reason into the README, because a future reader will otherwise \"clean up\" the duplicate route.",
    },
    { type: "h2", text: "Bug three: a whitespace character in an environment variable" },
    {
      type: "p",
      text: "Logging in with the correct password returned 500 while a wrong password returned 401. That asymmetry narrowed it to jwt.sign — the code had already found the user. The error was: \"expiresIn\" should be a number of seconds. The value was 7d. It looked like 7d.",
    },
    {
      type: "p",
      text: "It was not. A zero-width character had come along when the value was pasted into the console. Deleting the variable and letting the code fall back to its default fixed it. Lesson: when a config value fails validation while looking correct, suspect the bytes, not the logic. I now print the JSON-stringified value, not the value.",
    },
    {
      type: "p",
      text: "A related one: environment variables on this platform are injected when an instance starts. Saving them in the console does nothing until you redeploy the code. The health endpoint returns uptime, so \"did the restart actually happen\" has an objective answer — uptime goes back to zero or it does not.",
    },
    { type: "h2", text: "Bug four: deep links and a sub-path" },
    {
      type: "p",
      text: "A static host has no idea that /projects/6ae6d5 is a route. Without a fallback it returns 404 and the reader sees nothing. Copying the built index.html to 404.html fixes it in one line. Then a second, quieter problem: the site is served from /crisfu-capstone/, not from the domain root, so every absolute asset path and the router basename have to agree. Vite's base option handles the assets; the router needs the same value passed as basename. Miss either one and the page loads with a blank screen and a 404 for its own JavaScript.",
    },
    { type: "h2", text: "How I know it works now" },
    {
      type: "p",
      text: "Three layers, because \"it looked fine\" is not evidence. 68 assertions against the API covering auth, ownership (a second account gets 403 on someone else's project), validation, and 404 on malformed ids. A headless-browser pass that drives the real site against the real API: sign in, create a project, confirm it is in the database, delete it, confirm it is gone, post a comment, submit the contact form, watch the inbox counter move. And a manual pass from a second device, on a different network, because that is the only way to catch the things localhost hides.",
    },
    {
      type: "p",
      text: "The honest summary: the application code was the easy part. What made it a finished project was treating the deployment path as part of the design — assuming the gateway will rewrite a header, that a verb might be blocked, that a config value might carry an invisible character, and that a 404 page is a routing feature rather than an error.",
    },
    { type: "h2", text: "What I would do differently" },
    {
      type: "p",
      text: "Choose the hosting target before writing the auth layer, not after. I rebuilt the entry point three times — Express listener, then serverless handler, then a second serverless dialect — because each platform wanted a different shape. The adapter is thin, but writing it three times is a week I could have spent on the client.",
    },
    {
      type: "p",
      text: "And set the environment variables on day one. Two of the four bugs above were configuration, not code, and both cost an evening.",
    },
  ],
};

async function run() {
  await connectDB();
  console.log("[post] target:", path.basename(process.env.MONGODB_URI || "?"));

  const owner = await User.findOne({ email: process.env.SEED_EMAIL || "cris@crisfu.dev" });
  if (!owner) throw new Error("seed user not found — run npm run seed first");

  const packed = JSON.stringify({
    body: POST.body,
    excerpt: POST.excerpt,
    cat: POST.cat,
    tags: POST.tags,
    read: POST.read,
    status: "live",
  });

  const existing = await BlogPost.findOne({ title: POST.title });
  if (existing) {
    await BlogPost.updateOne(
      { _id: existing._id },
      { $set: { content: packed, author: owner._id } }
    );
    console.log("[post] updated:", POST.title);
  } else {
    await BlogPost.create({
      title: POST.title,
      content: packed,
      author: owner._id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("[post] created:", POST.title);
  }

  /* keep the seed file in step so a fresh database reproduces the blog */
  const seedPath = path.join(__dirname, "..", "data", "seed.json");
  const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
  const entry = {
    id: POST.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    title: POST.title,
    date: POST.dateLabel,
    dateLabel: POST.dateLabel,
    cat: POST.cat,
    read: POST.read,
    excerpt: POST.excerpt,
    tags: POST.tags,
    body: POST.body,
  };
  const others = seed.posts.filter((p) => p.title !== POST.title);
  seed.posts = [entry, ...others];
  fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2) + "\n");
  console.log("[post] seed.json now lists", seed.posts.length, "posts");

  const total = await BlogPost.countDocuments();
  console.log("[post] blog now has", total, "posts");
  await disconnectDB();
}

run().catch(async (err) => {
  console.error("[post] failed:", err.message);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
