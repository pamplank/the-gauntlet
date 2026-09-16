import { NextResponse } from "next/server";
import { supabaseAdmin, isAuthed } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(req) {
  if (!isAuthed()) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const weekId = searchParams.get("weekId");
  if (!weekId) return NextResponse.json({ error: "weekId required." }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("schedule")
    .select("round,game_id,player_id")
    .eq("week_id", weekId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ schedule: data || [] });
}
