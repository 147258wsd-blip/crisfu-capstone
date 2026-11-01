/* =========================================================
   Site data (mock layer)
   Shape mirrors what the Express API will return, so swapping
   api.js to the real endpoints does not touch any component.
   ========================================================= */

export const projects = [
  {
    id: "debate-simulator",
    title: "Debate Simulator",
    year: "2026",
    cat: "Experiment",
    blurb: "100 debate topics, three AI opponents and a five-axis scorer — all inside one dependency-free HTML file.",
    cover: 1,
    coverLabel: "Single-file app",
    imageUrl: "/shots/debate-full.png",
    tags: ["JavaScript", "Web Speech API", "localStorage"],
    role: "Solo — design, build, test",
    stack: ["Vanilla JS", "CSS", "Web Speech API"],
    timeline: "3 weeks",
    problem: "I wanted to practise arguing in English but every 'AI chat' tool felt like talking to a very polite wall — it agreed with whatever I said. I needed something that pushed back, immediately, with no server and no signup.",
    built: [
      "A 100-topic library, each with pro/con keyword groups and four sample arguments so the bot never runs out of things to say.",
      "A five-axis scorer: logic, relevance, length, rebuttal, examples. Pure slogans score zero, bad advice scores negative.",
      "The bot quotes the exact words you just used before disagreeing — no invented claims about your position.",
      "Speech input via Web Speech API, with a clear fallback message when the browser does not support it."
    ],
    learned: "Shipping everything in one file forced me to be honest about what actually earns points. Half of the scoring rules came from reading my own bad arguments back.",
    demo: "debate.html",
    source: "#"
  },
  {
    id: "portfolio-blog",
    title: "Portfolio & Blog",
    year: "2026",
    cat: "Full-stack",
    blurb: "React, Express and MongoDB with JWT auth, an admin dashboard and a comment system. Front and back deployed separately.",
    cover: 2,
    coverLabel: "Full-stack",
    imageUrl: "/shots/portfolio-full.png",
    tags: ["React", "Express", "MongoDB", "JWT"],
    role: "Solo — full stack",
    stack: ["React", "React Router", "Express", "Mongoose", "JWT"],
    timeline: "4 weeks",
    problem: "I had projects scattered across GitHub and notes scattered across Notion. I wanted one place where a recruiter could read a paragraph about me, click into a project, and see that I can finish things.",
    built: [
      "Six REST resource groups (users, projects, posts, comments, messages, matches) behind a single error handler.",
      "JWT auth with a protect middleware and author-only checks on every write route.",
      "An admin area with full CRUD for projects and posts, optimistic UI and a confirm step on delete.",
      "A public debate page that works logged-out and saves match history when logged in."
    ],
    learned: "Auth is not a feature you add at the end. The first version had every route open, and retrofitting ownership checks touched almost every controller.",
    demo: "index.html",
    source: "#"
  },
  {
    id: "campus-marketplace",
    title: "Campus Marketplace",
    year: "2025",
    cat: "Full-stack",
    blurb: "A small marketplace for students: post, search, message, browse by faculty, with images going straight to cloud storage.",
    cover: 3,
    coverLabel: "Campus",
    imageUrl: "/shots/campus.svg",
    tags: ["Node.js", "Mongoose", "Cloudinary"],
    role: "Backend + half the UI",
    stack: ["Node.js", "Express", "MongoDB", "Cloudinary"],
    timeline: "6 weeks, team of 3",
    problem: "Second-hand trading at my school happened in WeChat groups: unsearchable, reposted hourly, and impossible to browse by anything except scrolling.",
    built: [
      "Listing model with faculty, condition and price, plus compound indexes for the search endpoint.",
      "Direct-to-Cloudinary upload using a signed request, so the API never proxies image bytes.",
      "In-app messaging with a simple unread counter instead of exposing phone numbers.",
      "Moderation queue: reported listings are hidden until a moderator approves them."
    ],
    learned: "Search quality is mostly schema design. Once faculty and condition were indexed properly, the 'search is slow' complaints disappeared without touching the query.",
    demo: "#",
    source: "#"
  },
  {
    id: "course-scheduler",
    title: "Course Scheduler",
    year: "2025",
    cat: "Frontend",
    blurb: "Drag-and-drop weekly timetable that detects time clashes before you commit to them.",
    cover: 4,
    coverLabel: "Frontend",
    imageUrl: "/shots/scheduler.svg",
    tags: ["React", "TypeScript", "dnd-kit"],
    role: "Solo — frontend",
    stack: ["React", "TypeScript", "dnd-kit"],
    timeline: "2 weeks",
    problem: "Course registration gives you a list of sections, not a week. I kept signing up for things that overlapped and finding out two days later.",
    built: [
      "A 5×10 grid with drag-and-drop sections and keyboard fallback for accessibility.",
      "Conflict detection that highlights the exact overlapping pair instead of a generic error.",
      "Local persistence plus export to a calendar file.",
      "A condensed mobile view: one day per column, sections stacked."
    ],
    learned: "Drag and drop is 20% dragging and 80% edge cases — dropping outside the grid, dropping onto yourself, and undoing a drop nobody asked for.",
    demo: "#",
    source: "#"
  },
  {
    id: "screen-time-dashboard",
    title: "Screen Time Dashboard",
    year: "2025",
    cat: "Frontend",
    blurb: "A year of my own app usage turned into a readable dashboard — because the built-in one told me nothing.",
    cover: 5,
    coverLabel: "Data viz",
    imageUrl: "/shots/screentime.svg",
    tags: ["React", "D3", "CSV"],
    role: "Solo",
    stack: ["React", "D3", "PapaParse"],
    timeline: "10 days",
    problem: "The system screen-time report shows one number per day. I wanted to know which apps were eating the time, and whether the pattern changed on weekends.",
    built: [
      "CSV ingestion with a column mapper, so a different export does not break the chart.",
      "Stacked area chart by app category, with a weekend/weekday split.",
      "Brushable timeline that filters every other chart on the page.",
      "An honest note about missing days instead of interpolating them."
    ],
    learned: "Most of the work was cleaning, not charting. And showing a gap is more truthful than a smooth line that never happened.",
    demo: "#",
    source: "#"
  },
  {
    id: "habit-cli",
    title: "Habit CLI",
    year: "2024",
    cat: "Experiment",
    blurb: "A terminal habit tracker that stores everything in one readable JSON file you can edit by hand.",
    cover: 6,
    coverLabel: "CLI",
    imageUrl: "/shots/habit.svg",
    tags: ["Node.js", "CLI", "JSON"],
    role: "Solo",
    stack: ["Node.js", "Commander", "Chalk"],
    timeline: "weekend",
    problem: "Every habit app wants an account. I wanted something that works over SSH on the school server and survives a sync conflict.",
    built: [
      "Four commands: add, check, streak, export. No config file required.",
      "Streak calculation that understands 'skip days' so a planned rest does not break a run.",
      "Atomic writes to a plain JSON file — safe to edit while the tool is not running.",
      "Human-readable diff on every write, so you can see what changed."
    ],
    learned: "A CLI is a UI too. The help text took longer than the storage layer, and it is what people actually judge the tool by.",
    demo: "#",
    source: "#"
  }
];

