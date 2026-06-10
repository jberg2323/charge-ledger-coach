export const STORAGE_KEY = "charge-ledger-sessions-v3";
export const LEGACY_STORAGE_KEYS = ["charge-ledger-sessions-v2"];
export const MIN_ENTRIES = 3;

export const PHASES = [
  {
    key: "own",
    num: "01",
    title: "Own It",
    tagline: "Face the mirror",
    question: "Name real moments you did the same thing. Where, when, to whom, and who saw?",
    coach: "Vague does not count. One real place, one real date, one real person, ideally a witness. Keep stacking reps until I would never do that stops being believable.",
    placeholder: "March 2022, at dinner, to my partner, witness: our friend, when I...",
    scan: ["at work", "at home", "with family", "to a stranger", "online", "to yourself"],
  },
  {
    key: "balance",
    num: "02",
    title: "Level It",
    tagline: "Balance the ledger",
    question: "List the real costs and real benefits. Both columns must match before you advance.",
    coach: "You see one side clearly. That is the bias. Hunt the hidden column until the beam levels.",
    scan: ["resilience built", "dependence avoided", "truth surfaced", "boundaries forced", "drive created", "discernment sharpened"],
  },
  {
    key: "opposite",
    num: "03",
    title: "Find The Other Side",
    tagline: "Widen the lens",
    question: "At the exact moment of the charge, who was showing you the opposite? Near or far, real or remembered.",
    coach: "If someone criticized you, who was for you in that same window? Write only what you can actually locate.",
    placeholder: "While they tore into me, that morning someone had texted...",
    scan: ["someone present", "someone far away", "a message or call", "a memory you held", "your own inner voice", "several people at once"],
  },
  {
    key: "fantasy",
    num: "04",
    title: "Break The Fantasy",
    tagline: "Price the ideal",
    question: "If they had done the exact opposite, what would that have cost you?",
    coach: "Pain lives in a one sided fantasy of what should have happened. Price it honestly.",
    placeholder: "If they had always agreed with me, I would never have...",
    scan: ["dependency", "arrested growth", "naivety", "lost drive", "softened standards", "a worse blind spot"],
  },
  {
    key: "values",
    num: "05",
    title: "Map Their Values",
    tagline: "End the betrayal story",
    question: "What do they value most? How does this trait serve their priorities, even when it hurt you?",
    coach: "Feeling betrayed usually means expecting them to live by your values. Map theirs. Their behavior becomes predictable, not personal.",
    placeholder: "They value control over harmony, so in that meeting they...",
    scan: ["security", "status", "freedom", "control", "approval", "family", "money", "peace"],
  },
];

export const PHASE_LABELS = {
  own: "01 Own It: specific moments where you displayed the same trait",
  balance: "02 Level It: real costs and benefits of the trait, columns must match",
  opposite: "03 Find The Other Side: synchronous opposite present at the moment of charge",
  fantasy: "04 Break The Fantasy: drawbacks if they had done the exact opposite",
  values: "05 Map Their Values: their value hierarchy vs yours",
  completion: "06 The Charge Test: revisit the memory and assess remaining activation",
};

export const TRAIT_CHIPS = [
  "Dismisses me publicly",
  "Never follows through",
  "Takes all the credit",
  "Emotionally unavailable",
  "Too controlling",
  "Plays the victim",
  "Breaks promises",
  "Competes with me",
];

export function migrateSession(s) {
  if (!s) return null;
  return {
    id: s.id,
    person: s.person || "",
    trait: s.trait || "",
    polarity: s.polarity || "despise",
    createdAt: s.createdAt || new Date().toISOString(),
    originMemory: s.originMemory || "",
    preCommitment: s.preCommitment || { why: "", cost: "", ifCleared: "" },
    chargeStart: s.chargeStart ?? null,
    chargeEnd: s.chargeEnd ?? null,
    reflection: s.reflection || "",
    done: !!s.done,
    coachChat: s.coachChat || [],
    entries: {
      own: s.entries?.own || [],
      costs: s.entries?.costs || [],
      benefits: s.entries?.benefits || [],
      opposite: s.entries?.opposite || [],
      fantasy: s.entries?.fantasy || [],
      values: s.entries?.values || [],
    },
  };
}

export function newSession(data) {
  return migrateSession({
    id: String(Date.now()),
    createdAt: new Date().toISOString(),
    done: false,
    coachChat: [],
    reflection: "",
    entries: {},
    ...data,
  });
}

export function phaseComplete(phase, session) {
  return getPhaseProceedStatus(phase, session).ready;
}

export function phaseEntryCount(phase, session) {
  const e = session.entries;
  if (phase.key === "balance") return e.costs.length + e.benefits.length;
  return e[phase.key]?.length || 0;
}

export function getPhaseProceedStatus(phase, session) {
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

  const count = e[phase.key]?.length || 0;
  const criteria = [
    { label: `At least ${MIN_ENTRIES} specific moments`, met: count >= MIN_ENTRIES, detail: `${count} of ${MIN_ENTRIES}` },
    { label: "Each moment names where, when, to whom, and witness if possible", met: null, detail: "Check your entries" },
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
    tip: ready ? "More reps are fine if you are still activated. Ask the coach if unsure." : "Each entry needs a real place, date, person, and witness when you can name one.",
  };
}

export function sessionProgress(session) {
  const e = session.entries;
  const phaseScores = [
    Math.min((e.own?.length || 0) / MIN_ENTRIES, 1),
    Math.min(Math.min(e.costs?.length || 0, e.benefits?.length || 0) / MIN_ENTRIES, 1),
    Math.min((e.opposite?.length || 0) / MIN_ENTRIES, 1),
    Math.min((e.fantasy?.length || 0) / MIN_ENTRIES, 1),
    Math.min((e.values?.length || 0) / MIN_ENTRIES, 1),
    session.reflection?.trim() ? 0.5 : 0,
    session.done ? 0.5 : 0,
  ];
  return Math.round((phaseScores.reduce((a, b) => a + b, 0) / phaseScores.length) * 100);
}

