import { NextResponse } from "next/server";
import { supabaseAdmin, isAuthed } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function POST(req) {
  if (!isAuthed()) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { round, gameId, playerId, weekId } = await req.json();
  if (round === undefined || !gameId || !playerId || !weekId) {
    return NextResponse.json({ error: "round, gameId, playerId and weekId required." }, { status: 400 });
  }

  const { data: alreadyThisRound } = await supabaseAdmin
    .from("schedule")
    .select("game_id")
    .eq("week_id", weekId)
    .eq("round", round)
    .eq("player_id", playerId)
    .maybeSingle();
  if (alreadyThisRound) {
    return NextResponse.json({ error: "This player is already assigned to a game this round." }, { status: 400 });
  }

  const { data: alreadyPlayed } = await supabaseAdmin
    .from("schedule")
    .select("round")
    .eq("week_id", weekId)
    .eq("game_id", gameId)
    .eq("player_id", playerId)
    .maybeSingle();
  if (alreadyPlayed) {
    return NextResponse.json({ error: "This player has already played that game this week." }, { status: 400 });
  }

  const { count } = await supabaseAdmin
    .from("schedule")
    .select("player_id", { count: "exact", head: true })
    .eq("week_id", weekId)
    .eq("round", round)
    .eq("game_id", gameId);
  // Seat limit is per game now — some seat six or eight, Rhino Hero seats four.
  const { data: g } = await supabaseAdmin
    .from("games")
    .select("name,max_players")
    .eq("id", gameId)
    .maybeSingle();
  const cap = g?.max_players || 4;
  if ((count || 0) >= cap) {
    return NextResponse.json(
      { error: `${g?.name || "That game"} already has its ${cap} players this round.` },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("schedule")
    .insert({ round, game_id: gameId, player_id: playerId, week_id: weekId });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  if (!isAuthed()) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const round = searchParams.get("round");
  const gameId = searchParams.get("gameId");
  const playerId = searchParams.get("playerId");
  const weekId = searchParams.get("weekId");
  if (round === null || !gameId || !playerId || !weekId) {
    return NextResponse.json({ error: "round, gameId, playerId and weekId required." }, { status: 400 });
  }

  const { data: existingResult } = await supabaseAdmin
    .from("results")
    .select("placement")
    .eq("week_id", weekId)
    .eq("round", round)
    .eq("game_id", gameId)
    .eq("player_id", playerId)
    .maybeSingle();
  if (existingResult) {
    return NextResponse.json({ error: "This player already has a recorded result — can't unassign." }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("schedule")
    .delete()
    .eq("week_id", weekId)
    .eq("round", round)
    .eq("game_id", gameId)
    .eq("player_id", playerId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
