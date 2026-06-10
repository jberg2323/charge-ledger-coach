"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import GroundingModal from "./grounding-modal";
import {
  MIN_ENTRIES,
  PHASES,
  PHASE_LABELS,
  TRAIT_CHIPS,
  detectPatterns,
  downloadLedgerExport,
  getCompletionProceedStatus,
  getPhaseProceedStatus,
  getResumeSession,
  loadSessions,
  newSession,
  phaseComplete,
  phaseEntryCount,
  saveSessions,
  sessionProgress,
} from "../lib/session-utils";

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

function ChargeSlider({ value, onChange, label, hint }) {
  return (
    <div className="cl-ui" style={{ marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.gray }}>{label}</span>
        <span className="cl-display" style={{ fontSize: 28, fontWeight: 800, color: T.volt }}>{value ?? "—"}/10</span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={value ?? 5}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: T.volt }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.grayDim, marginTop: 4 }}>
        <span>Calm</span>
        <span>Activated</span>
      </div>
      {hint && <p style={{ margin: "8px 0 0", fontSize: 12, color: T.gray, lineHeight: 1.5 }}>{hint}</p>}
    </div>
  );
}

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
  const color = key === "own" ? T.heat : key === "opposite" ? T.cool : key === "values" ? T.cool : T.volt;
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
        Close your eyes. Return to the moment with {session.person}. Hold everything at once: costs and benefits, opposition and support, reality and fantasy, their values and yours. Then answer honestly.
      </p>
      {session.chargeStart !== null && (
        <p className="cl-ui" style={{ margin: "12px 0 0", fontSize: 13, color: T.gray }}>
          You started at <strong style={{ color: T.heat }}>{session.chargeStart}/10</strong> activation. Rate again below to measure the shift.
        </p>
      )}

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
        <ChargeSlider
          value={session.chargeEnd}
          onChange={(v) => update({ chargeEnd: v })}
          label="Activation now (0 to 10)"
          hint="Compare to where you started. A real shift usually shows up here."
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
          <style>{`@media (min-width: 500px){ .cl-stats-grid { grid-template-columns: repeat(5, 1fr) !important; } }`}</style>
          {[
            { n: e.own.length, label: "Owned" },
            { n: e.costs.length + e.benefits.length, label: "Balanced" },
            { n: e.opposite.length, label: "Opposites" },
            { n: e.fantasy.length, label: "Fantasies" },
            { n: e.values?.length || 0, label: "Values" },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: "center", background: T.surface, borderRadius: 12, padding: "12px 8px" }}>
              <p className="cl-display" style={{ margin: 0, fontSize: 28, color: T.volt, fontWeight: 800 }}>{s.n}</p>
              <p className="cl-ui" style={{ margin: "2px 0 0", fontSize: 10, color: T.gray, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 22, flexWrap: "wrap" }}>
        <button onClick={() => downloadLedgerExport(session)} className="cl-ui cl-btn"
          style={btnBase({ background: "transparent", border: `1px solid ${T.line}`, color: T.white, padding: "11px 20px" })}>
          Export ledger
        </button>
        <button onClick={onHome} className="cl-ui cl-btn" style={{ background: "none", border: "none", color: T.volt, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: "11px 0", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          ← All sessions
        </button>
      </div>
    </div>
  );
}

function getResumeStep(session) {
  for (let i = 0; i < PHASES.length; i++) {
    if (!phaseComplete(PHASES[i], session)) return i;
  }
  return PHASES.length;
}

