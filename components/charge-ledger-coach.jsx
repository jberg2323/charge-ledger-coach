"use client";

import { useState, useEffect, useRef } from "react";

// ----------------------------------------------------------------------
// The Charge Ledger, with a live coach
// A guided reflection tool based on the balancing protocol popularized
// by Dr. John Demartini. The embedded coach is briefed on the method
// and intervenes when you are stuck, vague, or still activated.
// ----------------------------------------------------------------------

const T = {
  black: "#0A0A0A",
  charcoal: "#141414",
  surface: "#1C1C1C",
  surfaceRaised: "#262626",
  white: "#FFFFFF",
  offWhite: "#F4F4F0",
  gray: "#8A8A8A",
  grayDim: "#5C5C5C",
  line: "#333333",
  volt: "#D4FF00",
  voltDim: "rgba(212,255,0,0.15)",
  heat: "#FF4D4D",
  heatDim: "rgba(255,77,77,0.12)",
  cool: "#00E5A0",
  coolDim: "rgba(0,229,160,0.12)",
  win: "#D4FF00",
};

const FONT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');
* { box-sizing: border-box; }
.cl-display { font-family: 'Barlow Condensed', system-ui, sans-serif; letter-spacing: 0.02em; text-transform: uppercase; }
.cl-ui { font-family: 'Inter', system-ui, sans-serif; }
.cl-fade { animation: clFade .4s cubic-bezier(.22,1,.36,1) both; }
.cl-pop { animation: clPop .45s cubic-bezier(.22,1,.36,1) both; }
@keyframes clFade { from { opacity: 0; transform: translateY(10px);} to { opacity: 1; transform: none;} }
@keyframes clPop { 0% { opacity:0; transform: scale(.92);} 60% { transform: scale(1.02);} 100% { opacity:1; transform: scale(1);} }
@keyframes clPulse { 0%,100% { opacity: .35; } 50% { opacity: 1; } }
@keyframes clShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.cl-thinking span { animation: clPulse 1.2s ease infinite; display:inline-block; }
.cl-thinking span:nth-child(2){ animation-delay:.2s } .cl-thinking span:nth-child(3){ animation-delay:.4s }
.cl-sticky-bar { position: sticky; top: 0; z-index: 40; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
.cl-btn { transition: transform .15s ease, background .15s ease, border-color .15s ease, opacity .15s ease; }
.cl-btn:hover:not(:disabled) { transform: translateY(-1px); }
.cl-btn:active:not(:disabled) { transform: translateY(0); }
.cl-chip:hover { border-color: ${T.volt} !important; color: ${T.white} !important; }
.cl-card:hover { border-color: #444 !important; }
@media (prefers-reduced-motion: reduce) {
  .cl-fade, .cl-pop { animation: none; }
  .cl-beam { transition: none !important; }
  .cl-thinking span { animation: none; }
  .cl-btn:hover:not(:disabled) { transform: none; }
}
textarea:focus, input:focus, button:focus-visible { outline: 2px solid ${T.volt}; outline-offset: 2px; }
`;

function btnBase(extra = {}) {
  return {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    borderRadius: 999,
    cursor: "pointer",
    transition: "transform .15s ease, background .15s ease",
    ...extra,
  };
}

function sessionProgress(session) {
  const e = session.entries;
  const phaseScores = [
    Math.min(e.own.length / MIN_ENTRIES, 1),
    Math.min(Math.min(e.costs.length, e.benefits.length) / MIN_ENTRIES, 1),
    Math.min(e.opposite.length / MIN_ENTRIES, 1),
    Math.min(e.fantasy.length / MIN_ENTRIES, 1),
    session.reflection.trim() ? 0.5 : 0,
    session.done ? 0.5 : 0,
  ];
  return Math.round((phaseScores.reduce((a, b) => a + b, 0) / phaseScores.length) * 100);
}

function ProgressBar({ value, label, accent = T.volt }) {
  return (
    <div className="cl-ui" style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        {label ? (
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.gray }}>
            {label}
          </span>
        ) : <span />}
        <span style={{ fontSize: 13, fontWeight: 800, color: accent, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.04em" }}>
          {value}%
        </span>
      </div>
      <div style={{ height: 6, background: T.line, borderRadius: 99, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${value}%`,
            background: `linear-gradient(90deg, ${accent}, ${T.white})`,
            borderRadius: 99,
            transition: "width .6s cubic-bezier(.22,1,.36,1)",
          }}
        />
      </div>
    </div>
  );
}

const STORAGE_KEY = "charge-ledger-sessions-v2";
const MIN_ENTRIES = 3;

// ------------------------------------------------------------- method brief
// Distilled principles the coach reasons from. Written as instructions,
// not as quotations.
const METHOD_BRIEF = `
You are a coach guiding someone through a perceptual balancing protocol modeled on the Demartini Method. Core principles you reason from:

THE MODEL
1. Law of contrast: every charged judgment is a half perception. Resentment means conscious of downsides, blind to upsides. Infatuation means conscious of upsides, blind to downsides. Both occupy the mind and run the person until balanced. Seeing both sides simultaneously produces centeredness, presence, and gratitude.
2. Trait universality: every human displays every trait at some moment (the dictionary exercise across thousands of traits). Nobody gets rid of traits; repression delays and then amplifies them. Kindness appears when one's values are supported, cruelty when they are challenged. Both serve. Maximum growth happens at the border of support and challenge.
3. Projection as mirror: despising a trait in another usually points to a disowned moment of one's own behavior carrying shame. Admiring a trait usually points to disowned capacity the person is too humble to claim. Nobody belongs in a pit or on a pedestal.
4. Episodic specificity: reflection only rewires when it lands on a concrete moment with a where, a when, a recipient, and ideally a witness. Generic admissions like "I guess I do that sometimes" change nothing. Always push toward a specific scene.
5. All or none language ("always," "never," "everyone," "completely") signals survival mode bias. When you hear it, ask for the counterexample: where was the other side, even once?
6. The synchronous opposite: at the exact moment of a charged event, a complementary opposite was present somewhere in the person's reality, real or remembered, one person or many, close or distant, including from themselves. If someone criticized them, who was praising them in that window? If someone left, who arrived or drew closer? The mind also generates internal counterbalance (dissociative imagery during overwhelm counterweights the experience). Help them scan honestly; do not invent for them.
7. Cracking the fantasy: suffering lives in comparing what happened to a one sided fantasy of what should have happened. Price the fantasy. If the person had done the opposite, what would it have cost: dependency, arrested growth, naivety, lost drive, lost discernment? Common pattern: a harsh parent produced resilience and independence; an indulgent parent produced dependency. Use such patterns as hypotheses, never as verdicts.
8. Gain and loss: we only fear losing what we are infatuated with and only fear closeness with what we resent. Dissolving the polarity dissolves the fear.
9. Values: people act according to their own value hierarchy, not ours. Feeling betrayed usually means expecting someone to live by our values. Knowing their hierarchy makes their behavior predictable rather than offensive.
10. Completion signal: revisiting the original memory produces gratitude, presence, sometimes a tear of inspiration, and no activation. If charge remains, a column is incomplete or dishonest somewhere.

YOUR COACHING STYLE
- Socratic and exacting but warm. Never supply the person's answers; ask questions that make their own memory produce them.
- Always anchor questions in their actual entries, person, and trait. Quote their own words back briefly when useful.
- Reject vagueness. If an entry has no where, when, or recipient, ask for one.
- Watch for entries written to satisfy the form rather than believed. Ask: do you actually believe this, or did you write it to fill a row?
- 2 to 4 questions maximum per response. Short. No lectures.
- If content involves abuse, assault, or trauma, gently recommend doing this work with a trauma informed professional and keep your questions modest.
- Never use dashes of any kind in your output. Use commas, periods, or colons instead.
`;

