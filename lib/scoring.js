// Tables no longer all seat four, so raw placement can't be the wound count:
// 6th of six and 4th of four are both "last", but would cost 6 wounds and 4.
// Normalise every result onto the same 1-4 scale the site has always quoted —
// 1st always costs 1 wound, last always costs 4, whatever the table size.
//
//   wounds = 1 + (placement - 1) * 3 / (tableSize - 1)
//
// A solo/unknown table size falls back to the raw placement, which matches the
// old behaviour for any four-player result (1+3*(p-1)/3 === p).
export function woundsFor(placement, tableSize) {
  if (!placement || placement < 1) return 0;
  if (!tableSize || tableSize < 2) return placement;
  return 1 + ((placement - 1) * 3) / (tableSize - 1);
}

// How many people actually played each (round, game) — the denominator above.
// Derived from the recorded results rather than stored, so it stays correct
// even when a table runs short because someone didn't show.
export function tableSizes(results) {
  const sizes = {};
  for (const r of results) {
    const key = `${r.week_id ?? "legacy"}|${r.round}|${r.game_id}`;
    sizes[key] = (sizes[key] || 0) + 1;
  }
  return sizes;
}

export function tableKey(r) {
  return `${r.week_id ?? "legacy"}|${r.round}|${r.game_id}`;
}

// Wounds carry one decimal; a raw float renders as 12.600000000000001.
export function formatWounds(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
