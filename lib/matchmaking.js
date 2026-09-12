// Bulk-assigns a batch of present players into this round's games at once.
// Each player must avoid games they've already played and games already at
// 4 for this round; among eligible games, prefer joining whichever already
// has the most people this round, so the group clusters into fewer, fuller
// games instead of everyone landing in a different empty one. Tries several
// random orderings and keeps whichever placed the most people.
export function randomizeAssignments(playerIds, playedGamesByPlayer, startOccupancy, gameIds) {
  let best = null;
  for (let attempt = 0; attempt < 50; attempt++) {
    const occupancy = { ...startOccupancy };
    const shuffled = playerIds.slice().sort(() => Math.random() - 0.5);
    const assignments = [];
    const unplaced = [];
    for (const pid of shuffled) {
      const played = playedGamesByPlayer[pid] || new Set();
      const eligible = gameIds.filter((g) => !played.has(g) && (occupancy[g] || 0) < 4);
      if (eligible.length === 0) {
        unplaced.push(pid);
        continue;
      }
      eligible.sort((a, b) => (occupancy[b] || 0) - (occupancy[a] || 0));
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
