// Heuristic "social golfer problem" solver:
// N players, G games (=rounds), 4 players per game per round.
// Hard constraint: each player plays each game exactly once, one game per round.
// Soft constraint: minimize repeated pairings across rounds.
export function generateSchedule(playerIds, gameIds) {
  const rounds = gameIds.length;
  const gamesPlayed = {};
  playerIds.forEach((id) => (gamesPlayed[id] = new Set()));
  const pairCount = {};
  const pairKey = (a, b) => (a < b ? a + "|" + b : b + "|" + a);
  const bumpPair = (group) => {
    for (let i = 0; i < group.length; i++)
      for (let j = i + 1; j < group.length; j++) {
        const k = pairKey(group[i], group[j]);
        pairCount[k] = (pairCount[k] || 0) + 1;
      }
  };
  const pairScore = (group) => {
    let s = 0;
    for (let i = 0; i < group.length; i++)
      for (let j = i + 1; j < group.length; j++)
        s += pairCount[pairKey(group[i], group[j])] || 0;
    return s;
  };

  const schedule = {}; // round -> gameId -> [playerIds]
  for (let r = 0; r < rounds; r++) schedule[r] = {};

  for (let r = 0; r < rounds; r++) {
    let success = false;
    let attempt = 0;
    let fallback = null;
    while (!success && attempt < 300) {
      attempt++;
      const remaining = new Set(playerIds);
      const roundAssign = {};
      const gameOrder = gameIds.slice().sort(() => Math.random() - 0.5);
      let failed = false;
      for (const gid of gameOrder) {
        const eligible = [...remaining].filter((pid) => !gamesPlayed[pid].has(gid));
        if (eligible.length < 4) {
          failed = true;
          break;
        }
        let best = null,
          bestScore = Infinity;
        const tries = Math.min(25, Math.max(6, eligible.length));
        for (let t = 0; t < tries; t++) {
          const shuffled = eligible.slice().sort(() => Math.random() - 0.5);
          const cand = shuffled.slice(0, 4);
          const sc = pairScore(cand);
          if (sc < bestScore) {
            bestScore = sc;
            best = cand;
          }
        }
        roundAssign[gid] = best;
        best.forEach((pid) => remaining.delete(pid));
      }
      if (!failed && remaining.size === 0) {
        success = true;
        schedule[r] = roundAssign;
      } else if (!fallback) {
        fallback = roundAssign;
      }
    }
    if (!success) schedule[r] = fallback || {};
    Object.entries(schedule[r]).forEach(([gid, group]) => {
      group.forEach((pid) => gamesPlayed[pid].add(gid));
      bumpPair(group);
    });
  }
  return schedule;
}
