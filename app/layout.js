import "./globals.css";

export const metadata = {
  title: "The Gauntlet",
  description: "9 games, 9 rounds, 36 combatants. Fewer wounds, higher glory.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
