import { NextResponse } from "next/server";
import { supabaseAdmin, isAuthed } from "../../../lib/db";
import { generateSchedule } from "../../../lib/schedule";

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

  const need = 36 - (realPlayers || []).length;
  let fillerIds = [];
  if (need > 0) {
    const fillerRows = Array.from({ length: need }).map(() => ({
      name: "Filler Slot",
      is_filler: true,
    }));
    const { data: inserted, error: fErr } = await supabaseAdmin.from("players").insert(fillerRows).select("id");
    if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 });
    fillerIds = (inserted || []).map((p) => p.id);
  }

  const allPlayerIds = [...(realPlayers || []).map((p) => p.id), ...fillerIds];

  const schedule = generateSchedule(allPlayerIds, gameIds);

  // Clear old schedule + results, insert new schedule.
  await supabaseAdmin.from("results").delete().neq("round", -1);
  await supabaseAdmin.from("schedule").delete().neq("round", -1);

  const rows = [];
  Object.entries(schedule).forEach(([round, byGame]) => {
    Object.entries(byGame).forEach(([gameId, group]) => {
      group.forEach((playerId) => {
        rows.push({ round: parseInt(round, 10), game_id: gameId, player_id: playerId });
      });
    });
  });
  if (rows.length > 0) {
    const { error: sErr } = await supabaseAdmin.from("schedule").insert(rows);
    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rounds: gameIds.length, players: allPlayerIds.length });
}
