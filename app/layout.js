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

const DESCRIPTION =
  "Nine board games, four players to a table, and a room full of strangers who won't be " +
  "strangers by the end of it. A weekly all-day gauntlet at @ RUMBLE, Quezon City.";

// Share cards need absolute URLs, and they have to stay valid long after the
// deploy that produced them — VERCEL_URL is per-deployment, so a link shared
// today would eventually point at a dead hostname. The production domain is
// the default; NEXT_PUBLIC_SITE_URL overrides it if the domain ever changes.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://the-gauntlet-arena.vercel.app";

// Absolute, not "/og.jpg": Next resolves og:url against metadataBase but
// rewrites relative image paths to the dev origin, so a relative path here
// shipped "http://localhost:3000/og.jpg" into the markup.
const OG_IMAGE = {
  url: `${SITE_URL}/og.jpg`,
  width: 1200,
  height: 630,
  alt: "Five players reaching into the middle of a board game at The Gauntlet",
};

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: "The Gauntlet",
  description: DESCRIPTION,
  // Shares on Messenger, Discord and Facebook read these rather than the
  // bare description tag.
  openGraph: {
    title: "The Gauntlet — bored to death?",
    description: DESCRIPTION,
    siteName: "The Gauntlet",
    locale: "en_PH",
    type: "website",
    url: "/",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Gauntlet — bored to death?",
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
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