const MODE_INSTRUCTIONS = {
  stuck: `The person is stuck on the current phase. Give a one or two sentence reframe of what this phase is actually asking, tailored to their person and trait, then 3 pointed questions that would unlock a real entry. If they have entries already, build on them. If their entries cluster in one context (only work, only family), point the scan somewhere they have not looked.`,
  pressure: `Pressure test their entries for this phase. Check each for: episodic specificity (where, when, to whom), honesty (written to fill a row vs believed), and all or none language. In your message, name which numbered entries are strong and which are soft and why, briefly. Then give 2 or 3 sharpening questions aimed at the weakest entries.`,
  charge: `They have finished all phases and written a reflection on revisiting the memory. Read the reflection and the full ledger. Diagnose: is the charge dissolved, or does activation remain? If it remains, identify which phase is the likely weak point (generic owning, an unbalanced or unbelieved ledger, a forced synchronous opposite, an uncracked fantasy) and say why, referencing their entries. Then give 2 or 3 questions to reopen that phase. If it reads genuinely complete, say so plainly and name what shifted.`,
};

const PHASE_LABELS = {
  own: "01 Own It: specific moments where you displayed the same trait",
  balance: "02 Level It: real costs and benefits of the trait, columns must match",
  opposite: "03 Find The Other Side: synchronous opposite present at the moment of charge",
  fantasy: "04 Break The Fantasy: drawbacks if they had done the exact opposite",
  completion: "05 The Charge Test: revisit the memory and assess remaining activation",
};

const CHAT_INSTRUCTIONS = `
You are in an open conversation with someone working through the Charge Ledger balancing protocol. You are a master practitioner of this method with deep fluency in every principle below.

CONVERSATION ROLE
- Be warm, direct, and exacting. You are their expert guide, not a generic chatbot.
- Answer questions about the method clearly when asked. Explain principles in plain language using their person and trait as the live example.
- When they share confusion, resistance, or emotion, acknowledge it briefly, then guide with one sharp question or a clear next move.
- Keep most replies to 2 to 5 sentences. Go longer only when they explicitly ask for a deeper explanation of a principle.
- Never write their ledger entries for them. Help their own memory produce the answers.
- Pressure test vague entries conversationally. Push for where, when, and to whom.
- Reference their actual entries and words when relevant.
- If they are stuck, offer 1 to 2 concrete places to scan (work, home, online, with family, etc.).
- If content involves abuse, assault, or serious trauma, gently recommend a trauma informed professional and keep questions modest.
- Never use dashes of any kind in your output. Use commas, periods, or colons instead.
`;

const CHAT_STARTERS = [
  "I don't understand what this phase is asking",
  "Help me find a specific moment",
  "Is my entry honest enough?",
  "Why isn't the charge shifting?",
];

function buildChatSystem(session, phaseKey) {
  const ctx = {
    person: session.person,
    trait: session.trait,
    polarity: session.polarity,
    currentPhase: phaseKey,
    phaseDescription: PHASE_LABELS[phaseKey] || phaseKey,
    entries: session.entries,
    reflection: session.reflection || null,
    done: session.done,
  };
  return `${METHOD_BRIEF}

${CHAT_INSTRUCTIONS}

CURRENT SESSION (JSON)
${JSON.stringify(ctx, null, 2)}`;
}

async function fetchCoachResponse(body) {
  let response;
  try {
    response = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Network request failed. Check your connection and try again.");
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("The coach returned an unreadable response. Try again.");
  }

  if (data && data.error) {
    throw new Error(data.error.message || "The API returned an error. Try again in a moment.");
  }
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}). Try again in a moment.`);
  }

  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("The coach sent back an empty response. Try again.");
  }

  return text;
}

async function askCoach(mode, session, phaseKey) {
  const ctx = {
    person: session.person,
    trait: session.trait,
    polarity: session.polarity,
    currentPhase: phaseKey,
    entries: session.entries,
    reflection: session.reflection || null,
  };
  const prompt = `${METHOD_BRIEF}

CURRENT TASK
${MODE_INSTRUCTIONS[mode]}

SESSION DATA (JSON)
${JSON.stringify(ctx, null, 2)}

