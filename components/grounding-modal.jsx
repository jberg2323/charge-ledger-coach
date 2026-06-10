"use client";

const T = {
  black: "#0A0A0A",
  surface: "#1C1C1C",
  white: "#FFFFFF",
  gray: "#8A8A8A",
  line: "#333333",
  volt: "#D4FF00",
  cool: "#00E5A0",
};

export default function GroundingModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Grounding pause"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.82)",
        display: "grid",
        placeItems: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.surface,
          border: `1px solid ${T.line}`,
          borderRadius: 24,
          padding: "32px 28px",
          maxWidth: 440,
          width: "100%",
        }}
      >
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: T.cool }}>
          Grounding pause
        </p>
        <h2 style={{ margin: "10px 0 12px", fontSize: 28, fontWeight: 800, color: T.white, lineHeight: 1.1 }}>
          Slow down before you continue
        </h2>
        <p style={{ margin: 0, fontSize: 15, color: T.gray, lineHeight: 1.65 }}>
          This work can spike activation. That is normal. Take 60 seconds:
        </p>
        <ol style={{ margin: "16px 0 0", paddingLeft: 20, color: T.white, fontSize: 15, lineHeight: 1.8 }}>
          <li>Feel your feet on the floor</li>
          <li>Inhale 4 counts, exhale 6 counts, repeat 5 times</li>
          <li>Name 5 things you can see around you</li>
          <li>Return only when your body feels 10% calmer</li>
        </ol>
        <p style={{ margin: "18px 0 0", fontSize: 13, color: T.gray, lineHeight: 1.55 }}>
          If you are working through abuse or trauma, pause and speak with a trauma informed professional.
        </p>
        <button
          onClick={onClose}
          style={{
            marginTop: 22,
            background: T.volt,
            color: T.black,
            border: "none",
            borderRadius: 999,
            padding: "13px 28px",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            cursor: "pointer",
            width: "100%",
          }}
        >
          I am ready to continue
        </button>
      </div>
    </div>
  );
}