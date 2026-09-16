// Box art lives as static files in /public, not in the database — these are
// 100KB–1.7MB each, and base64ing them into Postgres would mean re-sending
// ~20MB of image data on every page load.
//
// `tint` is the colour wash behind each game's row. Each was sampled from the
// box art itself (dominant saturated hue, greys and near-white discarded).
// Where a box's dominant colour was the same warm gold as the site accent, the
// secondary hue was taken instead, so nine rows stay visually distinguishable
// rather than all reading as brand gold.
//
// Adding a game: drop the art in /public, add an entry here. To pick a tint,
// sample the art's dominant saturated colour rather than guessing.
// `gallery` is optional — drop extra photos (the table mid-game, components,
// people playing it) in /public and list them here. They appear as a thumbnail
// strip beside the box art on the Games page; leave it out and nothing shows.
const GAMES = {
  cashandguns: { art: "/cash_and_guns.png", tint: "#ae282e", gallery: [] },
  camelup: { art: "/camelup.webp", tint: "#408685", gallery: [] },
  cockroachpoker: { art: "/cockroach_poker.webp", tint: "#4d98c4", gallery: [] },
  coltexpress: { art: "/colt_express.png", tint: "#ce7540", gallery: [] },
  magicalathlete: { art: "/magical_athlete.png", tint: "#e92109", gallery: [] },
  hotstreak: { art: "/hot_streak.png", tint: "#1c9263", gallery: [] },
  kingoftokyo: { art: "/kingoftokyo.png", tint: "#cba052", gallery: [] },
  excalibur: { art: "/Excalibur.webp", tint: "#76929c", gallery: [] },
  rhinohero: { art: "/rhinoheroes.png", tint: "#ecdf2e", gallery: [] },
};

const FALLBACK_TINT = "#8a6a38";

function normalise(name) {
  return (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function lookup(name) {
  const key = normalise(name);
  if (GAMES[key]) return GAMES[key];
  // "RHINO HERO" vs "Rhino Heroes" and similar near-misses
  const match = Object.keys(GAMES).find((k) => k.startsWith(key) || key.startsWith(k));
  return match ? GAMES[match] : null;
}

export function artFor(name) {
  return lookup(name)?.art || null;
}

export function tintFor(name) {
  return lookup(name)?.tint || FALLBACK_TINT;
}

export function galleryFor(name) {
  return lookup(name)?.gallery || [];
}
