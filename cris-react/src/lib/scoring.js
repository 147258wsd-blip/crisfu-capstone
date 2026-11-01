/* Five-axis argument scorer.
   Kept as a pure function so it can be unit-tested without React —
   this is also the piece the backend will re-use for archived matches. */

const HARM = /\b(cheat|copy (the|my|his|her)? ?homework|hit (him|her|them)|fight|steal|lie to)\b/i;
const SLOGAN = /\b(obviously|needless to say|of course|everyone knows|clearly)\b/gi;

export function evaluate(text, topic, side) {
  const data = side === "p" ? topic.pro : topic.con;
  const notes = [];
  let score = 0;

  const clean = String(text || "").trim();
  const body = clean.replace(SLOGAN, "").trim();

  /* red line: bad advice is not a weak argument */
  if (HARM.test(clean)) {
    return { score: -4, notes: [{ ok: false, t: "−4", m: "That is bad advice, not a weak argument." }] };
  }

  /* slogans only */
  if (body.replace(/[^\w\s']/g, "").length < 8) {
    return { score: 0, notes: [{ ok: false, t: "0", m: "Sounds like a slogan. Add a reason." }] };
  }

  /* 1. reasoning — highest weight */
  let r = 0;
  if (/\b(because|since|as)\b/i.test(clean)) r += 3;
  if (/\b(so|therefore|which means|that's why)\b/i.test(clean)) r += 3;
  if (/\bif\b/i.test(clean) && /\b(will|would|can|could)\b/i.test(clean)) r += 1;
  if (/\b(but|however|although|even though)\b/i.test(clean)) r += 2;
  r = Math.min(r, 9);
  if (r) {
    score += r;
    notes.push({ ok: true, t: "+" + r, m: "You gave a reason instead of a verdict." });
  }

  /* 2. relevance — either side's vocabulary counts as on-topic */
  const oppData = side === "p" ? topic.con : topic.pro;
  const seen = [];
  let hits = 0;
  data.kw.concat(oppData.kw).forEach((group) => {
    const w = group.find((x) => clean.toLowerCase().includes(x.toLowerCase()));
    if (w && !seen.includes(w)) {
      hits++;
      seen.push(w);
    }
  });
  const rel = Math.min(hits * 2, 8);
  if (rel) {
    score += rel;
    notes.push({ ok: true, t: "+" + rel, m: "On topic — " + seen.slice(0, 3).join(", ") + "." });
  } else {
    notes.push({ ok: false, t: "0", m: "Nothing here connects to this topic's core words." });
  }

  /* 3. length — weak signal, capped early */
  const len = clean.replace(/\s/g, "").length;
  const lenPts = len >= 80 ? 3 : len >= 40 ? 2 : len >= 15 ? 1 : 0;
  if (lenPts) {
    score += lenPts;
    notes.push({ ok: true, t: "+" + lenPts, m: "Long enough to develop the point." });
  }

  /* 4. examples */
  if (/\b(for example|for instance|like when|in my class|last year|such as)\b/i.test(clean)) {
    score += 3;
    notes.push({ ok: true, t: "+3", m: "A concrete example makes it checkable." });
  }

  /* 5. rebuttal */
  if (/\b(you said|your point|you mentioned|that ignores|but you|the other side)\b/i.test(clean)) {
    score += 3;
    notes.push({ ok: true, t: "+3", m: "You engaged with the other side." });
  }

  /* a well-formed sentence that ignores the topic is not a point */
  if (hits === 0) {
    score = Math.min(score, 2);
    notes.unshift({ ok: false, t: "cap 2", m: "Well said, but it could be about any topic." });
  }

  return { score: Math.max(0, score), notes: notes.slice(0, 4) };
}

export const DIFF_NAMES = ["Beginner", "Intermediate", "Advanced"];
export const DIFF_MULT = [0.7, 1.0, 1.35];
export const MAX_ROUNDS = 3;
export const TOTAL_MSGS = MAX_ROUNDS * 2;

export const sideName = (s) => (s === "p" ? "PRO" : "CON");
export const otherSide = (s) => (s === "p" ? "c" : "p");
export const sideText = (topic, s) => (s === "p" ? topic.p : topic.c);