export const posts = [
  {
    id: "single-html-file",
    title: "Why I shipped an entire web app inside one HTML file",
    date: "2026-10-28",
    dateLabel: "2026.10.28",
    cat: "Engineering",
    read: 8,
    excerpt: "No build step, no dependencies, no install instructions. A file you double-click is still the fastest way to get someone to actually try your thing.",
    tags: ["Vanilla JS", "Shipping"],
    body: [
      { type: "p", text: "The debate simulator is one HTML file. Not a bundle that happens to be inlined — no build step, no node_modules, no CDN. You double-click it and it runs. That decision was not an aesthetic one; it was about who would actually open it." },
      { type: "h2", text: "The friction tax" },
      { type: "p", text: "Every extra step before someone sees your work costs you a large share of your audience. Clone, install, configure an env file, run a dev server — that is four chances to lose a teacher, a classmate, or a recruiter who is looking at your link on a phone." },
      { type: "quote", text: "If the demo needs instructions, it is not a demo yet." },
      { type: "p", text: "A single file removes all four. It also forces a discipline I did not expect: when everything lives in one place, dead code is impossible to ignore." },
      { type: "h2", text: "What it costs" },
      { type: "ul", items: [
        "No modules. I used one IIFE and named things carefully.",
        "No framework. State changes are explicit DOM updates, which is fine at this size and painful at twice this size.",
        "No tree shaking. The file is 160 KB, which is smaller than most hero images."
      ] },
      { type: "p", text: "The line is around 3000 lines. Past that, I would reach for a bundler without hesitating. Below it, the single file wins on nearly every axis that matters for a demo." },
      { type: "h2", text: "The trick that made it work" },
      { type: "p", text: "Data first. I wrote the 100 topics as a plain array before any UI existed, then wrote a checker that verified every sample argument contains at least two of its own keywords. That checker found 348 problems in my own writing." },
      { type: "code", lang: "js", text: "// every argument must hit two keyword groups\nfor (const a of args) {\n  const hits = kw.filter(g => g.some(w => a.includes(w)));\n  if (hits.length < 2) report(id, a);\n}" },
      { type: "p", text: "That is the part people do not see when they open the file. The file is small; the validation behind it is not." }
    ]
  },
  {
    id: "jwt-storage",
    title: "Where should a JWT live? localStorage vs. cookies, settled",
    date: "2026-10-19",
    dateLabel: "2026.10.19",
    cat: "Backend",
    read: 12,
    excerpt: "Both options are wrong in the same way, and both are right in a different way. The answer depends on one question: who is allowed to run JavaScript on your page?",
    tags: ["JWT", "Security"],
    body: [
      { type: "p", text: "Every tutorial says 'store the token in localStorage' and every security article says 'never store a token in localStorage'. They are both describing real trade-offs, badly." },
      { type: "h2", text: "The actual difference" },
      { type: "p", text: "localStorage is readable by any JavaScript running on your origin. Cookies marked HttpOnly are not. That is the whole security argument, and everything else is consequence." },
      { type: "ul", items: [
        "localStorage — one successful XSS and the attacker walks away with a long-lived credential.",
        "HttpOnly cookie — XSS cannot read it, but the browser will attach it to requests you did not intend, so you now need CSRF protection."
      ] },
      { type: "h2", text: "So which one" },
      { type: "p", text: "For a course project where the frontend and API live on different domains, I use localStorage plus a short expiry and a refresh endpoint. It is the option that does not require cookie domain gymnastics across two deploy targets, and the risk profile of a portfolio site is low." },
      { type: "p", text: "For anything holding real user data, I would use an HttpOnly, Secure, SameSite=Lax cookie with a CSRF token — and accept the extra moving parts." },
      { type: "quote", text: "localStorage is not insecure. It is insecure the moment you have an XSS bug, which is a different sentence." },
      { type: "code", lang: "js", text: "// axios: attach once, not in every component\napi.interceptors.request.use(cfg => {\n  const t = localStorage.getItem('token');\n  if (t) cfg.headers.Authorization = `Bearer ${t}`;\n  return cfg;\n});" },
      { type: "p", text: "The one thing I would not do is keep the token in React state only. A refresh then logs the user out, and users read that as a bug, not as security." }
    ]
  },
  {
    id: "scoring-arguments",
    title: "Scoring a robot's argument: tuning a five-axis rubric",
    date: "2026-10-07",
    dateLabel: "2026.10.07",
    cat: "Algorithms",
    read: 10,
    excerpt: "The hard part of grading an argument is not detecting keywords. It is refusing to reward confidence.",
    tags: ["Heuristics", "Product"],
    body: [
      { type: "p", text: "The first version of the debate scorer counted keywords. It gave full marks to 'Reading is good, because reading is good, and everyone knows reading is good' — three keyword hits, zero arguments." },
      { type: "h2", text: "Five axes, and why" },
      { type: "ul", items: [
        "Logic — 'because / so / if / then' structure. Highest weight, because it is the thing being taught.",
        "Relevance — does it touch this topic's keywords, including synonyms.",
        "Length — a weak signal on its own, so it caps early.",
        "Rebuttal — does it engage with the other side, not just restate its own.",
        "Examples — a concrete case earns more than a general claim."
      ] },
      { type: "p", text: "Slogans are detected separately: a phrase like 'obviously' or 'needless to say' is stripped before scoring, and if nothing substantive is left, the score is zero rather than low." },
      { type: "h2", text: "Negative scores are a feature" },
      { type: "p", text: "Cheating, hitting someone, lying — these are not weak arguments, they are bad ones, and a rubric that treats them as 'a bit off-topic' teaches the wrong lesson. One sentence cost four points in testing, which felt right: recoverable, but memorable." },
      { type: "code", lang: "js", text: "const pen = detectHarmful(text); // cheating, violence, insults\nif (pen.length) return { score: -4 * pen.length, stars: 0, comments: [...] };" },
      { type: "p", text: "The rubric is not fair in any deep sense. But it is consistent, explainable, and every point it awards has a sentence attached — which is more than most automated grading can say." }
    ]
  },
  {
    id: "css-i-retype",
    title: "The CSS I keep re-typing in every project",
    date: "2026-09-22",
    dateLabel: "2026.09.22",
    cat: "Frontend",
    read: 6,
    excerpt: "Eleven lines that fixed 80% of my layout complaints, and one line I should have written years earlier.",
    tags: ["CSS", "Layout"],
    body: [
      { type: "p", text: "I have started every project by pasting the same block of CSS. It is not a framework and it will never be one, but it removes the four problems I hit first every single time." },
      { type: "code", lang: "css", text: "*{box-sizing:border-box}\nbody{margin:0;-webkit-font-smoothing:antialiased;overflow-x:hidden}\nimg{max-width:100%;display:block}\n:root{--max:1160px}\n.wrap{max-width:var(--max);margin:0 auto;padding:0 28px}" },
      { type: "h2", text: "The line I resisted" },
      { type: "p", text: "overflow-x:hidden on body. For years I treated horizontal scroll as a bug to be found. Usually it is a decorative element — a blurred glow, a rotated caption — sitting slightly outside the viewport, and clipping it is the correct fix, not a cover-up." },
      { type: "h2", text: "What is not in the block" },
      { type: "ul", items: [
        "No reset library. I want the browser defaults for headings and lists to survive.",
        "No spacing scale. I add one when a page actually needs it.",
        "No colour system until the second page exists — the first page always lies about what it needs."
      ] }
    ]
  },
  {
    id: "mongodb-schemas",
    title: "What MongoDB actually taught me about schemas",
    date: "2026-09-05",
    dateLabel: "2026.09.05",
    cat: "Backend",
    read: 9,
    excerpt: "Schemaless does not mean no design. It means the design lives in your queries, where it is much harder to see.",
    tags: ["MongoDB", "Data modelling"],
    body: [
      { type: "p", text: "I came to MongoDB from a course that spent six weeks on normalisation, so my first instinct was to split everything into collections and join them back with populate(). Six months later I mostly do the opposite." },
      { type: "h2", text: "Embed what you read together" },
      { type: "p", text: "A blog post and its comments are read together and written separately. But comments per post are small and bounded in a portfolio site, so embedding them means one query serves the detail page — and the 'count the comments' problem disappears." },
      { type: "quote", text: "Model the read path first. The write path is easier to change." },
      { type: "h2", text: "Indexes are the schema you can feel" },
      { type: "p", text: "A marketplace search by faculty and condition was 'slow' until we added a compound index in that order. Same query, same data, ten times faster. In a relational database I would have thought about this at design time; in Mongo it is easy to pretend it does not matter." },
      { type: "code", lang: "js", text: "listingSchema.index({ faculty: 1, condition: 1, createdAt: -1 });" },
      { type: "p", text: "The honest summary: Mongo let me ship before I understood my data, and then charged interest on that loan." }
    ]
  }
];

