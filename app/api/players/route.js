import { NextResponse } from "next/server";
import { supabaseAdmin, isAuthed } from "../../../lib/db";
import { matchLateArrivalSeats } from "../../../lib/schedule";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("players")
    .select("id,name,image_url,is_filler,created_at")
    .eq("is_filler", false)
    .order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ players: data });
}

export async function POST(req) {
  if (!isAuthed()) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { name, image } = await req.json();
  if (!name || !name.trim()) return NextResponse.json({ error: "Name is required." }, { status: 400 });

  const { count } = await supabaseAdmin
    .from("players")
    .select("id", { count: "exact", head: true })
    .eq("is_filler", false);
  if ((count || 0) >= 36) {
    return NextResponse.json({ error: "Roster is full at 36 players." }, { status: 400 });
  }

  const { data: player, error } = await supabaseAdmin
    .from("players")
    .insert({ name: name.trim(), image_url: image || null, is_filler: false })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If a schedule already exists, this is a late arrival: slot them into as
  // many still-unplayed games as possible, without touching any (round, game)
  // that already has a recorded result. A game may have an open filler seat
  // to take over, or — since schedules now only staff games real players are
  // actually in — no seats at all yet, in which case we just add them fresh.
  const { data: scheduleExists } = await supabaseAdmin.from("schedule").select("round").limit(1);
  if (!scheduleExists || scheduleExists.length === 0) {
    return NextResponse.json({ player, late: false });
  }

  const { data: games } = await supabaseAdmin.from("games").select("id,name").order("sort_order");
  const totalRounds = (games || []).length;

  const { data: resultRows } = await supabaseAdmin.from("results").select("round,game_id");
  const locked = new Set((resultRows || []).map((r) => `${r.round}|${r.game_id}`));

  const { data: allSchedRows } = await supabaseAdmin
    .from("schedule")
    .select("round,game_id,player_id,players(is_filler)");
  const occupancy = {};
  (allSchedRows || []).forEach((row) => {
    const key = `${row.round}|${row.game_id}`;
    occupancy[key] = occupancy[key] || { count: 0, fillerId: null };
    occupancy[key].count += 1;
    if (row.players?.is_filler && !occupancy[key].fillerId) occupancy[key].fillerId = row.player_id;
  });

  const candidates = [];
  for (let r = 0; r < totalRounds; r++) {
    for (const g of games || []) {
      const key = `${r}|${g.id}`;
      if (locked.has(key)) continue;
      const info = occupancy[key];
      if (info?.fillerId) {
        candidates.push({ round: r, gameId: g.id, mode: "update", fillerPlayerId: info.fillerId });
      } else if (!info || info.count < 4) {
        candidates.push({ round: r, gameId: g.id, mode: "insert" });
      }
    }
  }

  const assignments = matchLateArrivalSeats(candidates);
  for (const a of assignments) {
    if (a.mode === "update") {
      await supabaseAdmin
        .from("schedule")
        .update({ player_id: player.id })
        .eq("round", a.round)
        .eq("game_id", a.gameId)
        .eq("player_id", a.fillerPlayerId);
    } else {
      await supabaseAdmin.from("schedule").insert({ round: a.round, game_id: a.gameId, player_id: player.id });
    }
  }

  const assignedGameIds = new Set(assignments.map((a) => a.gameId));
  const missedGames = (games || []).filter((g) => !assignedGameIds.has(g.id)).map((g) => g.name);

  return NextResponse.json({
    player,
    late: true,
    gamesAssigned: assignments.length,
    totalGames: (games || []).length,
    missedGames,
  });
}

export async function PATCH(req) {
  if (!isAuthed()) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { id, name, image } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const update = {};
  if (name !== undefined) {
    if (!name.trim()) return NextResponse.json({ error: "Name is required." }, { status: 400 });
    update.name = name.trim();
  }
  if (image !== undefined) {
    update.image_url = image || null;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from("players").update(update).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ player: data });
}

export async function DELETE(req) {
  if (!isAuthed()) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const { error } = await supabaseAdmin.from("players").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
