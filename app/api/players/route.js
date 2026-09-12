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

  // If a schedule already exists, this is a late arrival. Rather than
  // scattering them into whatever open seat happens to exist each round
  // (which can bounce them between a different group every time), prefer
  // joining ONE existing short-handed table across all of its still-open
  // rounds — same tablemates the whole way through, just like everyone
  // else. Only if no table has room do we start a brand-new table for
  // them, padded with fresh filler seats, so the *next* late arrival has
  // somewhere consistent to join too.
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

  // Every filler seat belongs to exactly one table's rotation, and shows up
  // once per still-open round of that table — so grouping by filler ID
  // reconstructs "which seats belong to the same table" for free.
  const fillerGroups = {};
  const emptySlots = [];
  for (let r = 0; r < totalRounds; r++) {
    for (const g of games || []) {
      const key = `${r}|${g.id}`;
      if (locked.has(key)) continue;
      const info = occupancy[key];
      if (info?.fillerId) {
        fillerGroups[info.fillerId] = fillerGroups[info.fillerId] || [];
        fillerGroups[info.fillerId].push({ round: r, gameId: g.id });
      } else if (!info || info.count < 4) {
        emptySlots.push({ round: r, gameId: g.id });
      }
    }
  }

  let assignedSlots = [];
  const bestFillerId = Object.keys(fillerGroups).sort((a, b) => fillerGroups[b].length - fillerGroups[a].length)[0];

  if (bestFillerId) {
    // Join that one table for the rest of the season.
    assignedSlots = fillerGroups[bestFillerId];
    for (const slot of assignedSlots) {
      await supabaseAdmin
        .from("schedule")
        .update({ player_id: player.id })
        .eq("round", slot.round)
        .eq("game_id", slot.gameId)
        .eq("player_id", bestFillerId);
    }
  } else if (emptySlots.length > 0) {
    // No table has room — start a new one, seating them alongside three
    // fresh filler placeholders so the next late arrival finds an open
    // table here instead of scattering further.
    assignedSlots = matchLateArrivalSeats(emptySlots);
    const { data: newFillers, error: fErr } = await supabaseAdmin
      .from("players")
      .insert([
        { name: "Filler Slot", is_filler: true },
        { name: "Filler Slot", is_filler: true },
        { name: "Filler Slot", is_filler: true },
      ])
      .select("id");
    if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 });
    const rows = [];
    for (const slot of assignedSlots) {
      rows.push({ round: slot.round, game_id: slot.gameId, player_id: player.id });
      (newFillers || []).forEach((f) => rows.push({ round: slot.round, game_id: slot.gameId, player_id: f.id }));
    }
    if (rows.length > 0) {
      const { error: insErr } = await supabaseAdmin.from("schedule").insert(rows);
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  const assignedGameIds = new Set(assignedSlots.map((a) => a.gameId));
  const missedGames = (games || []).filter((g) => !assignedGameIds.has(g.id)).map((g) => g.name);

  return NextResponse.json({
    player,
    late: true,
    gamesAssigned: assignedSlots.length,
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
