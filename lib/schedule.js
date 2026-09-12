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

// For a late arrival: given the open filler seats a new player COULD take
// (one round can only hold them in one game; one game can only take them
// once), pick the largest possible set of seats satisfying both constraints.
// Bipartite maximum matching (Kuhn's algorithm) between rounds and games —
// small enough (<=9x9) that a simple augmenting-path search is instant.
export function matchLateArrivalSeats(candidates) {
  const byRound = {};
  candidates.forEach((c) => {
    byRound[c.round] = byRound[c.round] || [];
    byRound[c.round].push(c);
  });
  const gameToRound = {};
  const roundToSeat = {};

  function tryAssign(round, visitedGames) {
    for (const cand of byRound[round]) {
      if (visitedGames.has(cand.gameId)) continue;
      visitedGames.add(cand.gameId);
      if (!(cand.gameId in gameToRound) || tryAssign(gameToRound[cand.gameId], visitedGames)) {
        gameToRound[cand.gameId] = round;
        roundToSeat[round] = cand;
        return true;
      }
    }
    return false;
  }

  Object.keys(byRound)
    .map(Number)
    .forEach((round) => tryAssign(round, new Set()));

  return Object.values(roundToSeat);
}
