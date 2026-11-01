/* The opponent. Two rules it never breaks:
   1. it only quotes words the player actually typed;
   2. every reply ends with a finished sentence, never a half clause. */
import { otherSide } from "./scoring";

function dataFor(topic, side) {
  return side === "p" ? topic.pro : topic.con;
}

/* longest keyword match wins, so "safety" does not get shadowed by "safe" */
export function quotedWord(topic, userText) {
  const all = [];
  [topic.pro.kw, topic.con.kw].forEach((groups) => groups.forEach((g) => g.forEach((w) => all.push(w))));
  all.sort((a, b) => b.length - a.length);

  const lower = String(userText || "").toLowerCase();
  return all.find((w) => lower.includes(w.toLowerCase())) || null;
}

export function nextArg(topic, side, used) {
  const data = dataFor(topic, side);
  const index = used[side] % data.args.length;
  used[side] += 1;
  return data.args[index];
}

export function composeReply({ topic, side, diff, userText, used }) {
  const bot = otherSide(side);
  const quote = quotedWord(topic, userText);

  if (diff === 0) {
    return nextArg(topic, bot, used) + " I don't think that settles it.";
  }

  if (diff === 1) {
    const lead = quote
      ? `You said "${quote}" — but that is exactly where the problem starts. `
      : "That sounds reasonable, but it only looks at one side. ";
    return lead + nextArg(topic, bot, used);
  }

  const lead = quote
    ? `You keep coming back to "${quote}", and that is the weak link in your case. `
    : "You are making a broad claim without naming what it costs. ";
  return lead + nextArg(topic, bot, used) + " " + nextArg(topic, bot, used) + " So how would you answer that?";
}
