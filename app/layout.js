import "./globals.css";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import CustomCursor from "./CustomCursor";
import SiteFooter from "./SiteFooter";

// PP NeueBit ships as a single Bold cut. Declaring the range 100–900 maps every
// font-weight in the CSS onto this one face, so the browser never synthesises a
// faux-bold on top of a font that is already bold.
const neuebit = localFont({
  src: "./fonts/PPNeueBit-Bold.otf",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-display",
  // NeueBit's cap height is 0.50em against Syne's 0.67em, so at identical
  // font-sizes it rendered about a third too small. size-adjust scales the
  // glyphs without touching the line boxes, which keeps every tuned clamp()
  // in globals.css valid instead of needing all of them rewritten.
  declarations: [{ prop: "size-adjust", value: "134%" }],
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-body",
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
    <html lang="en" className={`${neuebit.variable} ${inter.variable}`}>
      <body>
        <CustomCursor />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
