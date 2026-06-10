"use client";

import { useState, useEffect, useRef } from "react";

// ----------------------------------------------------------------------
// The Charge Ledger, with a live coach
// A guided reflection tool based on the balancing protocol popularized
// by Dr. John Demartini. The embedded coach is briefed on the method
// and intervenes when you are stuck, vague, or still activated.
// ----------------------------------------------------------------------

const T = {
  bg: "#E9EAE4",
  surface: "#F7F7F3",
  surfaceDeep: "#EFEFE9",
  ink: "#1C2326",
  inkSoft: "#4A5458",
  inkFaint: "#8B9296",
  line: "#D4D6CD",
  umber: "#8A4F2D",
  umberSoft: "#F0E4DA",
  teal: "#34666B",
  tealSoft: "#DEE9E8",
  level: "#5C6E58",
  levelSoft: "#E4EADF",
  coachBg: "#22302F",
  coachInk: "#E8ECE7",
  coachFaint: "#9DABA4",
};

const FONT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&family=Archivo:wght@400;500;600;700&display=swap');
.cl-display { font-family: 'Cormorant Garamond', Georgia, serif; }
.cl-ui { font-family: 'Archivo', system-ui, sans-serif; }
.cl-fade { animation: clFade .35s ease both; }
@keyframes clFade { from { opacity: 0; transform: translateY(6px);} to { opacity: 1; transform: none;} }
@keyframes clPulse { 0%,100% { opacity: .45; } 50% { opacity: 1; } }
.cl-thinking span { animation: clPulse 1.2s ease infinite; display:inline-block; }
.cl-thinking span:nth-child(2){ animation-delay:.2s } .cl-thinking span:nth-child(3){ animation-delay:.4s }
@media (prefers-reduced-motion: reduce) { .cl-fade { animation: none; } .cl-beam { transition: none !important; } .cl-thinking span { animation: none; } }
textarea:focus, input:focus, button:focus-visible { outline: 2px solid #34666B; outline-offset: 2px; }
`;

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

  let response;
  try {
    response = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
  } catch (e) {
    throw new Error("Network request failed. Check your connection and try again.");
  }

  let data;
  try {
    data = await response.json();
  } catch (e) {
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
    .join("\n");

  if (!text.trim()) {
    throw new Error("The coach sent back an empty response. Try again.");
  }

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
  };
}

const PHASES = [
  {
    key: "own",
    num: "I",
    title: "Own the trait",
    question:
      "Go to specific moments where you displayed the same or a similar behavior. Where was it, when was it, and to whom?",
    coach:
      "Vague admission changes nothing. Episodic precision is the work: a real place, a real date, a real person on the receiving end. Keep adding moments until the sentence I would never do that becomes impossible to say.",
    placeholder: "Spring 2019, in the kitchen, to Stephanie, when I...",
    scan: ["at work", "at home", "with your kids", "to a stranger", "online", "to yourself"],
  },
  {
    key: "balance",
    num: "II",
    title: "Balance the trait",
    question:
      "List the real costs of this trait and the real benefits of this trait. The ledger must level before you move on.",
    coach:
      "You already see one column clearly. That is the bias. The work is the other column. If you saw mostly costs, hunt benefits: who did this trait make resilient, independent, honest, awake? If you saw mostly benefits, hunt costs. Equal counts, honestly earned.",
    scan: ["resilience built", "dependence avoided", "truth surfaced", "boundaries forced", "drive created", "discernment sharpened"],
  },
  {
    key: "opposite",
    num: "III",
    title: "Find the synchronous opposite",
    question:
      "Return to the exact moment of the charge. At that same moment, who was expressing the opposite toward you? Real or remembered, one person or many, near or far.",
    coach:
      "If someone was criticizing you, who was praising you at that time? If someone was leaving, who was arriving? The claim of the method is that the opposite is always present and your attention simply was not on it. Test the claim. Write only what you can actually locate.",
    placeholder: "While he was tearing the plan apart, a text that morning had said...",
    scan: ["someone present", "someone far away", "a message or call", "a memory you held", "your own inner voice", "several people at once"],
  },
  {
    key: "fantasy",
    num: "IV",
    title: "Crack the fantasy",
    question:
      "If this person had done the exact opposite of what they did, what would the drawbacks have been?",
    coach:
      "The pain lives in the comparison between what happened and a one sided fantasy of what should have happened. Dissolve the fantasy by pricing it. If they had been endlessly agreeable, supportive, present: what would that have cost you, made of you, kept you from?",
    placeholder: "If she had agreed with everything I said, I would never have...",
    scan: ["dependency", "arrested growth", "naivety", "lost drive", "softened standards", "a worse blind spot"],
  },
];

// ---------------------------------------------------------------- beam
function Beam({ left, right, label }) {
  const diff = right - left;
  const angle = Math.max(-16, Math.min(16, diff * 5));
  const leveled = left === right && left >= MIN_ENTRIES;
  return (
    <div className="cl-ui" style={{ textAlign: "center", padding: "8px 0 2px" }}>
      <svg width="220" height="64" viewBox="0 0 220 64" aria-hidden="true" style={{ overflow: "visible" }}>
        <line x1="110" y1="14" x2="110" y2="50" stroke={T.inkFaint} strokeWidth="2" />
        <path d="M96 50 L124 50 L118 58 L102 58 Z" fill={T.inkFaint} opacity="0.5" />
        <g
          className="cl-beam"
          style={{
            transform: `rotate(${angle}deg)`,
            transformOrigin: "110px 16px",
            transition: "transform .5s cubic-bezier(.34,1.3,.5,1)",
          }}
        >
          <line x1="30" y1="16" x2="190" y2="16" stroke={leveled ? T.level : T.ink} strokeWidth="3" strokeLinecap="round" />
          <circle cx="30" cy="16" r="9" fill={T.umber} />
          <circle cx="190" cy="16" r="9" fill={T.teal} />
          <text x="30" y="20" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700">{left}</text>
          <text x="190" y="20" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700">{right}</text>
        </g>
        <circle cx="110" cy="16" r="4" fill={leveled ? T.level : T.ink} />
      </svg>
      <div style={{ fontSize: 12, letterSpacing: ".06em", textTransform: "uppercase", color: leveled ? T.level : T.inkSoft, fontWeight: 600 }}>
        {leveled ? "Leveled" : label}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- coach panel
function CoachPanel({ session, phaseKey, modes }) {
  const [state, setState] = useState({ status: "idle", data: null, error: null, mode: null });

  // Reset when phase changes
  useEffect(() => {
    setState({ status: "idle", data: null, error: null, mode: null });
  }, [phaseKey, session.id]);

  const run = async (mode) => {
    setState({ status: "loading", data: null, error: null, mode });
    try {
      const data = await askCoach(mode, session, phaseKey);
      setState({ status: "done", data, error: null, mode });
    } catch (e) {
      setState({
        status: "error",
        data: null,
        error: e && e.message ? e.message : "The coach could not respond. Try again in a moment.",
        mode,
      });
    }
  };

  const btn = (label, mode, disabled) => (
    <button
      key={mode}
      onClick={() => run(mode)}
      disabled={disabled || state.status === "loading"}
      className="cl-ui"
      style={{
        background: "transparent",
        border: `1px solid ${T.coachFaint}`,
        color: disabled ? T.coachFaint : T.coachInk,
        borderRadius: 6,
        padding: "8px 14px",
        fontSize: 13,
        fontWeight: 600,
        cursor: disabled || state.status === "loading" ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );

  return (
    <aside
      aria-label="Coach"
      style={{
        background: T.coachBg,
        borderRadius: 10,
        padding: "18px 20px",
        marginTop: 26,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <p className="cl-display" style={{ margin: 0, fontSize: 22, fontStyle: "italic", fontWeight: 600, color: T.coachInk }}>
          The coach
        </p>
        <p className="cl-ui" style={{ margin: 0, fontSize: 11, letterSpacing: ".07em", textTransform: "uppercase", color: T.coachFaint }}>
          Briefed on the method. Reads your ledger.
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        {modes.map((m) => btn(m.label, m.mode, m.disabled))}
      </div>

      {state.status === "loading" && (
        <p className="cl-ui cl-thinking" style={{ color: T.coachFaint, fontSize: 13, marginTop: 14, marginBottom: 0 }}>
          Reading your ledger<span>.</span><span>.</span><span>.</span>
        </p>
      )}

      {state.status === "error" && (
        <div className="cl-fade" style={{ marginTop: 14 }}>
          <p className="cl-ui" style={{ color: "#D8A79A", fontSize: 13, margin: 0, lineHeight: 1.6 }}>{state.error}</p>
          <button
            onClick={() => run(state.mode)}
            className="cl-ui"
            style={{ marginTop: 10, background: "transparent", border: `1px solid ${T.coachFaint}`, color: T.coachInk, borderRadius: 6, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            Retry
          </button>
        </div>
      )}

      {state.status === "done" && state.data && (
        <div className="cl-fade" style={{ marginTop: 14 }}>
          {state.data.message ? (
            <p className="cl-ui" style={{ color: T.coachInk, fontSize: 14, lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" }}>
              {state.data.message}
            </p>
          ) : null}
          {Array.isArray(state.data.questions) && state.data.questions.length > 0 && (
            <ol style={{ margin: "12px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
              {state.data.questions.map((q, i) => (
                <li key={i} className="cl-ui" style={{ display: "flex", gap: 10, color: T.coachInk, fontSize: 14, lineHeight: 1.55 }}>
                  <span style={{ color: T.coachFaint, fontWeight: 700, minWidth: 14 }}>{i + 1}</span>
                  <span>{q}</span>
                </li>
              ))}
            </ol>
          )}
          <p className="cl-ui" style={{ color: T.coachFaint, fontSize: 12, marginTop: 12, marginBottom: 0 }}>
            Answer in the ledger above, then run the coach again if you want another pass.
          </p>
        </div>
      )}
    </aside>
  );
}

// ---------------------------------------------------------------- entries
function EntryList({ entries, onRemove, color }) {
  if (!entries.length) return null;
  return (
    <ol style={{ listStyle: "none", margin: "12px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
      {entries.map((e, i) => (
        <li
          key={i}
          className="cl-fade"
          style={{
            background: T.surface,
            border: `1px solid ${T.line}`,
            borderLeft: `3px solid ${color}`,
            borderRadius: 6,
            padding: "10px 12px",
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <span className="cl-ui" style={{ fontSize: 11, fontWeight: 700, color: T.inkFaint, marginTop: 2, minWidth: 16 }}>
            {i + 1}
          </span>
          <span className="cl-ui" style={{ fontSize: 14, lineHeight: 1.5, color: T.ink, flex: 1, whiteSpace: "pre-wrap" }}>{e}</span>
          <button
            onClick={() => onRemove(i)}
            aria-label={`Remove entry ${i + 1}`}
            className="cl-ui"
            style={{ background: "none", border: "none", color: T.inkFaint, cursor: "pointer", fontSize: 14, padding: 2 }}
          >
            ×
          </button>
        </li>
      ))}
    </ol>
  );
}

function EntryInput({ placeholder, onAdd, color, seed, onSeedUsed }) {
  const [val, setVal] = useState("");
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
  };
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
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
        rows={2}
        className="cl-ui"
        style={{
          flex: 1,
          resize: "vertical",
          border: `1px solid ${T.line}`,
          borderRadius: 6,
          padding: "10px 12px",
          fontSize: 14,
          lineHeight: 1.5,
          background: "#fff",
          color: T.ink,
        }}
      />
      <button
        onClick={submit}
        className="cl-ui"
        style={{
          alignSelf: "flex-end",
          background: color,
          color: "#fff",
          border: "none",
          borderRadius: 6,
          padding: "10px 16px",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Add
      </button>
    </div>
  );
}

function ScanChips({ items, onPick }) {
  return (
    <div className="cl-ui" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
      <span style={{ fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: T.inkFaint, fontWeight: 700 }}>Scan</span>
      {items.map((s) => (
        <button
          key={s}
          onClick={() => onPick(s)}
          style={{
            background: T.surfaceDeep,
            border: `1px solid ${T.line}`,
            borderRadius: 99,
            padding: "4px 10px",
            fontSize: 12,
            color: T.inkSoft,
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
    const blindLabel = despise ? "Benefits is your hidden column" : "Costs is your hidden column";
    return (
      <div>
        <Beam left={costs.length} right={benefits.length} label={blindLabel} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20, marginTop: 8 }} className="cl-balance-grid">
          <style>{`@media (min-width: 700px){ .cl-balance-grid { grid-template-columns: 1fr 1fr !important; } }`}</style>
          <section>
            <h3 className="cl-ui" style={{ fontSize: 13, fontWeight: 700, color: T.umber, letterSpacing: ".05em", textTransform: "uppercase", margin: "0 0 4px" }}>
              Costs of this trait
            </h3>
            <p className="cl-ui" style={{ fontSize: 13, color: T.inkSoft, margin: 0 }}>
              {despise ? "This side comes easily. List them, then earn the other side." : "This is the side your admiration hides. Look harder here."}
            </p>
            <EntryInput placeholder="It cost..." color={T.umber} seed={seed.a} onSeedUsed={() => setSeed((s) => ({ ...s, a: "" }))}
              onAdd={(v) => update({ entries: { ...ent, costs: [...costs, v] } })} />
            <EntryList entries={costs} color={T.umber} onRemove={(i) => update({ entries: { ...ent, costs: costs.filter((_, j) => j !== i) } })} />
          </section>
          <section>
            <h3 className="cl-ui" style={{ fontSize: 13, fontWeight: 700, color: T.teal, letterSpacing: ".05em", textTransform: "uppercase", margin: "0 0 4px" }}>
              Benefits of this trait
            </h3>
            <p className="cl-ui" style={{ fontSize: 13, color: T.inkSoft, margin: 0 }}>
              {despise ? "This is the side your resentment hides. Who did this trait strengthen, wake up, or set free?" : "This side comes easily. List them, then earn the other side."}
            </p>
            <EntryInput placeholder="It served by..." color={T.teal} seed={seed.b} onSeedUsed={() => setSeed((s) => ({ ...s, b: "" }))}
              onAdd={(v) => update({ entries: { ...ent, benefits: [...benefits, v] } })} />
            <EntryList entries={benefits} color={T.teal} onRemove={(i) => update({ entries: { ...ent, benefits: benefits.filter((_, j) => j !== i) } })} />
            <ScanChips items={phase.scan} onPick={(s) => setSeed((x) => ({ ...x, b: s + ": " }))} />
          </section>
        </div>
      </div>
    );
  }

  const key = phase.key;
  const list = ent[key];
  const color = key === "own" ? T.umber : key === "opposite" ? T.teal : T.ink;
  return (
    <div>
      <EntryInput placeholder={phase.placeholder} color={color} seed={seed.a} onSeedUsed={() => setSeed((s) => ({ ...s, a: "" }))}
        onAdd={(v) => update({ entries: { ...ent, [key]: [...list, v] } })} />
      <ScanChips items={phase.scan} onPick={(s) => setSeed((x) => ({ ...x, a: s + ": " }))} />
      <EntryList entries={list} color={color} onRemove={(i) => update({ entries: { ...ent, [key]: list.filter((_, j) => j !== i) } })} />
      <p className="cl-ui" style={{ fontSize: 12, color: T.inkFaint, marginTop: 10 }}>
        {list.length} of at least {MIN_ENTRIES} moments. More is better. Stop when the charge softens, not when the form is satisfied.
      </p>
    </div>
  );
}

function phaseComplete(phase, session) {
  const e = session.entries;
  if (phase.key === "balance") return e.costs.length >= MIN_ENTRIES && e.costs.length === e.benefits.length;
  return e[phase.key].length >= MIN_ENTRIES;
}

function phaseEntryCount(phase, session) {
  const e = session.entries;
  if (phase.key === "balance") return e.costs.length + e.benefits.length;
  return e[phase.key].length;
}

// ---------------------------------------------------------------- completion
function Completion({ session, update, onHome }) {
  const e = session.entries;
  return (
    <div className="cl-fade">
      <h2 className="cl-display" style={{ fontSize: 32, fontStyle: "italic", fontWeight: 600, margin: "0 0 6px", color: T.ink }}>
        The charge test
      </h2>
      <p className="cl-ui" style={{ fontSize: 14, color: T.inkSoft, lineHeight: 1.6, maxWidth: 560 }}>
        Close your eyes and return to the original moment with {session.person}. Hold both columns at once: what it cost and what it gave, who opposed you and who was for you, what happened and what the fantasy would have cost. Then answer honestly.
      </p>
      <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 8, padding: 18, margin: "18px 0" }}>
        <p className="cl-ui" style={{ fontSize: 14, fontWeight: 600, color: T.ink, margin: "0 0 8px" }}>
          When you revisit the memory now, what do you feel?
        </p>
        <textarea
          value={session.reflection}
          onChange={(ev) => update({ reflection: ev.target.value })}
          rows={3}
          placeholder="Write what is actually here now..."
          className="cl-ui"
          style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${T.line}`, borderRadius: 6, padding: "10px 12px", fontSize: 14, lineHeight: 1.5, background: "#fff", color: T.ink, resize: "vertical" }}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button
            onClick={() => update({ done: true })}
            className="cl-ui"
            style={{ background: T.level, color: "#fff", border: "none", borderRadius: 6, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            The charge is gone. Mark complete
          </button>
          <button
            onClick={() => update({ done: false })}
            className="cl-ui"
            style={{ background: "transparent", color: T.ink, border: `1px solid ${T.line}`, borderRadius: 6, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Still activated. I will go deeper
          </button>
        </div>
        {session.done && (
          <p className="cl-ui cl-fade" style={{ fontSize: 13, color: T.level, fontWeight: 600, marginTop: 12, marginBottom: 0 }}>
            Marked complete. Gratitude where there was a charge is the confirmation this work asks for.
          </p>
        )}
      </div>

      <CoachPanel
        session={session}
        phaseKey="completion"
        modes={[{ label: "Diagnose my remaining charge", mode: "charge", disabled: !session.reflection.trim() }]}
      />

      <div style={{ background: T.surfaceDeep, borderRadius: 8, padding: 16, marginTop: 18 }}>
        <p className="cl-ui" style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: T.inkSoft, margin: "0 0 8px" }}>
          Session ledger
        </p>
        <p className="cl-ui" style={{ fontSize: 13, color: T.inkSoft, margin: 0, lineHeight: 1.7 }}>
          {e.own.length} owned moments · {e.costs.length} costs and {e.benefits.length} benefits · {e.opposite.length} synchronous opposites · {e.fantasy.length} fantasy drawbacks
        </p>
      </div>
      <button onClick={onHome} className="cl-ui" style={{ marginTop: 18, background: "none", border: "none", color: T.teal, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}>
        ← Back to all sessions
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
  return (
    <div className="cl-fade" style={{ maxWidth: 560 }}>
      <h2 className="cl-display" style={{ fontSize: 32, fontStyle: "italic", fontWeight: 600, margin: "0 0 6px", color: T.ink }}>
        Open a ledger
      </h2>
      <p className="cl-ui" style={{ fontSize: 14, color: T.inkSoft, lineHeight: 1.6 }}>
        One person, one trait at a time. Pick someone who occupies space in your mind without paying rent: someone you resent, or someone you have put on a pedestal. Both run you.
      </p>
      <label className="cl-ui" style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.ink, marginTop: 16 }}>
        Who is the person?
        <input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="A name or initials"
          style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 6, border: `1px solid ${T.line}`, borderRadius: 6, padding: "10px 12px", fontSize: 14, background: "#fff", color: T.ink }} />
      </label>
      <label className="cl-ui" style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.ink, marginTop: 14 }}>
        What is the specific trait, action, or inaction?
        <input value={trait} onChange={(e) => setTrait(e.target.value)} placeholder="Dismisses my work in front of others"
          style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 6, border: `1px solid ${T.line}`, borderRadius: 6, padding: "10px 12px", fontSize: 14, background: "#fff", color: T.ink }} />
      </label>
      <div className="cl-ui" style={{ display: "flex", gap: 8, marginTop: 14 }}>
        {[
          { v: "despise", label: "I despise it", c: T.umber, cs: T.umberSoft },
          { v: "admire", label: "I admire it", c: T.teal, cs: T.tealSoft },
        ].map((o) => (
          <button key={o.v} onClick={() => setPolarity(o.v)}
            style={{
              flex: 1, padding: "10px 12px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${polarity === o.v ? o.c : T.line}`,
              background: polarity === o.v ? o.cs : T.surface,
              color: polarity === o.v ? o.c : T.inkSoft,
            }}>
            {o.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button disabled={!ready} onClick={() => onCreate(person.trim(), trait.trim(), polarity)} className="cl-ui"
          style={{ background: ready ? T.ink : T.inkFaint, color: "#fff", border: "none", borderRadius: 6, padding: "11px 18px", fontSize: 13, fontWeight: 600, cursor: ready ? "pointer" : "default" }}>
          Begin the work
        </button>
        {hasSessions && (
          <button onClick={onCancel} className="cl-ui" style={{ background: "none", border: `1px solid ${T.line}`, borderRadius: 6, padding: "11px 18px", fontSize: 13, fontWeight: 600, color: T.ink, cursor: "pointer" }}>
            Cancel
          </button>
        )}
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
      <div className="cl-ui" style={{ minHeight: "100vh", background: T.bg, display: "grid", placeItems: "center", color: T.inkSoft, fontSize: 14 }}>
        <style>{FONT_CSS}</style>
        Opening your ledger...
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

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.ink, padding: "0 0 80px" }}>
      <style>{FONT_CSS}</style>

      <header style={{ borderBottom: `1px solid ${T.line}`, background: T.surface }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "22px 20px", display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <button onClick={() => setView(sessions.length ? "home" : "new")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}>
            <span className="cl-display" style={{ fontSize: 26, fontWeight: 600, fontStyle: "italic", color: T.ink }}>The Charge Ledger</span>
          </button>
          <span className="cl-ui" style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: T.inkFaint }}>
            A balancing protocol after Demartini, with a live coach
          </span>
        </div>
      </header>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "32px 20px 0" }}>
        {view === "new" && <NewSession onCreate={create} onCancel={() => setView("home")} hasSessions={sessions.length > 0} />}

        {view === "home" && (
          <div className="cl-fade">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <h2 className="cl-display" style={{ fontSize: 32, fontStyle: "italic", fontWeight: 600, margin: 0 }}>Your ledgers</h2>
              <button onClick={() => setView("new")} className="cl-ui"
                style={{ background: T.ink, color: "#fff", border: "none", borderRadius: 6, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Open a new ledger
              </button>
            </div>
            <p className="cl-ui" style={{ fontSize: 13, color: T.inkSoft, maxWidth: 560, lineHeight: 1.6 }}>
              Sessions save automatically. The coach reads only the ledger in front of it. A charge is complete when revisiting the memory produces gratitude instead of activation.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
              {sessions.map((s) => {
                const total = Object.values(s.entries).reduce((a, b) => a + b.length, 0);
                return (
                  <div key={s.id} style={{ background: T.surface, border: `1px solid ${T.line}`, borderLeft: `3px solid ${s.done ? T.level : s.polarity === "despise" ? T.umber : T.teal}`, borderRadius: 8, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <p className="cl-ui" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{s.person}</p>
                      <p className="cl-ui" style={{ margin: "2px 0 0", fontSize: 13, color: T.inkSoft }}>
                        {s.polarity === "despise" ? "Despised" : "Admired"}: {s.trait}
                      </p>
                      <p className="cl-ui" style={{ margin: "4px 0 0", fontSize: 11, color: T.inkFaint, letterSpacing: ".04em", textTransform: "uppercase" }}>
                        {s.done ? "Complete" : `${total} entries · in progress`}
                      </p>
                    </div>
                    <button onClick={() => openSession(s.id)} className="cl-ui"
                      style={{ background: "none", border: `1px solid ${T.line}`, borderRadius: 6, padding: "8px 14px", fontSize: 13, fontWeight: 600, color: T.ink, cursor: "pointer" }}>
                      {s.done ? "Review" : "Continue"}
                    </button>
                    <button onClick={() => remove(s.id)} aria-label="Delete session" className="cl-ui"
                      style={{ background: "none", border: "none", color: T.inkFaint, fontSize: 13, cursor: "pointer" }}>
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
            <div className="cl-ui" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: T.inkFaint }}>Working on</p>
                <p style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 600 }}>
                  {active.person} · <span style={{ color: active.polarity === "despise" ? T.umber : T.teal }}>{active.trait}</span>
                </p>
              </div>
              <button onClick={() => setView("home")} style={{ background: "none", border: "none", color: T.teal, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                All sessions
              </button>
            </div>

            <nav className="cl-ui" aria-label="Phases" style={{ display: "flex", gap: 6, marginBottom: 26, flexWrap: "wrap" }}>
              {[...PHASES.map((p, i) => ({ label: p.num, i })), { label: "✓", i: 4 }].map((tab) => {
                const isDone = tab.i < 4 ? phaseComplete(PHASES[tab.i], active) : active.done;
                const isCurrent = step === tab.i;
                return (
                  <button key={tab.i} onClick={() => setStep(tab.i)}
                    aria-current={isCurrent ? "step" : undefined}
                    style={{
                      width: 40, height: 32, borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer",
                      border: `1px solid ${isCurrent ? T.ink : T.line}`,
                      background: isDone ? T.levelSoft : isCurrent ? T.surface : "transparent",
                      color: isDone ? T.level : isCurrent ? T.ink : T.inkFaint,
                    }}>
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            {step < 4 ? (
              <div className="cl-fade" key={step}>
                <p className="cl-ui" style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: T.inkFaint }}>
                  Phase {PHASES[step].num} of IV
                </p>
                <h2 className="cl-display" style={{ fontSize: 34, fontStyle: "italic", fontWeight: 600, margin: "4px 0 10px", lineHeight: 1.1 }}>
                  {PHASES[step].title}
                </h2>
                <p className="cl-ui" style={{ fontSize: 15, fontWeight: 500, color: T.ink, lineHeight: 1.6, maxWidth: 620, margin: 0 }}>
                  {PHASES[step].question}
                </p>
                <p className="cl-ui" style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.65, maxWidth: 620, margin: "10px 0 8px", borderLeft: `2px solid ${T.line}`, paddingLeft: 12 }}>
                  {PHASES[step].coach}
                </p>

                <PhaseBody phase={PHASES[step]} session={active} update={update} />

                <CoachPanel
                  session={active}
                  phaseKey={PHASES[step].key}
                  modes={[
                    { label: "I am stuck", mode: "stuck", disabled: false },
                    { label: "Pressure test my entries", mode: "pressure", disabled: phaseEntryCount(PHASES[step], active) === 0 },
                  ]}
                />

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28, gap: 10 }}>
                  <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="cl-ui"
                    style={{ background: "none", border: `1px solid ${T.line}`, borderRadius: 6, padding: "10px 16px", fontSize: 13, fontWeight: 600, color: step === 0 ? T.inkFaint : T.ink, cursor: step === 0 ? "default" : "pointer" }}>
                    Back
                  </button>
                  <button onClick={() => setStep(step + 1)} className="cl-ui"
                    style={{
                      background: phaseComplete(PHASES[step], active) ? T.ink : "transparent",
                      color: phaseComplete(PHASES[step], active) ? "#fff" : T.inkSoft,
                      border: `1px solid ${phaseComplete(PHASES[step], active) ? T.ink : T.line}`,
                      borderRadius: 6, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                    }}>
                    {phaseComplete(PHASES[step], active) ? "Next phase" : "Skip ahead anyway"}
                  </button>
                </div>
              </div>
            ) : (
              <Completion session={active} update={update} onHome={() => setView("home")} />
            )}
          </div>
        )}
      </main>

      <footer className="cl-ui" style={{ maxWidth: 860, margin: "48px auto 0", padding: "0 20px" }}>
        <p style={{ fontSize: 11, color: T.inkFaint, lineHeight: 1.6, borderTop: `1px solid ${T.line}`, paddingTop: 14 }}>
          A self reflection aid, not therapy. For trauma involving abuse or assault, work with a trauma informed professional rather than this tool. Based on the publicly described structure of the Demartini Method; the full proprietary method is taught at his Breakthrough Experience.
        </p>
      </footer>
    </div>
  );
}
