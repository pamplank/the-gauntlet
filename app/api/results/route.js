import { NextResponse } from "next/server";
import { supabaseAdmin, isAuthed } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function POST(req) {
  if (!isAuthed()) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { round, gameId, placements } = await req.json();
  if (round === undefined || !gameId || !placements) {
    return NextResponse.json({ error: "round, gameId, placements required." }, { status: 400 });
  }

  await supabaseAdmin.from("results").delete().eq("round", round).eq("game_id", gameId);
  const rows = Object.entries(placements).map(([playerId, placement]) => ({
    round,
    game_id: gameId,
    player_id: playerId,
    placement,
  }));
  const { error } = await supabaseAdmin.from("results").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  if (!isAuthed()) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const round = searchParams.get("round");
  const gameId = searchParams.get("gameId");
  if (round === null || !gameId) {
    return NextResponse.json({ error: "round and gameId required." }, { status: 400 });
  }
  const { error } = await supabaseAdmin.from("results").delete().eq("round", round).eq("game_id", gameId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
