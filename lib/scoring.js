// Placement -> wounds.
//
// Winning a game earns a recovery point, which cancels a wound: 1st place is
// worth -1, not +1. Everyone else takes wounds, from 2 for runner-up up to 4
// for last. A day's score can therefore go negative, and lower is still better.
//
// Tables no longer all seat four, so the losing places are scaled to the table
// size — otherwise 6th of six would cost 6 while last of four cost 4, punishing
// the same performance differently depending on where someone sat.
//
//   1st                -> -1
//   place p (p >= 2)   -> ceil(2 + (p - 2) * 2 / (tableSize - 2))
//
// A four-player table gives -1, 2, 3, 4, so the losing places match the
// numbers the site has always quoted.
//
// The scaled value is rounded up so a score is always a whole number —
// "2.67 wounds" is hard to read on a leaderboard and harder to explain at a
// table. The cost is ties on the bigger tables: at eight seats, 3rd/4th/5th
// all cost 3 and 6th/7th/8th all cost 4. Legibility was worth more than
// separating sixth from last.
export const RECOVERY_WOUNDS = -1;

export function woundsFor(placement, tableSize) {
  if (!placement || placement < 1) return 0;
  if (placement === 1) return RECOVERY_WOUNDS;

  const size = tableSize && tableSize >= 2 ? tableSize : 4;
  // Heads-up game: the loser simply takes the maximum.
  if (size <= 2) return 4;
  return Math.ceil(2 + ((placement - 2) * 2) / (size - 2));
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
  if (n === null || n === undefined) return "—";
  const v = Number.isInteger(n) ? n : Number(n.toFixed(1));
  return v > 0 ? String(v) : String(v); // negatives keep their minus sign
}
