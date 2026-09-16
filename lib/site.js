// Real-world details for the footer. Anything with a null url is simply not
// rendered — a missing link is better than a dead one.
export const ORGANISER = "RUMBLE ROYALE";

export const VENUE = {
  name: "@ RUMBLE",
  addressLines: ["33 Xavierville Ave", "Quezon City, Metro Manila"],
  note: "Open 24/7 — stay after the last game",
  mapsUrl: "https://www.google.com/maps/place/Rumble+Royale/data=!4m2!3m1!1s0x0:0xeaa6811a532abd18",
};

export const SOCIALS = [
  { label: "Facebook", url: "https://www.facebook.com/RUMBLEROYALE" },
  { label: "Instagram", url: "https://www.instagram.com/rumbleroyaleph/" },
  { label: "Discord", url: "https://discord.gg/mvkevp6UvJ" },
];

export function liveSocials() {
  return SOCIALS.filter((s) => s.url);
}