Respond ONLY with valid JSON, no markdown fences, no preamble, in this shape:
{"message": "your short reframe or diagnosis", "questions": ["q1", "q2", "q3"]}`;

  const text = await fetchCoachResponse({ prompt });
  const clean = text.replace(/```json|```/g, "").trim();

  // First attempt: parse the whole thing
  try {
    return normalizeCoach(JSON.parse(clean));
  } catch (e) {
    // Second attempt: salvage the first JSON object in the text
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return normalizeCoach(JSON.parse(match[0]));
      } catch (e2) {
        /* fall through */
      }
    }
    // Final fallback: show whatever came back as plain coaching text
    return { message: clean, questions: [] };
  }
}

function normalizeCoach(obj) {
  return {
    message: typeof obj.message === "string" ? obj.message : "",
    questions: Array.isArray(obj.questions) ? obj.questions.filter((q) => typeof q === "string") : [],
  };
}

async function askCoachChat(session, phaseKey, messages) {
  return fetchCoachResponse({
    type: "chat",
    system: buildChatSystem(session, phaseKey),
    messages,
  });
}

// ---------------------------------------------------------------- storage
async function loadSessions() {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
async function saveSessions(sessions) {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error("Save failed", e);
  }
}

function newSession(person, trait, polarity) {
  return {
    id: String(Date.now()),
    person,
    trait,
    polarity,
    createdAt: new Date().toISOString(),
    entries: { own: [], costs: [], benefits: [], opposite: [], fantasy: [] },
    reflection: "",
    done: false,
    coachChat: [],
  };
}

const PHASES = [
  {
    key: "own",
    num: "01",
    title: "Own It",
    tagline: "Face the mirror",
    question:
      "Name real moments you did the same thing. Where, when, and to whom?",
    coach:
      "Vague does not count. One real place, one real date, one real person. Keep stacking reps until I would never do that stops being believable.",
    placeholder: "March 2022, at dinner, to my partner, when I...",
    scan: ["at work", "at home", "with family", "to a stranger", "online", "to yourself"],
  },
  {
    key: "balance",
    num: "02",
    title: "Level It",
    tagline: "Balance the ledger",
    question:
      "List the real costs and real benefits. Both columns must match before you advance.",
    coach:
      "You see one side clearly. That is the bias. Hunt the hidden column until the beam levels.",
    scan: ["resilience built", "dependence avoided", "truth surfaced", "boundaries forced", "drive created", "discernment sharpened"],
  },
  {
    key: "opposite",
    num: "03",
    title: "Find The Other Side",
    tagline: "Widen the lens",
    question:
      "At the exact moment of the charge, who was showing you the opposite? Near or far, real or remembered.",
    coach:
      "If someone criticized you, who was for you in that same window? Write only what you can actually locate.",
    placeholder: "While they tore into me, that morning someone had texted...",
    scan: ["someone present", "someone far away", "a message or call", "a memory you held", "your own inner voice", "several people at once"],
  },
  {
    key: "fantasy",
    num: "04",
    title: "Break The Fantasy",
    tagline: "Price the ideal",
    question:
      "If they had done the exact opposite, what would that have cost you?",
    coach:
      "Pain lives in a one sided fantasy of what should have happened. Price it honestly.",
    placeholder: "If they had always agreed with me, I would never have...",
    scan: ["dependency", "arrested growth", "naivety", "lost drive", "softened standards", "a worse blind spot"],
  },
];

// ---------------------------------------------------------------- beam
function Beam({ left, right, label }) {
  const diff = right - left;
  const angle = Math.max(-16, Math.min(16, diff * 5));
  const leveled = left === right && left >= MIN_ENTRIES;
  return (
    <div className="cl-ui" style={{ textAlign: "center", padding: "16px 0 8px", background: T.surfaceRaised, borderRadius: 16, border: `1px solid ${T.line}`, marginBottom: 8 }}>
      <svg width="260" height="72" viewBox="0 0 260 72" aria-hidden="true" style={{ overflow: "visible" }}>
        <line x1="130" y1="16" x2="130" y2="54" stroke={T.grayDim} strokeWidth="2" />
        <path d="M114 54 L146 54 L138 64 L122 64 Z" fill={T.grayDim} opacity="0.6" />
        <g
          className="cl-beam"
          style={{
            transform: `rotate(${angle}deg)`,
            transformOrigin: "130px 18px",
            transition: "transform .5s cubic-bezier(.34,1.3,.5,1)",
          }}
        >
          <line x1="36" y1="18" x2="224" y2="18" stroke={leveled ? T.volt : T.white} strokeWidth="4" strokeLinecap="round" />
          <circle cx="36" cy="18" r="11" fill={T.heat} />
          <circle cx="224" cy="18" r="11" fill={T.cool} />
          <text x="36" y="22" textAnchor="middle" fill={T.black} fontSize="11" fontWeight="800">{left}</text>
          <text x="224" y="22" textAnchor="middle" fill={T.black} fontSize="11" fontWeight="800">{right}</text>
        </g>
        <circle cx="130" cy="18" r="5" fill={leveled ? T.volt : T.white} />
      </svg>
      <div style={{ fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", color: leveled ? T.volt : T.gray, fontWeight: 700 }}>
        {leveled ? "Leveled up" : label}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- coach panel
function CoachPanel({ session, phaseKey, modes, onUpdate }) {
  const [tab, setTab] = useState("chat");
  const [quickState, setQuickState] = useState({ status: "idle", data: null, error: null, mode: null });
  const [chatInput, setChatInput] = useState("");
  const [chatStatus, setChatStatus] = useState("idle");
  const [chatError, setChatError] = useState(null);
  const chatEndRef = useRef(null);
  const chatMessages = session.coachChat || [];

  useEffect(() => {
    setQuickState({ status: "idle", data: null, error: null, mode: null });
  }, [phaseKey, session.id]);

  useEffect(() => {
    if (tab === "chat") chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length, chatStatus, tab]);

  const runQuick = async (mode) => {
    setQuickState({ status: "loading", data: null, error: null, mode });
    try {
      const data = await askCoach(mode, session, phaseKey);
      setQuickState({ status: "done", data, error: null, mode });
    } catch (e) {
      setQuickState({
        status: "error",
        data: null,
        error: e && e.message ? e.message : "The coach could not respond. Try again in a moment.",
        mode,
      });
    }
  };

  const sendChat = async (text) => {
    const msg = text.trim();
    if (!msg || chatStatus === "loading") return;

    const userMsg = { role: "user", content: msg, at: new Date().toISOString() };
    const withUser = [...chatMessages, userMsg];
    onUpdate({ coachChat: withUser });
    setChatInput("");
    setChatStatus("loading");
    setChatError(null);

    try {
      const reply = await askCoachChat(
        { ...session, coachChat: withUser },
        phaseKey,
        withUser.map((m) => ({ role: m.role, content: m.content }))
      );
      const assistantMsg = { role: "assistant", content: reply, at: new Date().toISOString() };
      onUpdate({ coachChat: [...withUser, assistantMsg] });
      setChatStatus("idle");
    } catch (e) {
      setChatStatus("error");
      setChatError(e && e.message ? e.message : "The coach could not respond. Try again.");
    }
  };

  const quickBtn = (label, mode, disabled, primary) => (
    <button
      key={mode}
      onClick={() => runQuick(mode)}
      disabled={disabled || quickState.status === "loading"}
      className="cl-ui cl-btn"
      style={btnBase({
        background: primary ? T.volt : "transparent",
        border: primary ? "none" : `1px solid ${T.line}`,
        color: primary ? T.black : disabled ? T.grayDim : T.white,
        padding: "10px 18px",
        cursor: disabled || quickState.status === "loading" ? "default" : "pointer",
        opacity: disabled ? 0.45 : 1,
      })}
    >
      {label}
    </button>
  );

  const tabBtn = (id, label) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      className="cl-ui cl-btn"
      style={btnBase({
        background: tab === id ? T.volt : "transparent",
        color: tab === id ? T.black : T.gray,
        border: tab === id ? "none" : `1px solid ${T.line}`,
        padding: "8px 16px",
        fontSize: 11,
      })}
    >
      {label}
    </button>
  );

  return (
    <aside
      aria-label="Coach"
      style={{
        background: `linear-gradient(135deg, ${T.charcoal} 0%, ${T.surface} 100%)`,
        borderRadius: 20,
        padding: "22px 24px",
        marginTop: 28,
        border: `1px solid ${T.line}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${T.volt}, ${T.cool})` }} />
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <p className="cl-display" style={{ margin: 0, fontSize: 28, fontWeight: 800, color: T.white, lineHeight: 1 }}>
            Your Coach
          </p>
          <p className="cl-ui" style={{ margin: "6px 0 0", fontSize: 12, color: T.gray, lineHeight: 1.5 }}>
            Master of the method. Chat anytime for clarity.
          </p>
        </div>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: T.volt, background: T.voltDim, padding: "5px 10px", borderRadius: 99 }}>
          Live
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        {tabBtn("chat", "Chat")}
        {tabBtn("quick", "Quick help")}
      </div>

      {tab === "quick" && (
        <div className="cl-fade">
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            {modes.map((m, i) => quickBtn(m.label, m.mode, m.disabled, i === 0))}
          </div>

          {quickState.status === "loading" && (
            <p className="cl-ui cl-thinking" style={{ color: T.gray, fontSize: 14, marginTop: 16, marginBottom: 0, fontWeight: 500 }}>
              Studying your reps<span>.</span><span>.</span><span>.</span>
            </p>
          )}

          {quickState.status === "error" && (
            <div className="cl-fade" style={{ marginTop: 16 }}>
              <p className="cl-ui" style={{ color: T.heat, fontSize: 14, margin: 0, lineHeight: 1.6 }}>{quickState.error}</p>
              <button
                onClick={() => runQuick(quickState.mode)}
                className="cl-ui cl-btn"
                style={btnBase({ marginTop: 12, background: "transparent", border: `1px solid ${T.line}`, color: T.white, padding: "9px 16px" })}
              >
                Try again
              </button>
            </div>
          )}

          {quickState.status === "done" && quickState.data && (
            <div className="cl-fade" style={{ marginTop: 16 }}>
              {quickState.data.message ? (
                <p className="cl-ui" style={{ color: T.offWhite, fontSize: 15, lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" }}>
                  {quickState.data.message}
                </p>
              ) : null}
              {Array.isArray(quickState.data.questions) && quickState.data.questions.length > 0 && (
                <ol style={{ margin: "14px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                  {quickState.data.questions.map((q, i) => (
                    <li key={i} className="cl-ui" style={{ display: "flex", gap: 12, color: T.white, fontSize: 14, lineHeight: 1.55, background: T.surfaceRaised, borderRadius: 12, padding: "12px 14px", border: `1px solid ${T.line}` }}>
                      <span style={{ color: T.volt, fontWeight: 800, minWidth: 18, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16 }}>{String(i + 1).padStart(2, "0")}</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ol>
              )}
              <p className="cl-ui" style={{ color: T.gray, fontSize: 12, marginTop: 14, marginBottom: 0 }}>
                Answer in the ledger above, or switch to Chat for a deeper conversation.
              </p>
            </div>
          )}
        </div>
      )}

      {tab === "chat" && (
        <div className="cl-fade" style={{ marginTop: 16 }}>
          <div
            className="cl-ui"
            style={{
              maxHeight: 340,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              padding: "4px 2px",
              marginBottom: 12,
            }}
          >
            {chatMessages.length === 0 && (
              <div style={{ textAlign: "center", padding: "20px 12px" }}>
                <p style={{ margin: 0, fontSize: 14, color: T.gray, lineHeight: 1.55 }}>
                  Ask anything about this phase, your entries, or the method. Your coach knows your full ledger.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 14 }}>
                  {CHAT_STARTERS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendChat(s)}
                      disabled={chatStatus === "loading"}
                      className="cl-chip cl-btn"
                      style={{
                        background: T.surfaceRaised,
                        border: `1px solid ${T.line}`,
                        borderRadius: 99,
                        padding: "8px 14px",
                        fontSize: 12,
                        color: T.offWhite,
                        cursor: chatStatus === "loading" ? "default" : "pointer",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatMessages.map((m, i) => (
              <div
                key={i}
                className="cl-fade"
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "88%",
                  background: m.role === "user" ? T.voltDim : T.surfaceRaised,
                  border: `1px solid ${m.role === "user" ? T.volt + "44" : T.line}`,
                  borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  padding: "12px 14px",
                }}
              >
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: m.role === "user" ? T.volt : T.cool, marginBottom: 4 }}>
                  {m.role === "user" ? "You" : "Coach"}
                </p>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: T.offWhite, whiteSpace: "pre-wrap" }}>{m.content}</p>
              </div>
            ))}
            {chatStatus === "loading" && (
              <p className="cl-ui cl-thinking" style={{ color: T.gray, fontSize: 13, margin: "4px 0 0", fontWeight: 500 }}>
                Coach is thinking<span>.</span><span>.</span><span>.</span>
              </p>
            )}
            <div ref={chatEndRef} />
          </div>

          {chatError && (
            <p className="cl-ui" style={{ color: T.heat, fontSize: 13, margin: "0 0 10px", lineHeight: 1.5 }}>{chatError}</p>
          )}

          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendChat(chatInput);
                }
              }}
              placeholder="Ask your coach anything..."
              rows={2}
              disabled={chatStatus === "loading"}
              className="cl-ui"
              style={{
                flex: 1,
                resize: "none",
                border: `1px solid ${T.line}`,
                borderRadius: 14,
                padding: "12px 14px",
                fontSize: 14,
                lineHeight: 1.5,
                background: T.charcoal,
                color: T.white,
              }}
            />
            <button
              onClick={() => sendChat(chatInput)}
              disabled={!chatInput.trim() || chatStatus === "loading"}
              className="cl-ui cl-btn"
              style={btnBase({
                background: chatInput.trim() && chatStatus !== "loading" ? T.volt : T.surfaceRaised,
                color: chatInput.trim() && chatStatus !== "loading" ? T.black : T.grayDim,
                border: "none",
                padding: "12px 20px",
                cursor: chatInput.trim() && chatStatus !== "loading" ? "pointer" : "default",
              })}
            >
              Send
            </button>
          </div>
          {chatMessages.length > 0 && (
            <button
              onClick={() => onUpdate({ coachChat: [] })}
              disabled={chatStatus === "loading"}
              className="cl-ui cl-btn"
              style={{ marginTop: 10, background: "none", border: "none", color: T.grayDim, fontSize: 11, fontWeight: 600, cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase", padding: 0 }}
            >
              Clear chat
            </button>
          )}
        </div>
      )}
    </aside>
  );
}

// ---------------------------------------------------------------- entries
function EntryList({ entries, onRemove, color }) {
  if (!entries.length) return null;
  return (
    <ol style={{ listStyle: "none", margin: "14px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      {entries.map((e, i) => (
        <li
          key={i}
          className="cl-pop"
          style={{
            background: T.surfaceRaised,
            border: `1px solid ${T.line}`,
            borderLeft: `4px solid ${color}`,
            borderRadius: 14,
            padding: "14px 16px",
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <span className="cl-display" style={{ fontSize: 18, fontWeight: 800, color, marginTop: 1, minWidth: 24 }}>
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="cl-ui" style={{ fontSize: 15, lineHeight: 1.55, color: T.offWhite, flex: 1, whiteSpace: "pre-wrap" }}>{e}</span>
          <button
            onClick={() => onRemove(i)}
            aria-label={`Remove entry ${i + 1}`}
            className="cl-ui cl-btn"
            style={{ background: "none", border: "none", color: T.gray, cursor: "pointer", fontSize: 18, padding: 2, lineHeight: 1 }}
          >
            ×
          </button>
        </li>
      ))}
    </ol>
  );
}

function EntryInput({ placeholder, onAdd, color, seed, onSeedUsed, onAdded }) {
  const [val, setVal] = useState("");
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (seed) {
      setVal(seed);
      onSeedUsed && onSeedUsed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);
  const submit = () => {
    const v = val.trim();
    if (!v) return;
    onAdd(v);
    setVal("");
    setFlash(true);
    onAdded && onAdded();
    setTimeout(() => setFlash(false), 1200);
  };
  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginTop: 14, flexDirection: "column" }}>
        <textarea
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          rows={3}
          className="cl-ui"
          style={{
            width: "100%",
            resize: "vertical",
            border: `1px solid ${T.line}`,
            borderRadius: 14,
            padding: "14px 16px",
            fontSize: 15,
            lineHeight: 1.55,
            background: T.charcoal,
            color: T.white,
          }}
        />
        <button
          onClick={submit}
          disabled={!val.trim()}
          className="cl-ui cl-btn"
          style={btnBase({
            alignSelf: "flex-start",
            background: val.trim() ? color : T.surfaceRaised,
            color: val.trim() ? T.black : T.grayDim,
            border: "none",
            padding: "12px 24px",
            cursor: val.trim() ? "pointer" : "default",
          })}
        >
          + Add rep
        </button>
      </div>
      {flash && (
        <p className="cl-pop cl-ui" style={{ margin: "10px 0 0", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.volt }}>
          Rep logged. Keep going.
        </p>
      )}
    </div>
  );
}

function ScanChips({ items, onPick }) {
  return (
    <div className="cl-ui" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14, alignItems: "center" }}>
      <span style={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: T.gray, fontWeight: 700 }}>Quick scan</span>
      {items.map((s) => (
        <button
          key={s}
          onClick={() => onPick(s)}
          className="cl-chip cl-btn"
          style={{
            background: T.surface,
            border: `1px solid ${T.line}`,
            borderRadius: 99,
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 500,
            color: T.gray,
            cursor: "pointer",
          }}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- phase body
function PhaseBody({ phase, session, update }) {
  const ent = session.entries;
  const despise = session.polarity === "despise";
  const [seed, setSeed] = useState({ a: "", b: "" });

  if (phase.key === "balance") {
    const costs = ent.costs;
    const benefits = ent.benefits;
    const blindLabel = despise ? "Hunt the benefits column" : "Hunt the costs column";
    const pct = Math.min(costs.length, benefits.length);
    return (
      <div>
        <Beam left={costs.length} right={benefits.length} label={blindLabel} />
        <div style={{ display: "flex", justifyContent: "center", margin: "8px 0 4px" }}>
          <span className="cl-ui" style={{ fontSize: 12, fontWeight: 600, color: pct >= MIN_ENTRIES && costs.length === benefits.length ? T.volt : T.gray }}>
            {costs.length} costs · {benefits.length} benefits · need {MIN_ENTRIES} each, matched
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20, marginTop: 8 }} className="cl-balance-grid">
          <style>{`@media (min-width: 700px){ .cl-balance-grid { grid-template-columns: 1fr 1fr !important; } }`}</style>
          <section style={{ background: T.surface, borderRadius: 16, padding: 18, border: `1px solid ${T.line}` }}>
            <h3 className="cl-display" style={{ fontSize: 20, fontWeight: 800, color: T.heat, margin: "0 0 6px" }}>
              Costs
            </h3>
            <p className="cl-ui" style={{ fontSize: 13, color: T.gray, margin: 0, lineHeight: 1.5 }}>
              {despise ? "Comes easy. Log it, then earn the other side." : "Hidden by admiration. Dig here."}
            </p>
            <EntryInput placeholder="It cost me..." color={T.heat} seed={seed.a} onSeedUsed={() => setSeed((s) => ({ ...s, a: "" }))}
              onAdd={(v) => update({ entries: { ...ent, costs: [...costs, v] } })} />
            <EntryList entries={costs} color={T.heat} onRemove={(i) => update({ entries: { ...ent, costs: costs.filter((_, j) => j !== i) } })} />
          </section>
          <section style={{ background: T.surface, borderRadius: 16, padding: 18, border: `1px solid ${T.line}` }}>
            <h3 className="cl-display" style={{ fontSize: 20, fontWeight: 800, color: T.cool, margin: "0 0 6px" }}>
              Benefits
            </h3>
            <p className="cl-ui" style={{ fontSize: 13, color: T.gray, margin: 0, lineHeight: 1.5 }}>
              {despise ? "Hidden by resentment. Who did this strengthen?" : "Comes easy. Log it, then earn the other side."}
            </p>
            <EntryInput placeholder="It served by..." color={T.cool} seed={seed.b} onSeedUsed={() => setSeed((s) => ({ ...s, b: "" }))}
              onAdd={(v) => update({ entries: { ...ent, benefits: [...benefits, v] } })} />
            <EntryList entries={benefits} color={T.cool} onRemove={(i) => update({ entries: { ...ent, benefits: benefits.filter((_, j) => j !== i) } })} />
            <ScanChips items={phase.scan} onPick={(s) => setSeed((x) => ({ ...x, b: s + ": " }))} />
          </section>
        </div>
      </div>
    );
  }

  const key = phase.key;
  const list = ent[key];
  const color = key === "own" ? T.heat : key === "opposite" ? T.cool : T.volt;
  const remaining = Math.max(0, MIN_ENTRIES - list.length);
  return (
    <div style={{ background: T.surface, borderRadius: 16, padding: 20, border: `1px solid ${T.line}` }}>
      <EntryInput placeholder={phase.placeholder} color={color} seed={seed.a} onSeedUsed={() => setSeed((s) => ({ ...s, a: "" }))}
        onAdd={(v) => update({ entries: { ...ent, [key]: [...list, v] } })} />
      <ScanChips items={phase.scan} onPick={(s) => setSeed((x) => ({ ...x, a: s + ": " }))} />
      <EntryList entries={list} color={color} onRemove={(i) => update({ entries: { ...ent, [key]: list.filter((_, j) => j !== i) } })} />
      <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <ProgressBar value={Math.round((list.length / MIN_ENTRIES) * 100)} label="Phase reps" accent={color} />
        </div>
        {remaining > 0 && (
          <span className="cl-ui" style={{ fontSize: 11, fontWeight: 700, color: T.gray, whiteSpace: "nowrap", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {remaining} more
          </span>
        )}
      </div>
    </div>
  );
}

function phaseComplete(phase, session) {
  return getPhaseProceedStatus(phase, session).ready;
}

function phaseEntryCount(phase, session) {
  const e = session.entries;
  if (phase.key === "balance") return e.costs.length + e.benefits.length;
  return e[phase.key].length;
}

function getPhaseProceedStatus(phase, session) {
  const e = session.entries;

  if (phase.key === "balance") {
    const costs = e.costs.length;
    const benefits = e.benefits.length;
    const criteria = [
      { label: `At least ${MIN_ENTRIES} costs logged`, met: costs >= MIN_ENTRIES, detail: `${costs} of ${MIN_ENTRIES}` },
      { label: `At least ${MIN_ENTRIES} benefits logged`, met: benefits >= MIN_ENTRIES, detail: `${benefits} of ${MIN_ENTRIES}` },
      { label: "Both columns equal count", met: costs === benefits && costs >= MIN_ENTRIES, detail: costs === benefits ? `${costs} each` : `${costs} costs, ${benefits} benefits` },
    ];
    const ready = criteria.every((c) => c.met);
    const nextPhase = PHASES[PHASES.findIndex((p) => p.key === phase.key) + 1];
    return {
      ready,
      criteria,
      headline: ready ? "Ready to advance" : "Not ready yet",
      message: ready
        ? "Your ledger is leveled. Move on when the entries feel honest, not just complete."
        : !criteria[0].met
          ? `Add ${MIN_ENTRIES - costs} more cost ${MIN_ENTRIES - costs === 1 ? "entry" : "entries"} to continue.`
          : !criteria[1].met
            ? `Add ${MIN_ENTRIES - benefits} more benefit ${MIN_ENTRIES - benefits === 1 ? "entry" : "entries"} to continue.`
            : "Balance the columns: add matching entries until costs and benefits are equal.",
      nextLabel: ready ? `Continue to ${nextPhase?.title || "next round"} →` : "Skip ahead anyway",
      tip: ready ? "You can stay and add more if the charge still feels active." : null,
    };
  }

  const count = e[phase.key].length;
  const criteria = [
    { label: `At least ${MIN_ENTRIES} specific moments`, met: count >= MIN_ENTRIES, detail: `${count} of ${MIN_ENTRIES}` },
    { label: "Each moment names where, when, and to whom", met: null, detail: "Check your entries" },
  ];
  const ready = count >= MIN_ENTRIES;
  const nextPhase = PHASES[PHASES.findIndex((p) => p.key === phase.key) + 1];
  const remaining = Math.max(0, MIN_ENTRIES - count);

  return {
    ready,
    criteria,
    headline: ready ? "Ready to advance" : "Not ready yet",
    message: ready
      ? "Minimum reps met. Proceed when revisiting these moments softens the charge, not just when the list looks full."
      : `Add ${remaining} more specific ${remaining === 1 ? "moment" : "moments"} before this round is complete.`,
    nextLabel: ready ? `Continue to ${nextPhase?.title || "next round"} →` : "Skip ahead anyway",
    tip: ready ? "More reps are fine if you are still activated. Ask the coach if unsure." : "Each entry needs a real place, date, and person.",
  };
}

function ProceedPanel({ phase, session }) {
  const status = getPhaseProceedStatus(phase, session);
  return (
    <div
      className="cl-fade"
      style={{
        marginTop: 24,
        borderRadius: 18,
        padding: "18px 20px",
        border: `2px solid ${status.ready ? T.volt : T.line}`,
        background: status.ready ? T.voltDim : T.surface,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <p className="cl-display" style={{ margin: 0, fontSize: 18, fontWeight: 800, color: status.ready ? T.volt : T.white }}>
          {status.headline}
        </p>
        <span
          className="cl-ui"
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: status.ready ? T.black : T.gray,
            background: status.ready ? T.volt : T.surfaceRaised,
            padding: "5px 10px",
            borderRadius: 99,
          }}
        >
          {status.ready ? "Clear to proceed" : "Keep working"}
        </span>
      </div>

      <p className="cl-ui" style={{ margin: "10px 0 14px", fontSize: 14, lineHeight: 1.6, color: status.ready ? T.offWhite : T.gray }}>
        {status.message}
      </p>

      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
        {status.criteria.map((c) => (
          <li key={c.label} className="cl-ui" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: 99,
                display: "grid",
                placeItems: "center",
                fontSize: 11,
                fontWeight: 800,
                flexShrink: 0,
                background: c.met === true ? T.volt : c.met === false ? T.surfaceRaised : "transparent",
                color: c.met === true ? T.black : T.gray,
                border: `2px solid ${c.met === true ? T.volt : c.met === false ? T.heat : T.grayDim}`,
              }}
            >
              {c.met === true ? "✓" : c.met === false ? "!" : "?"}
            </span>
            <span style={{ color: c.met === true ? T.white : T.gray, flex: 1 }}>{c.label}</span>
            <span style={{ color: T.grayDim, fontSize: 12, fontWeight: 600 }}>{c.detail}</span>
          </li>
        ))}
      </ul>

      {status.tip && (
        <p className="cl-ui" style={{ margin: "12px 0 0", fontSize: 12, color: T.gray, lineHeight: 1.5, fontStyle: "italic" }}>
          {status.tip}
        </p>
      )}
    </div>
  );
}

function getCompletionProceedStatus(session) {
  const phaseChecks = PHASES.map((p) => ({
    label: p.title,
    met: phaseComplete(p, session),
    detail: phaseComplete(p, session) ? "Complete" : "Go back and finish",
  }));
  const hasReflection = !!session.reflection.trim();
  const allPhases = phaseChecks.every((c) => c.met);
  const criteria = [
    ...phaseChecks,
    { label: "Write your charge test reflection", met: hasReflection, detail: hasReflection ? "Written" : "Required below" },
    { label: "Revisit memory: gratitude, not activation", met: null, detail: "Self check" },
  ];
  const ready = allPhases && hasReflection;
  return {
    ready,
    criteria,
    headline: session.done ? "Session complete" : ready ? "Ready to close out" : "Finish remaining rounds first",
    message: session.done
      ? "You marked this charge cleared. Review anytime or start a new session."
      : !allPhases
        ? "Complete all four rounds before the charge test counts."
        : !hasReflection
          ? "Close your eyes, revisit the memory, then write what you feel now."
          : "If the memory brings gratitude or neutrality, mark complete. If still activated, go back or ask the coach.",
    canMarkComplete: ready,
  };
}

// ---------------------------------------------------------------- completion
function Completion({ session, update, onHome }) {
  const e = session.entries;
  const completionStatus = getCompletionProceedStatus(session);
  return (
    <div className="cl-fade">
      <p className="cl-ui" style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: T.volt }}>
        Final round
      </p>
      <h2 className="cl-display" style={{ fontSize: 48, fontWeight: 800, margin: "6px 0 10px", color: T.white, lineHeight: 0.95 }}>
        The Charge Test
      </h2>
      <p className="cl-ui" style={{ fontSize: 15, color: T.gray, lineHeight: 1.65, maxWidth: 560 }}>
        Close your eyes. Return to the moment with {session.person}. Hold everything at once: costs and benefits, opposition and support, reality and fantasy. Then answer honestly.
      </p>

      <div
        style={{
          marginTop: 20,
          borderRadius: 18,
          padding: "18px 20px",
          border: `2px solid ${completionStatus.ready ? T.volt : T.line}`,
          background: completionStatus.ready ? T.voltDim : T.surface,
        }}
      >
        <p className="cl-display" style={{ margin: 0, fontSize: 18, fontWeight: 800, color: completionStatus.ready ? T.volt : T.white }}>
          {completionStatus.headline}
        </p>
        <p className="cl-ui" style={{ margin: "10px 0 14px", fontSize: 14, lineHeight: 1.6, color: completionStatus.ready ? T.offWhite : T.gray }}>
          {completionStatus.message}
        </p>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
          {completionStatus.criteria.map((c) => (
            <li key={c.label} className="cl-ui" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
              <span
                style={{
                  width: 20, height: 20, borderRadius: 99, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800, flexShrink: 0,
                  background: c.met === true ? T.volt : c.met === false ? T.surfaceRaised : "transparent",
                  color: c.met === true ? T.black : T.gray,
                  border: `2px solid ${c.met === true ? T.volt : c.met === false ? T.heat : T.grayDim}`,
                }}
              >
                {c.met === true ? "✓" : c.met === false ? "!" : "?"}
              </span>
              <span style={{ color: c.met === true ? T.white : T.gray, flex: 1 }}>{c.label}</span>
              <span style={{ color: T.grayDim, fontSize: 12, fontWeight: 600 }}>{c.detail}</span>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 20, padding: 22, margin: "22px 0" }}>
        <p className="cl-ui" style={{ fontSize: 15, fontWeight: 700, color: T.white, margin: "0 0 10px" }}>
          When you revisit the memory now, what do you feel?
        </p>
        <textarea
          value={session.reflection}
          onChange={(ev) => update({ reflection: ev.target.value })}
          rows={4}
          placeholder="Write what is actually here now..."
          className="cl-ui"
          style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${T.line}`, borderRadius: 14, padding: "14px 16px", fontSize: 15, lineHeight: 1.55, background: T.charcoal, color: T.white, resize: "vertical" }}
        />
        <p className="cl-ui" style={{ margin: "16px 0 0", fontSize: 12, color: T.gray, lineHeight: 1.5 }}>
          {completionStatus.canMarkComplete
            ? "Mark complete only if revisiting the memory feels clear, not if you are filling the form."
            : "Finish the checklist above before marking this session complete."}
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
          <button
            onClick={() => update({ done: true })}
            disabled={!completionStatus.canMarkComplete}
            className="cl-ui cl-btn"
            style={btnBase({
              background: completionStatus.canMarkComplete ? T.volt : T.surfaceRaised,
              color: completionStatus.canMarkComplete ? T.black : T.grayDim,
              border: "none",
              padding: "13px 22px",
              cursor: completionStatus.canMarkComplete ? "pointer" : "default",
              boxShadow: completionStatus.canMarkComplete ? `0 0 24px ${T.volt}44` : "none",
            })}
          >
            Charge cleared
          </button>
          <button
            onClick={() => update({ done: false })}
            className="cl-ui cl-btn"
            style={btnBase({ background: "transparent", color: T.white, border: `1px solid ${T.line}`, padding: "13px 22px" })}
          >
            Still activated, go deeper
          </button>
        </div>
        {session.done && (
          <div className="cl-pop" style={{ marginTop: 16, background: T.voltDim, borderRadius: 12, padding: "14px 16px", border: `1px solid ${T.volt}44` }}>
            <p className="cl-display" style={{ fontSize: 22, color: T.volt, fontWeight: 800, margin: 0 }}>
              Session complete
            </p>
            <p className="cl-ui" style={{ fontSize: 13, color: T.offWhite, margin: "6px 0 0", lineHeight: 1.5 }}>
              Gratitude where there was charge. That is the win.
            </p>
          </div>
        )}
      </div>

      <CoachPanel
        session={session}
        phaseKey="completion"
        modes={[{ label: "Diagnose remaining charge", mode: "charge", disabled: !session.reflection.trim() }]}
        onUpdate={update}
      />

      <div style={{ background: T.surfaceRaised, borderRadius: 16, padding: 18, marginTop: 20, border: `1px solid ${T.line}` }}>
        <p className="cl-display" style={{ fontSize: 16, fontWeight: 800, color: T.gray, margin: "0 0 10px" }}>
          Your stats
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }} className="cl-stats-grid">
          <style>{`@media (min-width: 500px){ .cl-stats-grid { grid-template-columns: repeat(4, 1fr) !important; } }`}</style>
          {[
            { n: e.own.length, label: "Owned" },
            { n: e.costs.length + e.benefits.length, label: "Balanced" },
            { n: e.opposite.length, label: "Opposites" },
            { n: e.fantasy.length, label: "Fantasies" },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: "center", background: T.surface, borderRadius: 12, padding: "12px 8px" }}>
              <p className="cl-display" style={{ margin: 0, fontSize: 28, color: T.volt, fontWeight: 800 }}>{s.n}</p>
              <p className="cl-ui" style={{ margin: "2px 0 0", fontSize: 10, color: T.gray, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
      <button onClick={onHome} className="cl-ui cl-btn" style={{ marginTop: 22, background: "none", border: "none", color: T.volt, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        ← All sessions
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- new session
function NewSession({ onCreate, onCancel, hasSessions }) {
  const [person, setPerson] = useState("");
  const [trait, setTrait] = useState("");
  const [polarity, setPolarity] = useState("despise");
  const ready = person.trim() && trait.trim();
  const inputStyle = {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    marginTop: 8,
    border: `1px solid ${T.line}`,
    borderRadius: 14,
    padding: "14px 16px",
    fontSize: 15,
    background: T.charcoal,
    color: T.white,
  };
  return (
    <div className="cl-fade">
      <div style={{ background: `linear-gradient(135deg, ${T.charcoal}, ${T.surface})`, borderRadius: 24, padding: "32px 28px", border: `1px solid ${T.line}`, marginBottom: 28, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -20, top: -20, width: 140, height: 140, borderRadius: "50%", background: T.voltDim, filter: "blur(40px)" }} />
        <p className="cl-ui" style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: T.volt }}>
          Mental training
        </p>
        <h2 className="cl-display" style={{ fontSize: 56, fontWeight: 800, margin: "8px 0 10px", color: T.white, lineHeight: 0.92, maxWidth: 480 }}>
          Balance The Charge
        </h2>
        <p className="cl-ui" style={{ fontSize: 15, color: T.gray, lineHeight: 1.65, maxWidth: 480, margin: 0 }}>
          One person. One trait. Four rounds of honest reps. Someone you resent or someone on a pedestal. Both are running you.
        </p>
      </div>

      <div style={{ maxWidth: 560 }}>
        <label className="cl-ui" style={{ display: "block", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.gray, marginTop: 4 }}>
          Who holds the charge?
          <input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Name or initials" style={inputStyle} />
        </label>
        <label className="cl-ui" style={{ display: "block", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.gray, marginTop: 18 }}>
          What trait or action?
          <input value={trait} onChange={(e) => setTrait(e.target.value)} placeholder="Dismisses my work in front of others" style={inputStyle} />
        </label>
        <p className="cl-ui" style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.gray, margin: "18px 0 10px" }}>
          Your charge type
        </p>
        <div className="cl-ui" style={{ display: "flex", gap: 10 }}>
          {[
            { v: "despise", label: "I resent it", sub: "They are below", c: T.heat, cs: T.heatDim },
            { v: "admire", label: "I admire it", sub: "They are above", c: T.cool, cs: T.coolDim },
          ].map((o) => (
            <button key={o.v} onClick={() => setPolarity(o.v)} className="cl-btn"
              style={{
                flex: 1, padding: "14px 16px", borderRadius: 16, cursor: "pointer", textAlign: "left",
                border: `2px solid ${polarity === o.v ? o.c : T.line}`,
                background: polarity === o.v ? o.cs : T.surface,
              }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: polarity === o.v ? o.c : T.white }}>{o.label}</span>
              <span style={{ display: "block", fontSize: 11, color: T.gray, marginTop: 2 }}>{o.sub}</span>
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
          <button disabled={!ready} onClick={() => onCreate(person.trim(), trait.trim(), polarity)} className="cl-ui cl-btn"
            style={btnBase({ background: ready ? T.volt : T.surfaceRaised, color: ready ? T.black : T.grayDim, border: "none", padding: "14px 28px", cursor: ready ? "pointer" : "default" })}>
            Start training
          </button>
          {hasSessions && (
            <button onClick={onCancel} className="cl-ui cl-btn"
              style={btnBase({ background: "transparent", border: `1px solid ${T.line}`, color: T.white, padding: "14px 22px" })}>
              Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- app
export default function ChargeLedger() {
  const [sessions, setSessions] = useState(null);
  const [view, setView] = useState("home");
  const [activeId, setActiveId] = useState(null);
  const [step, setStep] = useState(0); // 0..3 phases, 4 completion
  const loadedRef = useRef(false);

  useEffect(() => {
    loadSessions().then((s) => {
      setSessions(s);
      loadedRef.current = true;
      if (!s.length) setView("new");
    });
  }, []);

  useEffect(() => {
    if (loadedRef.current && sessions) saveSessions(sessions);
  }, [sessions]);

  if (!sessions) {
    return (
      <div className="cl-ui" style={{ minHeight: "100vh", background: T.black, display: "grid", placeItems: "center", color: T.gray, fontSize: 14, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
        <style>{FONT_CSS}</style>
        <div style={{ textAlign: "center" }}>
          <p className="cl-display" style={{ fontSize: 32, color: T.volt, margin: "0 0 8px", fontWeight: 800 }}>Charge Ledger</p>
          Loading your reps...
        </div>
      </div>
    );
  }

  const active = sessions.find((s) => s.id === activeId);
  const update = (patch) =>
    setSessions((prev) => prev.map((s) => (s.id === activeId ? { ...s, ...patch } : s)));

  const openSession = (id) => {
    setActiveId(id);
    setStep(0);
    setView("session");
  };

  const create = (person, trait, polarity) => {
    const s = newSession(person, trait, polarity);
    setSessions((prev) => [s, ...prev]);
    setActiveId(s.id);
    setStep(0);
    setView("session");
  };

  const remove = (id) => setSessions((prev) => prev.filter((s) => s.id !== id));

  const completedCount = sessions.filter((s) => s.done).length;
  const activeProgress = active ? sessionProgress(active) : 0;

  return (
    <div style={{ minHeight: "100vh", background: T.black, color: T.white, padding: "0 0 100px" }}>
      <style>{FONT_CSS}</style>

      <header className="cl-sticky-bar" style={{ borderBottom: `1px solid ${T.line}`, background: "rgba(10,10,10,0.85)" }}>
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <button onClick={() => setView(sessions.length ? "home" : "new")} className="cl-btn" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}>
            <span className="cl-display" style={{ fontSize: 28, fontWeight: 800, color: T.white, lineHeight: 1 }}>Charge Ledger</span>
            <span className="cl-ui" style={{ display: "block", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: T.volt, fontWeight: 700, marginTop: 2 }}>
              Train your perception
            </span>
          </button>
          {view === "session" && active && (
            <div style={{ minWidth: 140, flex: "1 1 140px", maxWidth: 220 }}>
              <ProgressBar value={activeProgress} label="Session" />
            </div>
          )}
          {view === "home" && sessions.length > 0 && (
            <button onClick={() => setView("new")} className="cl-ui cl-btn"
              style={btnBase({ background: T.volt, color: T.black, border: "none", padding: "10px 20px" })}>
              New session
            </button>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 920, margin: "0 auto", padding: "36px 20px 0" }}>
        {view === "new" && <NewSession onCreate={create} onCancel={() => setView("home")} hasSessions={sessions.length > 0} />}

        {view === "home" && (
          <div className="cl-fade">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 8 }}>
              <div>
                <h2 className="cl-display" style={{ fontSize: 48, fontWeight: 800, margin: 0, lineHeight: 0.95 }}>Your Sessions</h2>
                <p className="cl-ui" style={{ fontSize: 14, color: T.gray, margin: "10px 0 0", lineHeight: 1.5 }}>
                  {completedCount} completed · {sessions.length} total · auto saved
                </p>
              </div>
            </div>
            <p className="cl-ui" style={{ fontSize: 14, color: T.gray, maxWidth: 520, lineHeight: 1.65, margin: "0 0 24px" }}>
              Pick up where you left off. A charge is cleared when revisiting the memory brings gratitude, not activation.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {sessions.map((s) => {
                const pct = sessionProgress(s);
                const accent = s.done ? T.volt : s.polarity === "despise" ? T.heat : T.cool;
                return (
                  <div key={s.id} className="cl-card cl-fade" style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, padding: "18px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", transition: "border-color .2s ease" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                        <p className="cl-ui" style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{s.person}</p>
                        {s.done && (
                          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", background: T.voltDim, color: T.volt, padding: "3px 8px", borderRadius: 99 }}>Done</span>
                        )}
                      </div>
                      <p className="cl-ui" style={{ margin: 0, fontSize: 14, color: T.gray, lineHeight: 1.4 }}>
                        <span style={{ color: accent, fontWeight: 600 }}>{s.polarity === "despise" ? "Resent" : "Admire"}</span> · {s.trait}
                      </p>
                      <div style={{ marginTop: 10, maxWidth: 280 }}>
                        <ProgressBar value={pct} accent={accent} />
                      </div>
                    </div>
                    <button onClick={() => openSession(s.id)} className="cl-ui cl-btn"
                      style={btnBase({ background: s.done ? "transparent" : T.volt, color: s.done ? T.white : T.black, border: s.done ? `1px solid ${T.line}` : "none", padding: "10px 20px" })}>
                      {s.done ? "Review" : "Continue"}
                    </button>
                    <button onClick={() => remove(s.id)} aria-label="Delete session" className="cl-ui cl-btn"
                      style={{ background: "none", border: "none", color: T.grayDim, fontSize: 12, fontWeight: 600, cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      Delete
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === "session" && active && (
          <div>
            <div className="cl-ui" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 24, background: T.surface, borderRadius: 16, padding: "14px 18px", border: `1px solid ${T.line}` }}>
              <div>
                <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.gray, fontWeight: 700 }}>Active target</p>
                <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 700 }}>
                  {active.person} · <span style={{ color: active.polarity === "despise" ? T.heat : T.cool }}>{active.trait}</span>
                </p>
              </div>
              <button onClick={() => setView("home")} className="cl-ui cl-btn" style={{ background: "none", border: "none", color: T.volt, fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                All sessions
              </button>
            </div>

            <nav className="cl-ui" aria-label="Phases" style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              {[...PHASES.map((p, i) => ({ label: p.num, title: p.title, i })), { label: "05", title: "Test", i: 4 }].map((tab) => {
                const isDone = tab.i < 4 ? phaseComplete(PHASES[tab.i], active) : active.done;
                const isCurrent = step === tab.i;
                return (
                  <button key={tab.i} onClick={() => setStep(tab.i)} aria-current={isCurrent ? "step" : undefined} className="cl-btn"
                    title={isDone ? `${tab.title}: complete` : `${tab.title}: in progress`}
                    style={{
                      minWidth: 52, height: 44, borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: "pointer",
                      fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.04em",
                      border: `2px solid ${isCurrent ? T.volt : isDone ? T.volt + "66" : T.line}`,
                      background: isCurrent ? T.voltDim : isDone ? "rgba(212,255,0,0.08)" : T.surface,
                      color: isCurrent ? T.volt : isDone ? T.volt : T.grayDim,
                      position: "relative",
                    }}>
                    {isDone ? "✓" : tab.label}
                  </button>
                );
              })}
            </nav>
            {step < 4 && (
              <p className="cl-ui" style={{ margin: "0 0 20px", fontSize: 12, color: T.gray, lineHeight: 1.5 }}>
                {phaseComplete(PHASES[step], active)
                  ? "This round is complete. Use the panel below or the sticky button when you are ready to move on."
                  : `Complete the checklist below to unlock the next round. Minimum: ${MIN_ENTRIES} honest reps per phase.`}
              </p>
            )}

            {step < 4 ? (
              <div className="cl-fade" key={step}>
                <p className="cl-ui" style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: T.volt }}>
                  Round {PHASES[step].num} · {PHASES[step].tagline}
                </p>
                <h2 className="cl-display" style={{ fontSize: 52, fontWeight: 800, margin: "6px 0 12px", lineHeight: 0.95 }}>
                  {PHASES[step].title}
                </h2>
                <p className="cl-ui" style={{ fontSize: 17, fontWeight: 500, color: T.offWhite, lineHeight: 1.55, maxWidth: 640, margin: 0 }}>
                  {PHASES[step].question}
                </p>
                <p className="cl-ui" style={{ fontSize: 14, color: T.gray, lineHeight: 1.65, maxWidth: 640, margin: "14px 0 6px", padding: "12px 16px", background: T.surface, borderRadius: 12, borderLeft: `3px solid ${T.volt}` }}>
                  {PHASES[step].coach}
                </p>

                <PhaseBody phase={PHASES[step]} session={active} update={update} />

                <ProceedPanel phase={PHASES[step]} session={active} />

                <CoachPanel
                  session={active}
                  phaseKey={PHASES[step].key}
                  modes={[
                    { label: "I'm stuck", mode: "stuck", disabled: false },
                    { label: "Pressure test", mode: "pressure", disabled: phaseEntryCount(PHASES[step], active) === 0 },
                  ]}
                  onUpdate={update}
                />

                {(() => {
                  const proceed = getPhaseProceedStatus(PHASES[step], active);
                  return (
                    <div className="cl-sticky-bar" style={{ marginTop: 32, padding: "14px 0 18px", background: "rgba(10,10,10,0.92)", borderTop: `1px solid ${proceed.ready ? T.volt + "55" : T.line}`, bottom: 0 }}>
                      <p className="cl-ui" style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 600, color: proceed.ready ? T.volt : T.gray, textAlign: "center", letterSpacing: "0.04em" }}>
                        {proceed.ready ? "Requirements met. Tap below when you are ready for the next round." : proceed.message}
                      </p>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="cl-ui cl-btn"
                          style={btnBase({ background: "transparent", border: `1px solid ${T.line}`, color: step === 0 ? T.grayDim : T.white, padding: "12px 22px", cursor: step === 0 ? "default" : "pointer" })}>
                          Back
                        </button>
                        <button onClick={() => setStep(step + 1)} className="cl-ui cl-btn"
                          style={btnBase({
                            background: proceed.ready ? T.volt : "transparent",
                            color: proceed.ready ? T.black : T.grayDim,
                            border: `2px solid ${proceed.ready ? T.volt : T.line}`,
                            padding: "12px 28px",
                            boxShadow: proceed.ready ? `0 0 24px ${T.volt}44` : "none",
                          })}>
                          {proceed.nextLabel}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <Completion session={active} update={update} onHome={() => setView("home")} />
            )}
          </div>
        )}
      </main>

      <footer className="cl-ui" style={{ maxWidth: 920, margin: "56px auto 0", padding: "0 20px" }}>
        <p style={{ fontSize: 11, color: T.grayDim, lineHeight: 1.65, borderTop: `1px solid ${T.line}`, paddingTop: 18 }}>
          A self reflection tool, not therapy. For trauma involving abuse or assault, work with a trauma informed professional. Inspired by the publicly described structure of the Demartini Method.
        </p>
      </footer>
    </div>
  );
}
