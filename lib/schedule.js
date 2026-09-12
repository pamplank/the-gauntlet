// N real players, G games (=rounds). Real players are split once into fixed
// "tables" of up to 4 (whoever's actually present, grouped together — never
// diluted with filler), and each table rotates through all 9 games together,
// one per round, via a simple cyclic offset. This guarantees — by
// construction, no search/retries needed — that every real player plays
// every game exactly once, while always playing alongside their tablemates.
// A leftover table smaller than 4 (e.g. 3 present players) just plays with
// fewer people; filler pads the empty seat(s) in a later step.
export function generateSchedule(playerIds, gameIds) {
  const rounds = gameIds.length;
  const shuffled = playerIds.slice().sort(() => Math.random() - 0.5);
  const tables = [];
  for (let i = 0; i < shuffled.length; i += 4) tables.push(shuffled.slice(i, i + 4));

  const schedule = {}; // round -> gameId -> [playerIds]
  for (let r = 0; r < rounds; r++) schedule[r] = {};

  tables.forEach((table, tableIndex) => {
    for (let r = 0; r < rounds; r++) {
      const gid = gameIds[(r + tableIndex) % gameIds.length];
      schedule[r][gid] = table;
    }
  });

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