// ---------------------------------------------------------------- new session
function NewSession({ onCreate, onCancel, hasSessions }) {
  const [wizardStep, setWizardStep] = useState(0);
  const [person, setPerson] = useState("");
  const [trait, setTrait] = useState("");
  const [polarity, setPolarity] = useState("despise");
  const [originMemory, setOriginMemory] = useState("");
  const [chargeStart, setChargeStart] = useState(7);
  const [why, setWhy] = useState("");
  const [cost, setCost] = useState("");
  const [ifCleared, setIfCleared] = useState("");

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

  const step0Ready = person.trim() && trait.trim();
  const step1Ready = originMemory.trim().length > 20;
  const step2Ready = why.trim() && cost.trim();

  const finish = () => {
    onCreate({
      person: person.trim(),
      trait: trait.trim(),
      polarity,
      originMemory: originMemory.trim(),
      chargeStart,
      preCommitment: { why: why.trim(), cost: cost.trim(), ifCleared: ifCleared.trim() },
    });
  };

  return (
    <div className="cl-fade">
      <div style={{ background: `linear-gradient(135deg, ${T.charcoal}, ${T.surface})`, borderRadius: 24, padding: "32px 28px", border: `1px solid ${T.line}`, marginBottom: 28, position: "relative", overflow: "hidden" }}>
        <p className="cl-ui" style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: T.volt }}>
          Step {wizardStep + 1} of 3
        </p>
        <h2 className="cl-display" style={{ fontSize: 48, fontWeight: 800, margin: "8px 0 10px", color: T.white, lineHeight: 0.92 }}>
          {wizardStep === 0 ? "Name The Charge" : wizardStep === 1 ? "Anchor The Scene" : "Commit To The Work"}
        </h2>
        <p className="cl-ui" style={{ fontSize: 15, color: T.gray, lineHeight: 1.65, margin: 0, maxWidth: 480 }}>
          {wizardStep === 0 && "One person. One trait. Five rounds. Someone you resent or someone on a pedestal."}
          {wizardStep === 1 && "Lock in the exact moment this started running you. Where, when, what happened, who saw."}
          {wizardStep === 2 && "Put a stake in the ground. This is why the work matters and what shifts if you clear it."}
        </p>
      </div>

      <div style={{ maxWidth: 560 }}>
        {wizardStep === 0 && (
          <>
            <label className="cl-ui" style={{ display: "block", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.gray }}>
              Who holds the charge?
              <input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Name or initials" style={inputStyle} />
            </label>
            <label className="cl-ui" style={{ display: "block", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.gray, marginTop: 18 }}>
              What trait or action?
              <input value={trait} onChange={(e) => setTrait(e.target.value)} placeholder="Or pick a common pattern below" style={inputStyle} />
            </label>
            <div className="cl-ui" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              {TRAIT_CHIPS.map((t) => (
                <button key={t} type="button" onClick={() => setTrait(t)} className="cl-chip cl-btn"
                  style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 99, padding: "6px 12px", fontSize: 12, color: T.gray, cursor: "pointer" }}>
                  {t}
                </button>
              ))}
            </div>
            <p className="cl-ui" style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.gray, margin: "18px 0 10px" }}>Your charge type</p>
            <div className="cl-ui" style={{ display: "flex", gap: 10 }}>
              {[
                { v: "despise", label: "I resent it", sub: "They are below", c: T.heat, cs: T.heatDim },
                { v: "admire", label: "I admire it", sub: "They are above", c: T.cool, cs: T.coolDim },
              ].map((o) => (
                <button key={o.v} type="button" onClick={() => setPolarity(o.v)} className="cl-btn"
                  style={{ flex: 1, padding: "14px 16px", borderRadius: 16, cursor: "pointer", textAlign: "left", border: `2px solid ${polarity === o.v ? o.c : T.line}`, background: polarity === o.v ? o.cs : T.surface }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: polarity === o.v ? o.c : T.white }}>{o.label}</span>
                  <span style={{ display: "block", fontSize: 11, color: T.gray, marginTop: 2 }}>{o.sub}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {wizardStep === 1 && (
          <>
            <label className="cl-ui" style={{ display: "block", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.gray }}>
              The triggering scene
              <textarea value={originMemory} onChange={(e) => setOriginMemory(e.target.value)} rows={5}
                placeholder="June 2023, team meeting, they interrupted me in front of the client. Witness: my colleague. I felt..."
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }} />
            </label>
            <ChargeSlider value={chargeStart} onChange={setChargeStart} label="Activation right now (0 to 10)" hint="This is your baseline. You will rate again at the end to measure the shift." />
          </>
        )}

        {wizardStep === 2 && (
          <>
            <label className="cl-ui" style={{ display: "block", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.gray }}>
              Why does this charge matter right now?
              <textarea value={why} onChange={(e) => setWhy(e.target.value)} rows={2} placeholder="I think about this before sleep, during meetings..." style={{ ...inputStyle, resize: "vertical" }} />
            </label>
            <label className="cl-ui" style={{ display: "block", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.gray, marginTop: 16 }}>
              What is it costing you?
              <textarea value={cost} onChange={(e) => setCost(e.target.value)} rows={2} placeholder="Focus, sleep, presence with my kids, confidence..." style={{ ...inputStyle, resize: "vertical" }} />
            </label>
            <label className="cl-ui" style={{ display: "block", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.gray, marginTop: 16 }}>
              What would shift if this cleared? (optional)
              <textarea value={ifCleared} onChange={(e) => setIfCleared(e.target.value)} rows={2} placeholder="I could be present, direct, unbothered..." style={{ ...inputStyle, resize: "vertical" }} />
            </label>
          </>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
          {wizardStep > 0 && (
            <button type="button" onClick={() => setWizardStep((s) => s - 1)} className="cl-ui cl-btn"
              style={btnBase({ background: "transparent", border: `1px solid ${T.line}`, color: T.white, padding: "14px 22px" })}>
              Back
            </button>
          )}
          {wizardStep < 2 && (
            <button type="button" disabled={wizardStep === 0 ? !step0Ready : !step1Ready} onClick={() => setWizardStep((s) => s + 1)} className="cl-ui cl-btn"
              style={btnBase({ background: (wizardStep === 0 ? step0Ready : step1Ready) ? T.volt : T.surfaceRaised, color: (wizardStep === 0 ? step0Ready : step1Ready) ? T.black : T.grayDim, border: "none", padding: "14px 28px", cursor: (wizardStep === 0 ? step0Ready : step1Ready) ? "pointer" : "default" })}>
              Continue
            </button>
          )}
          {wizardStep === 2 && (
            <button type="button" disabled={!step2Ready} onClick={finish} className="cl-ui cl-btn"
              style={btnBase({ background: step2Ready ? T.volt : T.surfaceRaised, color: step2Ready ? T.black : T.grayDim, border: "none", padding: "14px 28px", cursor: step2Ready ? "pointer" : "default" })}>
              Start training
            </button>
          )}
          {hasSessions && wizardStep === 0 && (
            <button type="button" onClick={onCancel} className="cl-ui cl-btn"
              style={btnBase({ background: "transparent", border: `1px solid ${T.line}`, color: T.white, padding: "14px 22px" })}>
              Cancel
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
  const [step, setStep] = useState(0);
  const [groundingOpen, setGroundingOpen] = useState(false);
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
    const s = sessions.find((x) => x.id === id);
    setActiveId(id);
    setStep(s ? getResumeStep(s) : 0);
    setView("session");
  };

  const create = (data) => {
    const s = newSession(data);
    setSessions((prev) => [s, ...prev]);
    setActiveId(s.id);
    setStep(0);
    setView("session");
  };

  const remove = (id) => setSessions((prev) => prev.filter((s) => s.id !== id));

  const completedCount = sessions.filter((s) => s.done).length;
  const activeProgress = active ? sessionProgress(active) : 0;
  const patterns = detectPatterns(sessions);
  const resumeSession = getResumeSession(sessions);

  return (
    <div style={{ minHeight: "100vh", background: T.black, color: T.white, padding: "0 0 100px" }}>
      <style>{FONT_CSS}</style>
      <GroundingModal open={groundingOpen} onClose={() => setGroundingOpen(false)} />

      <header className="cl-sticky-bar" style={{ borderBottom: `1px solid ${T.line}`, background: "rgba(10,10,10,0.85)" }}>
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <span className="cl-display" style={{ fontSize: 28, fontWeight: 800, color: T.white, lineHeight: 1, display: "block" }}>Charge Ledger</span>
            <span className="cl-ui" style={{ display: "block", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: T.volt, fontWeight: 700, marginTop: 2 }}>
              Train your perception
            </span>
          </Link>
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
            <p className="cl-ui" style={{ fontSize: 14, color: T.gray, maxWidth: 520, lineHeight: 1.65, margin: "0 0 16px" }}>
              Pick up where you left off. A charge is cleared when revisiting the memory brings gratitude, not activation.
            </p>

            {resumeSession && (
              <div style={{ background: T.voltDim, border: `1px solid ${T.volt}55`, borderRadius: 16, padding: "16px 20px", marginBottom: 20, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p className="cl-ui" style={{ margin: 0, fontSize: 13, fontWeight: 700, color: T.volt }}>Continue your training</p>
                  <p className="cl-ui" style={{ margin: "4px 0 0", fontSize: 14, color: T.white }}>{resumeSession.person} · {sessionProgress(resumeSession)}% done</p>
                </div>
                <button onClick={() => openSession(resumeSession.id)} className="cl-ui cl-btn"
                  style={btnBase({ background: T.volt, color: T.black, border: "none", padding: "10px 18px" })}>
                  Resume
                </button>
              </div>
            )}

            {(patterns.avgDrop !== null || patterns.topTraits.length > 0) && (
              <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16, padding: 18, marginBottom: 20 }}>
                <p className="cl-display" style={{ margin: "0 0 10px", fontSize: 16, color: T.gray, fontWeight: 800 }}>Your patterns</p>
                <div className="cl-ui" style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13, color: T.gray, lineHeight: 1.6 }}>
                  {patterns.avgDrop !== null && <span>Avg activation drop: <strong style={{ color: T.volt }}>{patterns.avgDrop} pts</strong></span>}
                  <span>Resentment: {patterns.resentCount} · Admiration: {patterns.admireCount}</span>
                  {patterns.topTraits.length > 0 && (
                    <span>Recurring themes: {patterns.topTraits.map((t) => t.word).join(", ")}</span>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {sessions.map((s) => {
                const pct = sessionProgress(s);
                const accent = s.done ? T.volt : s.polarity === "despise" ? T.heat : T.cool;
                const drop = s.chargeStart !== null && s.chargeEnd !== null ? s.chargeStart - s.chargeEnd : null;
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
                        {drop !== null && drop > 0 && <span style={{ color: T.cool }}> · −{drop} activation</span>}
                      </p>
                      <div style={{ marginTop: 10, maxWidth: 280 }}>
                        <ProgressBar value={pct} accent={accent} />
                      </div>
                    </div>
                    <button onClick={() => openSession(s.id)} className="cl-ui cl-btn"
                      style={btnBase({ background: s.done ? "transparent" : T.volt, color: s.done ? T.white : T.black, border: s.done ? `1px solid ${T.line}` : "none", padding: "10px 20px" })}>
                      {s.done ? "Review" : "Continue"}
                    </button>
                    {s.done && (
                      <button onClick={() => downloadLedgerExport(s)} className="cl-ui cl-btn"
                        style={btnBase({ background: "transparent", border: `1px solid ${T.line}`, color: T.white, padding: "10px 16px", fontSize: 11 })}>
                        Export
                      </button>
                    )}
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
            <div className="cl-ui" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16, background: T.surface, borderRadius: 16, padding: "14px 18px", border: `1px solid ${T.line}` }}>
              <div>
                <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.gray, fontWeight: 700 }}>Active target</p>
                <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 700 }}>
                  {active.person} · <span style={{ color: active.polarity === "despise" ? T.heat : T.cool }}>{active.trait}</span>
                  {active.chargeStart !== null && <span style={{ color: T.gray, fontWeight: 500, fontSize: 13 }}> · started {active.chargeStart}/10</span>}
                </p>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button onClick={() => setGroundingOpen(true)} className="cl-ui cl-btn"
                  style={btnBase({ background: "transparent", border: `1px solid ${T.line}`, color: T.gray, padding: "8px 14px", fontSize: 10 })}>
                  Too activated?
                </button>
                <button onClick={() => setView("home")} className="cl-ui cl-btn" style={{ background: "none", border: "none", color: T.volt, fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  All sessions
                </button>
              </div>
            </div>

            {active.originMemory && (
              <div style={{ background: T.charcoal, border: `1px solid ${T.line}`, borderLeft: `3px solid ${T.volt}`, borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
                <p className="cl-ui" style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.gray }}>Origin scene</p>
                <p className="cl-ui" style={{ margin: "6px 0 0", fontSize: 14, color: T.offWhite, lineHeight: 1.55 }}>{active.originMemory}</p>
              </div>
            )}

            <nav className="cl-ui" aria-label="Phases" style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              {[...PHASES.map((p, i) => ({ label: p.num, title: p.title, i })), { label: "06", title: "Test", i: 5 }].map((tab) => {
                const isDone = tab.i < PHASES.length ? phaseComplete(PHASES[tab.i], active) : active.done;
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
            {step < PHASES.length && (
              <p className="cl-ui" style={{ margin: "0 0 20px", fontSize: 12, color: T.gray, lineHeight: 1.5 }}>
                {phaseComplete(PHASES[step], active)
                  ? "This round is complete. Use the panel below or the sticky button when you are ready to move on."
                  : `Complete the checklist below to unlock the next round. Minimum: ${MIN_ENTRIES} honest reps per phase.`}
              </p>
            )}

            {step < PHASES.length ? (
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
