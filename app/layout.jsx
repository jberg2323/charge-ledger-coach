export const metadata = {
  title: "Charge Ledger | Train Your Perception",
  description: "A guided mental training tool with a live coach. Balance the charge. Own your mind.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0A0A0A" }}>{children}</body>
    </html>
  );
}