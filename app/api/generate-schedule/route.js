import { NextResponse } from "next/server";
import { supabaseAdmin, isAuthed } from "../../../lib/db";
import { generateSchedule } from "../../../lib/schedule";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!isAuthed()) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const { data: games, error: gErr } = await supabaseAdmin.from("games").select("id").order("sort_order");
  if (gErr) return NextResponse.json({ error: gErr.message }, { status: 500 });
  const gameIds = (games || []).map((g) => g.id);
  if (gameIds.length !== 9) {
    return NextResponse.json({ error: "Expected exactly 9 games configured." }, { status: 400 });
  }

  // Wipe old filler players (cascades to their schedule/results rows).
  await supabaseAdmin.from("players").delete().eq("is_filler", true);

  const { data: realPlayers, error: pErr } = await supabaseAdmin
    .from("players")
    .select("id")
    .eq("is_filler", false);
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
  const realIds = (realPlayers || []).map((p) => p.id);
  if (realIds.length === 0) {
    return NextResponse.json({ error: "Add at least one combatant before generating a schedule." }, { status: 400 });
  }

  // Schedule only the players who are actually here — packed as densely as
  // possible (up to 4 per game) so they play together instead of being
  // scattered one-per-game. A game nobody's in this round is left empty.
  const schedule = generateSchedule(realIds, gameIds);

  // Fillers only pad a short group up to 4 — never a whole game by
  // themselves. Reused across rounds (no per-filler constraints), so we
  // only need as many as the single neediest round requires.
  let maxFillersPerRound = 0;
  Object.values(schedule).forEach((byGame) => {
    let need = 0;
    Object.values(byGame).forEach((group) => (need += Math.max(0, 4 - group.length)));
    maxFillersPerRound = Math.max(maxFillersPerRound, need);
  });

  let fillerIds = [];
  if (maxFillersPerRound > 0) {
    const fillerRows = Array.from({ length: maxFillersPerRound }).map(() => ({
      name: "Filler Slot",
      is_filler: true,
    }));
    const { data: inserted, error: fErr } = await supabaseAdmin.from("players").insert(fillerRows).select("id");
    if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 });
    fillerIds = (inserted || []).map((p) => p.id);
  }

  // Clear old schedule + results, insert new schedule.
  await supabaseAdmin.from("results").delete().neq("round", -1);
  await supabaseAdmin.from("schedule").delete().neq("round", -1);

  const rows = [];
  Object.keys(schedule)
    .map(Number)
    .forEach((round) => {
      let fillerCursor = 0;
      Object.entries(schedule[round]).forEach(([gameId, group]) => {
        const padded = group.slice();
        while (padded.length < 4) padded.push(fillerIds[fillerCursor++]);
        padded.forEach((playerId) => rows.push({ round, game_id: gameId, player_id: playerId }));
      });
    });
  if (rows.length > 0) {
    const { error: sErr } = await supabaseAdmin.from("schedule").insert(rows);
    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rounds: gameIds.length, players: realIds.length });
}