export function getCompletionProceedStatus(session) {
  const phaseChecks = PHASES.map((p) => ({
    label: p.title,
    met: phaseComplete(p, session),
    detail: phaseComplete(p, session) ? "Complete" : "Go back and finish",
  }));
  const hasReflection = !!session.reflection?.trim();
  const hasEndRating = session.chargeEnd !== null && session.chargeEnd !== undefined;
  const allPhases = phaseChecks.every((c) => c.met);
  const criteria = [
    ...phaseChecks,
    { label: "Write your charge test reflection", met: hasReflection, detail: hasReflection ? "Written" : "Required below" },
    { label: "Rate activation again (0 to 10)", met: hasEndRating, detail: hasEndRating ? `${session.chargeEnd}/10` : "Required below" },
    { label: "Revisit memory: gratitude, not activation", met: null, detail: "Self check" },
  ];
  const ready = allPhases && hasReflection && hasEndRating;
  const improved = session.chargeStart !== null && hasEndRating && session.chargeEnd < session.chargeStart;
  return {
    ready,
    criteria,
    improved,
    headline: session.done ? "Session complete" : ready ? "Ready to close out" : "Finish remaining rounds first",
    message: session.done
      ? "You marked this charge cleared. Review anytime or start a new session."
      : !allPhases
        ? "Complete all five rounds before the charge test counts."
        : !hasReflection
          ? "Close your eyes, revisit the memory, then write what you feel now."
          : !hasEndRating
            ? "Rate your activation now. Compare it to where you started."
            : improved
              ? `Activation dropped from ${session.chargeStart} to ${session.chargeEnd}. If it feels clear, mark complete.`
              : "If the memory brings gratitude or neutrality, mark complete. If still activated, go back or ask the coach.",
    canMarkComplete: ready,
  };
}

export function detectPatterns(sessions) {
  const incomplete = sessions.filter((s) => !s.done);
  const completed = sessions.filter((s) => s.done && s.chargeStart !== null && s.chargeEnd !== null);
  const traitWords = {};
  sessions.forEach((s) => {
    const words = s.trait.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    words.forEach((w) => {
      traitWords[w] = (traitWords[w] || 0) + 1;
    });
  });
  const topTraits = Object.entries(traitWords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word, count]) => ({ word, count }));
  const avgDrop =
    completed.length > 0
      ? Math.round(
          completed.reduce((a, s) => a + (s.chargeStart - s.chargeEnd), 0) / completed.length
        )
      : null;
  const resentCount = sessions.filter((s) => s.polarity === "despise").length;
  const admireCount = sessions.length - resentCount;
  return { incomplete, completed, topTraits, avgDrop, resentCount, admireCount };
}

export function getResumeSession(sessions) {
  const open = sessions.filter((s) => !s.done);
  if (!open.length) return null;
  return open.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
}

export async function loadSessions() {
  try {
    if (typeof window === "undefined") return [];
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      for (const key of LEGACY_STORAGE_KEYS) {
        raw = localStorage.getItem(key);
        if (raw) break;
      }
    }
    const parsed = raw ? JSON.parse(raw) : [];
    return parsed.map(migrateSession).filter(Boolean);
  } catch {
    return [];
  }
}

export async function saveSessions(sessions) {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error("Save failed", e);
  }
}

export function exportLedgerHtml(session) {
  const e = session.entries;
  const sections = [
    { title: "Origin memory", items: session.originMemory ? [session.originMemory] : [] },
    { title: "Owned moments", items: e.own },
    { title: "Costs", items: e.costs },
    { title: "Benefits", items: e.benefits },
    { title: "Synchronous opposites", items: e.opposite },
    { title: "Fantasy drawbacks", items: e.fantasy },
    { title: "Their values map", items: e.values },
  ];
  const rows = sections
    .map(
      (s) => `
      <h2>${s.title}</h2>
      ${s.items.length ? `<ol>${s.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ol>` : "<p><em>None logged</em></p>"}`
    )
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Charge Ledger: ${escapeHtml(session.person)}</title>
  <style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:0 24px;color:#111;line-height:1.6}
  h1{font-size:28px;margin-bottom:4px}h2{font-size:16px;text-transform:uppercase;letter-spacing:.08em;margin-top:28px;color:#444}
  .meta{color:#666;font-size:14px}ol{padding-left:20px}li{margin-bottom:8px}</style></head><body>
  <h1>Charge Ledger</h1>
  <p class="meta"><strong>${escapeHtml(session.person)}</strong> · ${escapeHtml(session.trait)} · ${session.polarity === "despise" ? "Resentment" : "Admiration"}</p>
  <p class="meta">Activation: ${session.chargeStart ?? "?"} → ${session.chargeEnd ?? "?"} / 10</p>
  <p class="meta">Why this matters: ${escapeHtml(session.preCommitment?.why || "")}</p>
  <p class="meta">What it costs: ${escapeHtml(session.preCommitment?.cost || "")}</p>
  <h2>Reflection</h2><p>${escapeHtml(session.reflection || "")}</p>
  ${rows}
  <p class="meta" style="margin-top:40px;border-top:1px solid #ddd;padding-top:16px">Exported from Charge Ledger · ${new Date().toLocaleDateString()}</p>
  </body></html>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function downloadLedgerExport(session) {
  const html = exportLedgerHtml(session);
  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
  return true;
}