import { NextResponse } from "next/server";
import { supabaseAdmin, isAuthed } from "../../../lib/db";
import { randomizeAssignments } from "../../../lib/matchmaking";

export const dynamic = "force-dynamic";

export async function POST(req) {
  if (!isAuthed()) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { round, playerIds, weekId } = await req.json();
  if (round === undefined || !Array.isArray(playerIds) || playerIds.length === 0 || !weekId) {
    return NextResponse.json({ error: "round, playerIds and weekId required." }, { status: 400 });
  }

  const { data: games } = await supabaseAdmin
    .from("games")
    .select("id,max_players")
    .order("sort_order");
  const gameIds = (games || []).map((g) => g.id);
  const capacities = Object.fromEntries((games || []).map((g) => [g.id, g.max_players ?? 4]));

  const { data: allSched } = await supabaseAdmin
    .from("schedule")
    .select("round,game_id,player_id")
    .eq("week_id", weekId);

  const playedGamesByPlayer = {};
  const occupancy = {};
  const alreadyThisRound = new Set();
  (allSched || []).forEach((row) => {
    playedGamesByPlayer[row.player_id] = playedGamesByPlayer[row.player_id] || new Set();
    playedGamesByPlayer[row.player_id].add(row.game_id);
    if (row.round === round) {
      occupancy[row.game_id] = (occupancy[row.game_id] || 0) + 1;
      alreadyThisRound.add(row.player_id);
    }
  });

  const candidates = playerIds.filter((id) => !alreadyThisRound.has(id));
  const { assignments, unplaced } = randomizeAssignments(candidates, playedGamesByPlayer, occupancy, gameIds, capacities);

  if (assignments.length > 0) {
    const rows = assignments.map((a) => ({ round, game_id: a.gameId, player_id: a.playerId, week_id: weekId }));
    const { error } = await supabaseAdmin.from("schedule").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const skipped = playerIds.filter((id) => alreadyThisRound.has(id));

  return NextResponse.json({
    assignedCount: assignments.length,
    unplacedIds: unplaced,
    skippedIds: skipped,
  });
}
