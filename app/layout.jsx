export const metadata = {
  title: "The Charge Ledger",
  description: "A guided reflection tool with a live coach, based on the Demartini balancing protocol.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}