/* debate topics */
export const topics = [
  {
    id: "t01", cat: "School", d: 1,
    p: "Reading widely is always good",
    c: "Not every book is worth reading",
    h: "Think about whether all reading is equally useful.",
    pro: {
      kw: [["read", "reading", "books"], ["knowledge", "learn", "information"], ["imagination", "creative"], ["habit", "daily", "practice"]],
      args: [
        "Reading builds knowledge because every book gives you information you did not have before.",
        "Even a bad book teaches you something, since you learn to judge what a good argument looks like.",
        "A daily reading habit improves vocabulary, for example students who read often write more clearly."
      ]
    },
    con: {
      kw: [["choose", "choice", "pick"], ["quality", "bad book", "waste"], ["guide", "teacher", "advice"], ["time", "limited", "hours"]],
      args: [
        "Time is limited, so a bad book costs you the good book you could have read instead.",
        "Children need a guide to choose books, because a cover tells you nothing about quality.",
        "Not all information is true, for example some popular books repeat claims that were never tested."
      ]
    }
  },
  {
    id: "t02", cat: "Life", d: 2,
    p: "Students should do housework every day",
    c: "Housework should not be a daily duty",
    h: "Balance responsibility against time and rest.",
    pro: {
      kw: [["responsibility", "duty", "chores"], ["independence", "living alone"], ["family", "parents", "help"], ["habit", "every day", "routine"]],
      args: [
        "Chores teach responsibility, because a home only works when everyone helps.",
        "Cooking and cleaning are skills you need when you live alone, so practice early saves trouble later.",
        "Helping parents shares the load, for example washing dishes takes ten minutes and removes a real burden."
      ]
    },
    con: {
      kw: [["study", "homework", "schoolwork"], ["rest", "sleep", "tired"], ["balance", "schedule", "time"], ["fair", "too much", "pressure"]],
      args: [
        "Study time is already full, so a daily duty pushes homework later and sleep shorter.",
        "A fixed daily rule ignores the schedule, for example exam weeks need a different balance.",
        "Responsibility can be learned weekly, because one clear task done well teaches more than a rushed daily one."
      ]
    }
  },
  {
    id: "t03", cat: "Tech", d: 2,
    p: "AI should do our homework",
    c: "AI should only tutor, never do the work",
    h: "Separate getting the answer from learning the skill.",
    pro: {
      kw: [["efficient", "save time", "fast"], ["tool", "calculator", "assist"], ["explain", "understand", "tutor"], ["future", "workplace", "real world"]],
      args: [
        "AI is a tool like a calculator, because the point is the reasoning, not the arithmetic.",
        "It can explain a step you missed, for example a solver can show where an equation went wrong.",
        "Workplaces already use these tools, so practice now prepares you for the real world."
      ]
    },
    con: {
      kw: [["learn", "skill", "practice"], ["copy", "cheat", "shortcut"], ["exam", "test", "grade"], ["think", "reason", "own words"]],
      args: [
        "You cannot learn a skill you never practise, because reading an answer is not the same as producing one.",
        "It becomes a shortcut under pressure, for example at 11pm the honest option is the slower one.",
        "Grades stop measuring you, so an exam result no longer tells a teacher what you can actually do."
      ]
    }
  },
  {
    id: "t04", cat: "School", d: 1,
    p: "Phones should be allowed in school",
    c: "Phones should stay in the locker",
    h: "Consider safety and focus with equal seriousness.",
    pro: {
      kw: [["safety", "emergency", "contact"], ["tool", "learning", "research"], ["responsibility", "trust", "manage"], ["prepare", "real world", "adult"]],
      args: [
        "A phone is a safety line, because parents can reach a student when plans change.",
        "It is a learning tool, for example a dictionary or a quick search answers a question in seconds.",
        "Trust teaches responsibility, since students who manage a phone learn to manage distractions."
      ]
    },
    con: {
      kw: [["focus", "attention", "distraction"], ["bully", "compare", "pressure"], ["game", "social media", "scroll"], ["rule", "fair", "everyone"]],
      args: [
        "Attention breaks easily, because a single notification costs several minutes of focus.",
        "Phones carry social pressure, for example group chats make comparison constant and public.",
        "Rules only work when they are the same for everyone, and a partial ban is impossible to enforce fairly."
      ]
    }
  },
  {
    id: "t05", cat: "Growth", d: 3,
    p: "Failure is a better teacher than success",
    c: "Success teaches more than failure",
    h: "Think about what each one actually tells you.",
    pro: {
      kw: [["mistake", "error", "wrong"], ["reflect", "review", "analyse"], ["improve", "change", "better"], ["memory", "remember", "lesson"]],
      args: [
        "A mistake shows exactly where the plan broke, because success hides which step mattered.",
        "Failure forces reflection, for example a lost match makes a team rewatch every point.",
        "It is remembered longer, so the lesson survives to the next attempt."
      ]
    },
    con: {
      kw: [["method", "strategy", "what works"], ["confidence", "motivation", "keep going"], ["repeat", "scale", "copy"], ["proof", "evidence", "validate"]],
      args: [
        "Success identifies the method, because you can repeat what actually worked.",
        "It builds confidence to continue, for example one good result makes the next attempt likely.",
        "It is proof, not luck, so a working approach can be taught to someone else."
      ]
    }
  },
  {
    id: "t06", cat: "Life", d: 2,
    p: "Pocket money should be earned, not given",
    c: "A basic allowance should be unconditional",
    h: "Separate teaching value from family fairness.",
    pro: {
      kw: [["earn", "work", "effort"], ["value", "price", "cost"], ["responsibility", "manage", "budget"], ["real world", "job", "salary"]],
      args: [
        "Earning connects money to effort, because a wage is the clearest lesson in value.",
        "It teaches budgeting, for example saving for a month changes how a purchase feels.",
        "It mirrors adult life, since nobody is paid simply for existing."
      ]
    },
    con: {
      kw: [["family", "love", "support"], ["fair", "equal", "difference"], ["poor", "cannot", "struggle"], ["pressure", "stress", "too early"]],
      args: [
        "A family supports without conditions, because love is not a salary.",
        "Earning rules punish difference, for example a child who cares for a sibling has no time to earn.",
        "It adds pressure too early, so a small allowance protects childhood from money stress."
      ]
    }
  },
  {
    id: "t07", cat: "Tech", d: 3,
    p: "Social media does more harm than good for teenagers",
    c: "Social media is mostly a benefit",
    h: "Weigh connection against attention and comparison.",
    pro: {
      kw: [["compare", "envy", "self-esteem"], ["attention", "distraction", "scroll"], ["sleep", "late night", "tired"], ["bully", "anonymous", "rumour"]],
      args: [
        "Constant comparison damages self-esteem, because a feed only shows everyone's best day.",
        "It eats attention in small pieces, for example ten minutes becomes an hour without a decision.",
        "Harassment follows you home, so there is no safe hour left in the day."
      ]
    },
    con: {
      kw: [["connect", "friends", "community"], ["learn", "information", "discover"], ["voice", "share", "create"], ["support", "help", "reach"]],
      args: [
        "It keeps friendships alive across distance, because a group chat is a real social space.",
        "It spreads useful information fast, for example a study group forms in an evening.",
        "It gives quiet students a voice, since writing is easier than speaking for some people."
      ]
    }
  },
  {
    id: "t08", cat: "Growth", d: 1,
    p: "Teamwork is more important than individual talent",
    c: "Individual talent decides the result",
    h: "Think about who does the work when pressure arrives.",
    pro: {
      kw: [["team", "together", "group"], ["cooperate", "share", "divide"], ["support", "help", "cover"], ["result", "outcome", "finish"]],
      args: [
        "Work divides by strength, because a team can cover five skills instead of one.",
        "People cover each other under pressure, for example when one member is ill the plan still holds.",
        "Big results need many hands, since no single person can build a whole product alone."
      ]
    },
    con: {
      kw: [["talent", "skill", "ability"], ["decide", "key moment", "winner"], ["idea", "vision", "create"], ["slow", "meeting", "compromise"]],
      args: [
        "A single idea often decides everything, because a team without a direction just meets.",
        "Talent shows in the key moment, for example one accurate pass ends the match.",
        "Groups compromise, so the boldest option is usually the first one cut."
      ]
    }
  }
];
