"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getResumeSession, loadSessions, sessionProgress } from "../lib/session-utils";

const T = {
  black: "#0A0A0A",
  charcoal: "#141414",
  surface: "#1C1C1C",
  white: "#FFFFFF",
  gray: "#8A8A8A",
  line: "#333333",
  volt: "#D4FF00",
  voltDim: "rgba(212,255,0,0.12)",
  cool: "#00E5A0",
};

const FONT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');
.cl-display { font-family: 'Barlow Condensed', system-ui, sans-serif; letter-spacing: 0.02em; text-transform: uppercase; }
.cl-ui { font-family: 'Inter', system-ui, sans-serif; }
`;

const COACH_EXAMPLES = [
  { q: "I don't understand what Own It is asking.", a: "You are hunting moments you did the same thing to someone else. Not vaguely. A kitchen, a date, a name. Where is one?" },
  { q: "Is this entry honest or am I filling a row?", a: "Entry 2 names a place but no witness and no date. That is form filling. Give me the scene like a camera would see it." },
];

const PROOF_STATS = [
  { n: "4", label: "Focused rounds" },
  { n: "5", label: "Phases to balance" },
  { n: "24/7", label: "Live coach" },
];

const EMAIL_KEY = "charge-ledger-email";

export default function LandingPage() {
  const [resume, setResume] = useState(null);
  const [email, setEmail] = useState("");
  const [emailSaved, setEmailSaved] = useState(false);

  useEffect(() => {
    loadSessions().then((sessions) => setResume(getResumeSession(sessions)));
    const saved = localStorage.getItem(EMAIL_KEY);
    if (saved) setEmail(saved);
  }, []);

  const saveEmail = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    localStorage.setItem(EMAIL_KEY, email.trim());
    setEmailSaved(true);
  };

  return (
    <div style={{ minHeight: "100vh", background: T.black, color: T.white }}>
      <style>{FONT_CSS}</style>

      <header style={{ borderBottom: `1px solid ${T.line}`, padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1000, margin: "0 auto" }}>
        <div>
          <p className="cl-display" style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Charge Ledger</p>
          <p className="cl-ui" style={{ margin: "2px 0 0", fontSize: 10, color: T.volt, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>Train your perception</p>
        </div>
        <Link href="/train" className="cl-ui" style={{ background: T.volt, color: T.black, textDecoration: "none", borderRadius: 999, padding: "10px 20px", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Start free
        </Link>
      </header>

      {resume && (
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "16px 20px 0" }}>
          <div style={{ background: T.voltDim, border: `1px solid ${T.volt}55`, borderRadius: 16, padding: "16px 20px", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p className="cl-ui" style={{ margin: 0, fontSize: 13, fontWeight: 700, color: T.volt }}>Pick up where you left off</p>
              <p className="cl-ui" style={{ margin: "4px 0 0", fontSize: 14, color: T.white }}>
                {resume.person} · {sessionProgress(resume)}% complete
              </p>
            </div>
            <Link href="/train" className="cl-ui" style={{ background: T.volt, color: T.black, textDecoration: "none", borderRadius: 999, padding: "10px 18px", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Continue session
            </Link>
          </div>
        </div>
      )}

      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 20px 32px" }}>
        <p className="cl-ui" style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: T.volt }}>
          For founders, partners, exes, rivals, parents
        </p>
        <h1 className="cl-display" style={{ margin: "12px 0 16px", fontSize: "clamp(48px, 10vw, 72px)", fontWeight: 800, lineHeight: 0.92, maxWidth: 700 }}>
          Someone is living in your head rent free
        </h1>
        <p className="cl-ui" style={{ margin: 0, fontSize: 18, color: T.gray, lineHeight: 1.65, maxWidth: 560 }}>
          Balance one charged relationship in five focused rounds. An AI coach trained on the full balancing protocol reads your ledger and pushes you when you stall.
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
          <Link href="/train" className="cl-ui" style={{ background: T.volt, color: T.black, textDecoration: "none", borderRadius: 999, padding: "14px 28px", fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Name your charge
          </Link>
          <a href="#coach" className="cl-ui" style={{ color: T.white, textDecoration: "none", border: `1px solid ${T.line}`, borderRadius: 999, padding: "14px 22px", fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            See the coach
          </a>
        </div>
      </section>

      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "0 20px 40px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        {PROOF_STATS.map((s) => (
          <div key={s.label} style={{ background: T.surface, borderRadius: 16, padding: 20, textAlign: "center", border: `1px solid ${T.line}` }}>
            <p className="cl-display" style={{ margin: 0, fontSize: 36, color: T.volt, fontWeight: 800 }}>{s.n}</p>
            <p className="cl-ui" style={{ margin: "4px 0 0", fontSize: 11, color: T.gray, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{s.label}</p>
          </div>
        ))}
      </section>

      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "0 20px 48px" }}>
        <h2 className="cl-display" style={{ fontSize: 32, fontWeight: 800, margin: "0 0 20px" }}>How it works</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {[
            { t: "Anchor the charge", d: "Name the person, the trait, and the exact scene that started this." },
            { t: "Five honest rounds", d: "Own it, level it, find the other side, break the fantasy, map their values." },
            { t: "Measure the shift", d: "Rate activation 0 to 10 at the start and finish. See the drop." },
            { t: "Coach on demand", d: "Chat with a master of the method who reads every entry you log." },
          ].map((item) => (
            <div key={item.t} style={{ background: T.charcoal, borderRadius: 16, padding: 20, border: `1px solid ${T.line}` }}>
              <p className="cl-display" style={{ margin: 0, fontSize: 18, color: T.volt, fontWeight: 800 }}>{item.t}</p>
              <p className="cl-ui" style={{ margin: "8px 0 0", fontSize: 14, color: T.gray, lineHeight: 1.55 }}>{item.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="coach" style={{ maxWidth: 1000, margin: "0 auto", padding: "0 20px 48px" }}>
        <h2 className="cl-display" style={{ fontSize: 32, fontWeight: 800, margin: "0 0 8px" }}>Your live coach</h2>
        <p className="cl-ui" style={{ margin: "0 0 20px", fontSize: 15, color: T.gray, maxWidth: 520, lineHeight: 1.6 }}>
          Not generic journaling. A coach briefed on the full protocol, quoting your entries back, pressure testing honesty, and refusing vague answers.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {COACH_EXAMPLES.map((ex, i) => (
            <div key={i} style={{ background: T.surface, borderRadius: 16, padding: 18, border: `1px solid ${T.line}` }}>
              <p className="cl-ui" style={{ margin: 0, fontSize: 13, color: T.gray }}>You: {ex.q}</p>
              <p className="cl-ui" style={{ margin: "10px 0 0", fontSize: 15, color: T.white, lineHeight: 1.55, borderLeft: `3px solid ${T.volt}`, paddingLeft: 12 }}>
                Coach: {ex.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "0 20px 56px" }}>
        <div style={{ background: `linear-gradient(135deg, ${T.charcoal}, ${T.surface})`, borderRadius: 24, padding: "32px 28px", border: `1px solid ${T.line}` }}>
          <h2 className="cl-display" style={{ fontSize: 36, fontWeight: 800, margin: "0 0 10px", lineHeight: 0.95 }}>
            Balance the charge. Own your mind.
          </h2>
          <p className="cl-ui" style={{ margin: "0 0 20px", fontSize: 15, color: T.gray, lineHeight: 1.6 }}>
            Free to use. Your sessions stay on your device. Export your ledger when you finish.
          </p>
          <Link href="/train" className="cl-ui" style={{ display: "inline-block", background: T.volt, color: T.black, textDecoration: "none", borderRadius: 999, padding: "14px 28px", fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Start your first session
          </Link>
          <form onSubmit={saveEmail} style={{ marginTop: 24, display: "flex", gap: 10, flexWrap: "wrap", maxWidth: 420 }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email for reminders (optional)"
              className="cl-ui"
              style={{ flex: 1, minWidth: 200, background: T.black, border: `1px solid ${T.line}`, borderRadius: 12, padding: "12px 14px", color: T.white, fontSize: 14 }}
            />
            <button type="submit" className="cl-ui" style={{ background: "transparent", border: `1px solid ${T.line}`, color: T.white, borderRadius: 999, padding: "12px 18px", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}>
              Save
            </button>
          </form>
          {emailSaved && (
            <p className="cl-ui" style={{ margin: "10px 0 0", fontSize: 12, color: T.cool }}>Saved. We will use this for return reminders as the product evolves.</p>
          )}
        </div>
      </section>

      <footer className="cl-ui" style={{ maxWidth: 1000, margin: "0 auto", padding: "0 20px 40px", fontSize: 11, color: T.gray, lineHeight: 1.65 }}>
        A self reflection tool, not therapy. For trauma involving abuse or assault, work with a trauma informed professional. Inspired by the publicly described structure of the Demartini Method.
      </footer>
    </div>
  );
}