// Bulk-assigns a batch of present players into this round's games at once.
// Each player must avoid games they've already played and games already at
// their seat limit for this round; among eligible games, prefer joining
// whichever already has the most people this round, so the group clusters
// into fewer, fuller games instead of everyone landing in a different empty
// one. Tries several random orderings and keeps whichever placed the most.
//
// `capacities` maps gameId -> max players. Games not listed fall back to 4,
// which is what every game seated before per-game limits existed.
export function randomizeAssignments(playerIds, playedGamesByPlayer, startOccupancy, gameIds, capacities = {}) {
  // ?? not || — a seat count of 0 means the game is benched for this week
  // (no copy on the floor), and || would read that as "unset" and use 4.
  const capOf = (g) => capacities[g] ?? 4;
  // Enough people to fill several tables means this is a full-round draw.
  const spread = playerIds.length >= gameIds.length * 2;

  let best = null;
  for (let attempt = 0; attempt < 50; attempt++) {
    const occupancy = { ...startOccupancy };
    const shuffled = playerIds.slice().sort(() => Math.random() - 0.5);
    // Most-constrained-first. Late in a week most players have played most
    // games, and seating whoever comes first strands the people with only one
    // or two legal games left — round 9 collapsed to 21 of 47 placed without
    // this. Fewest eligible games goes first; ties keep the random order.
    shuffled.sort((a, b) => {
      const ea = gameIds.filter((g) => !(playedGamesByPlayer[a] || new Set()).has(g)).length;
      const eb = gameIds.filter((g) => !(playedGamesByPlayer[b] || new Set()).has(g)).length;
      return ea - eb;
    });
    const assignments = [];
    const unplaced = [];
    for (const pid of shuffled) {
      const played = playedGamesByPlayer[pid] || new Set();
      const eligible = gameIds.filter(
        (g) => capOf(g) > 0 && !played.has(g) && (occupancy[g] || 0) < capOf(g)
      );
      if (eligible.length === 0) {
        unplaced.push(pid);
        continue;
      }
      // Two different jobs, so two different rules.
      //
      // Seating a whole roster at once: spread into whichever table has most
      // seats free. Nobody repeats a game, so packing tables early strands the
      // players who are left with only one legal game — over a 47-player day
      // that was 25 sit-outs clustering versus 4 spreading.
      //
      // Seating a few latecomers: cluster into the fullest eligible table, or
      // three arrivals open three half-empty tables nobody can run.
      eligible.sort((a, b) =>
        spread
          ? capOf(b) - (occupancy[b] || 0) - (capOf(a) - (occupancy[a] || 0))
          : (occupancy[b] || 0) - (occupancy[a] || 0) ||
            capOf(b) - (occupancy[b] || 0) - (capOf(a) - (occupancy[a] || 0))
      );
      const chosen = eligible[0];
      occupancy[chosen] = (occupancy[chosen] || 0) + 1;
      assignments.push({ playerId: pid, gameId: chosen });
    }
    if (!best || unplaced.length < best.unplaced.length) {
      best = { assignments, unplaced };
      if (unplaced.length === 0) break;
    }
  }
  return best;
}

// Total seats available in one round — what a week can actually hold.
export function totalSeats(games) {
  return (games || []).reduce((n, g) => n + (g.max_players || 4), 0);
}
