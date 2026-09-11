import "./globals.css";
import { Cinzel } from "next/font/google";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-display",
});

export const metadata = {
  title: "The Gauntlet",
  description: "9 games, 9 rounds, 36 combatants. Fewer wounds, higher glory.",
};

export const viewport = {
  themeColor: "#15100c",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={cinzel.variable}>
      <body>
        {children}
        <footer className="site-footer">⚔</footer>
      </body>
    </html>
  );
}
