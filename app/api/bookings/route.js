import { NextResponse } from "next/server";
import { supabaseAdmin, isAuthed } from "../../../lib/db";

export const dynamic = "force-dynamic";
const CAPACITY = 36;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const weekId = searchParams.get("weekId");
  if (!weekId) return NextResponse.json({ error: "weekId required." }, { status: 400 });

  // Who booked is admin-only. The public side gets a count and nothing else —
  // otherwise the names are still readable straight off the network tab.
  if (!isAuthed()) {
    const { count, error } = await supabaseAdmin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("week_id", weekId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ booked: count || 0, capacity: CAPACITY });
  }

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("id,week_id,player_id,created_at,players(name,image_url)")
    .eq("week_id", weekId)
    .order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bookings: data || [], booked: (data || []).length, capacity: CAPACITY });
}

export async function POST(req) {
  // Bookings are confirmed by an admin after payment clears, so this is no
  // longer a public action — otherwise the paid form is trivially bypassed.
  if (!isAuthed()) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { weekId, playerId, name } = await req.json();
  if (!weekId || (!playerId && !name)) {
    return NextResponse.json({ error: "weekId and either playerId or name required." }, { status: 400 });
  }

  const { data: week } = await supabaseAdmin.from("weeks").select("status").eq("id", weekId).maybeSingle();
  if (!week) return NextResponse.json({ error: "That week doesn't exist." }, { status: 404 });
  if (week.status === "completed" || week.status === "canceled") {
    return NextResponse.json({ error: "That week is already finished." }, { status: 400 });
  }

  const { count } = await supabaseAdmin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("week_id", weekId);
  if ((count || 0) >= CAPACITY) {
    return NextResponse.json({ error: "This week is fully booked." }, { status: 400 });
  }

  let resolvedPlayerId = playerId;
  if (!resolvedPlayerId) {
    const trimmed = name.trim();
    if (!trimmed) return NextResponse.json({ error: "Name is required." }, { status: 400 });

    // Escape ILIKE wildcards so a name containing "%" or "_" can only ever
    // match itself, not fuzzy-match (or enumerate) other players by prefix.
    const escaped = trimmed.replace(/[%_\\]/g, (c) => `\\${c}`);
    const { data: existing } = await supabaseAdmin
      .from("players")
      .select("id")
      .ilike("name", escaped)
      .eq("is_filler", false)
      .maybeSingle();
    if (existing) {
      resolvedPlayerId = existing.id;
    } else {
      const { data: created, error: createErr } = await supabaseAdmin
        .from("players")
        .insert({ name: trimmed, image_url: null, is_filler: false })
        .select()
        .single();
      if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 });
      resolvedPlayerId = created.id;
    }
  }

  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .insert({ week_id: weekId, player_id: resolvedPlayerId })
    .select("id,week_id,player_id,created_at,players(name,image_url)")
    .single();
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "You're already booked for this week." }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ booking });
}

export async function DELETE(req) {
  if (!isAuthed()) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const { error } = await supabaseAdmin.from("bookings").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
