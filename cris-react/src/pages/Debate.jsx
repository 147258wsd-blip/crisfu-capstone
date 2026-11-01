import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ErrorState from "../components/ErrorState";
import { useApi, useTitle } from "../hooks/useApi";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";
import { LANGS } from "../data/topics";
import { composeReply } from "../lib/bot";
import {
  evaluate,
  DIFF_MULT,
  DIFF_NAMES,
  MAX_ROUNDS,
  TOTAL_MSGS,
  otherSide,
  sideName,
  sideText,
} from "../lib/scoring";

function shuffle(list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

let seq = 0;
const nextId = () => `m${++seq}`;

export default function Debate() {
  useTitle("Debate Simulator");
  const toast = useToast();
  const [lang, setLang] = useState("en");
  const topicsQ = useApi(() => api.debate.topics(lang), [lang]);
  const allTopics = useMemo(() => topicsQ.data || [], [topicsQ.data]);

  const [batch, setBatch] = useState([]);
  const [topic, setTopic] = useState(null);
  const [side, setSide] = useState(null);
  const [diff, setDiff] = useState(0);
  const [phase, setPhase] = useState("setup"); // setup | battle | result

  const [scores, setScores] = useState({ p: 0, c: 0 });
  const [msgs, setMsgs] = useState([]);
  const [round, setRound] = useState(1);
  const [waiting, setWaiting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);

  const scoreRef = useRef({ p: 0, c: 0 });
  const countRef = useRef(0);
  const usedRef = useRef({ p: 0, c: 0 });
  const timerRef = useRef(null);
  const chatRef = useRef(null);
  const battleRef = useRef(null);
  const inputRef = useRef(null);
  const resultRef = useRef(null);

  /* deal a batch whenever the library changes (first load, language switch).
     Cards from another language would otherwise stay on the table. */
  useEffect(() => {
    if (!allTopics.length) return;
    setBatch((prev) => {
      const foreign = prev.some((t) => t.lang !== allTopics[0].lang);
      return !prev.length || foreign ? shuffle(allTopics).slice(0, 4) : prev;
    });
  }, [allTopics]);

  const switchLang = (id) => {
    if (id === lang) return;
    setLang(id);
    setTopic(null);
    setSide(null);
    setResult(null);
    setBatch([]);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  /* keep the newest bubble in view */
  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  const redraw = useCallback(() => {
    setTopic(null);
    setSide(null);
    setBatch(shuffle(allTopics).slice(0, 4));
  }, [allTopics]);

  const start = () => {
    clearTimeout(timerRef.current);
    scoreRef.current = { p: 0, c: 0 };
    countRef.current = 0;
    usedRef.current = { p: 0, c: 0 };
    setScores({ p: 0, c: 0 });
    setRound(1);
    setWaiting(false);
    setFinished(false);
    setInput("");
    setResult(null);
    setMsgs([
      {
        id: nextId(),
        kind: "sys",
        text: `You are arguing ${sideName(side)}: “${sideText(topic, side)}”. Three rounds. Open with your first point.`,
      },
    ]);
    setPhase("battle");

    requestAnimationFrame(() => {
      const el = battleRef.current;
      if (el) window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - 84, behavior: "smooth" });
      if (inputRef.current) inputRef.current.focus({ preventScroll: true });
    });
  };

  const finish = useCallback(() => {
    clearTimeout(timerRef.current);
    setFinished(true);
    setWaiting(false);

    const { p, c } = scoreRef.current;
    setResult({
      p,
      c,
      head: p === c ? "Draw." : `${p > c ? "PRO" : "CON"} wins.`,
      line:
        p === c
          ? "Neither side landed a clear advantage."
          : `You argued ${sideName(side)}, and the score went ${p} : ${c}.`,
    });
    setPhase("result");

    api.debate
      .saveMatch({ topicId: topic.id, side, diff, pro: p, con: c, rounds: MAX_ROUNDS })
      .catch(() => {});

    requestAnimationFrame(() => {
      const el = resultRef.current;
      if (el) window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - 84, behavior: "smooth" });
    });
  }, [side, topic, diff]);

  const send = () => {
    const text = input.trim();
    if (!text || waiting || finished || !topic) return;

    const ev = evaluate(text, topic, side);
    scoreRef.current[side] += ev.score;
    setScores({ ...scoreRef.current });
    countRef.current += 1;
    setInput("");
    setMsgs((list) => [
      ...list,
      { id: nextId(), kind: "msg", side, text, pts: ev.score, you: true, notes: ev.notes },
    ]);

    if (countRef.current >= TOTAL_MSGS) {
      finish();
      return;
    }

    setWaiting(true);
    setMsgs((list) => [...list, { id: "typing", kind: "typing", side: otherSide(side) }]);

    timerRef.current = setTimeout(() => {
      const bot = otherSide(side);
      const reply = composeReply({ topic, side, diff, userText: text, used: usedRef.current });
      const botEv = evaluate(reply, topic, bot);
      const pts = Math.round(botEv.score * DIFF_MULT[diff]);

      scoreRef.current[bot] += pts;
      setScores({ ...scoreRef.current });
      countRef.current += 1;

      setMsgs((list) => [
        ...list.filter((m) => m.kind !== "typing"),
        { id: nextId(), kind: "msg", side: bot, text: reply, pts, you: false },
      ]);
      setWaiting(false);
      setRound(Math.min(MAX_ROUNDS, Math.floor(countRef.current / 2) + 1));

      if (countRef.current >= TOTAL_MSGS) {
        finish();
      } else if (inputRef.current) {
        inputRef.current.focus({ preventScroll: true });
      }
    }, 1500);
  };

  const endEarly = () => {
    if (!finished && countRef.current > 0) finish();
  };

  const backToSetup = () => {
    clearTimeout(timerRef.current);
    setFinished(true);
    setWaiting(false);
    setPhase("setup");
    setTopic(null);
    setSide(null);
    redraw();
  };

  const beginAgain = () => {
    setPhase("setup");
    setTopic(null);
    setSide(null);
    setResult(null);
    redraw();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const canStart = !!(topic && side);

  return (
    <>
      <div className="wrap">
        <div className="page-head">
          <span className="kicker">
            <span className="num">03</span>Playground
          </span>
          <h1>Debate Simulator</h1>
          <p>
            Three rounds, one opponent. It scores your sentences on reasoning, relevance, evidence and
            rebuttal — and it refuses to reward confidence.
          </p>
        </div>
      </div>

      <div className="wrap">
        <div className="play">
          {/* ---------------- setup ---------------- */}
          {phase === "setup" && (
            <section className="setup">
              <div className="step">
                <div className="step-h">
                  <span className="idx">1</span>Pick a topic
                  <span className="lang-switch" role="group" aria-label="Topic language">
                    {LANGS.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        className={lang === l.id ? "on" : ""}
                        aria-pressed={lang === l.id}
                        onClick={() => switchLang(l.id)}
                        title={`${l.count} topics`}
                      >
                        {l.label}
                        <span className="n">{l.count}</span>
                      </button>
                    ))}
                  </span>
                  <button className="re" onClick={redraw} disabled={!allTopics.length}>
                    ↻ redraw
                  </button>
                </div>

                {topicsQ.loading && (
                  <div className="pick-grid" aria-hidden="true">
                    {[0, 1, 2, 3].map((i) => (
                      <div className="skel" key={i} style={{ height: 86, borderRadius: 12 }} />
                    ))}
                  </div>
                )}

                {topicsQ.error && (
                  <ErrorState
                    error={topicsQ.error}
                    title="Could not load topics"
                    message="The topic deck did not arrive. Retry and the cards will be dealt again."
                    onRetry={topicsQ.reload}
                  />
                )}

                {!topicsQ.loading && !topicsQ.error && (
                  <div className="pick-grid">
                    {batch.map((t) => (
                      <button
                        key={t.id}
                        className={"pick" + (topic && topic.id === t.id ? " on" : "")}
                        onClick={() => {
                          setTopic(t);
                          setSide(null);
                        }}
                      >
                        <div className="p-t">{t.p}</div>
                        <div className="p-s">
                          {t.cat} · {"★".repeat(t.d)}
                          {"☆".repeat(3 - t.d)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="step">
                <div className="step-h">
                  <span className="idx">2</span>Choose your side
                </div>
                <div className="stance-row">
                  <button
                    className={"stance s-p" + (side === "p" ? " on-p" : "")}
                    onClick={() => (topic ? setSide("p") : toast("Pick a topic first"))}
                    aria-pressed={side === "p"}
                  >
                    <span className="lb">PRO</span>
                    <span className="tx">{topic ? topic.p : "Pick a topic first"}</span>
                  </button>
                  <button
                    className={"stance s-c" + (side === "c" ? " on-c" : "")}
                    onClick={() => (topic ? setSide("c") : toast("Pick a topic first"))}
                    aria-pressed={side === "c"}
                  >
                    <span className="lb">CON</span>
                    <span className="tx">{topic ? topic.c : "Pick a topic first"}</span>
                  </button>
                </div>
              </div>

              <div className="step">
                <div className="step-h">
                  <span className="idx">3</span>Difficulty
                </div>
                <div className="diff-row">
                  {DIFF_NAMES.map((name, i) => (
                    <button key={name} className={"chip" + (diff === i ? " on" : "")} onClick={() => setDiff(i)}>
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="setup-foot">
                <button className="btn btn-primary" disabled={!canStart} onClick={start}>
                  Start debate
                </button>
                <span className="note">
                  {canStart
                    ? `You argue ${sideName(side)}. The bot takes the other side.`
                    : "Pick a topic and a side to begin."}
                </span>
              </div>
            </section>
          )}

          {/* ---------------- battle ---------------- */}
          {phase === "battle" && (
            <section ref={battleRef}>
              <div className="scorebar">
                <div className="sc pro">
                  <div className="l">PRO</div>
                  <div className="v bump" key={"p" + scores.p}>
                    {scores.p}
                  </div>
                </div>
                <div className="mid">
                  <b>
                    Round {round} / {MAX_ROUNDS}
                  </b>
                  <span>{DIFF_NAMES[diff]}</span>
                </div>
                <div className="sc con">
                  <div className="l">CON</div>
                  <div className="v bump" key={"c" + scores.c}>
                    {scores.c}
                  </div>
                </div>
              </div>

              <div className="chat" ref={chatRef} aria-live="polite">
                {msgs.map((m) => {
                  if (m.kind === "sys") {
                    return (
                      <div className="sys" key={m.id}>
                        {m.text}
                      </div>
                    );
                  }
                  if (m.kind === "typing") {
                    return (
                      <div className="dm dm-c" key="typing">
                        <div className="who">BOT · {sideName(otherSide(side))}</div>
                        <div className="typing">
                          <i />
                          <i />
                          <i />
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div
                      className={"dm " + (m.you ? "you " : "") + (m.side === "p" ? "dm-p" : "dm-c")}
                      key={m.id}
                    >
                      <div className="who">
                        {m.you ? "YOU" : "BOT"} · {sideName(m.side)}
                      </div>
                      <div className="txt">{m.text}</div>
                      {m.pts != null && (
                        <div className={"pts" + (m.pts < 0 ? " neg" : "")}>
                          {m.pts > 0 ? "+" : ""}
                          {m.pts} pts
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="composer">
                <input
                  ref={inputRef}
                  value={input}
                  maxLength={200}
                  placeholder="Make your point…"
                  autoComplete="off"
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.isComposing) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                <button className="btn btn-primary" onClick={send} disabled={waiting || finished}>
                  {waiting ? <span className="spinner" /> : "Send"}
                </button>
              </div>

              <div className="kw">
                <span>Useful words for your side:</span>
                {(side === "p" ? topic.pro : topic.con).kw
                  .flat()
                  .slice(0, 8)
                  .map((w) => (
                    <span className="k" key={w}>
                      {w}
                    </span>
                  ))}
              </div>

              <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn btn-ghost btn-sm" onClick={endEarly}>
                  End early
                </button>
                <button className="btn btn-ghost btn-sm" onClick={backToSetup}>
                  Back to setup
                </button>
              </div>
            </section>
          )}

          {/* ---------------- result ---------------- */}
          {phase === "result" && result && (
            <section ref={resultRef}>
              <div className="result">
                <h2>{result.head}</h2>
                <p>{result.line}</p>
                <div className="final">
                  PRO <b>{result.p}</b> &nbsp;:&nbsp; <b>{result.c}</b> CON
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                  <button className="btn btn-primary" onClick={beginAgain}>
                    Debate again
                  </button>
                  <Link className="btn btn-ghost" to="/projects/debate-simulator">
                    How it was built
                  </Link>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
