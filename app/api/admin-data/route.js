import { NextResponse } from "next/server";
import { supabaseAdmin, isAuthed } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(req) {
  if (!isAuthed()) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const round = parseInt(searchParams.get("round") || "0", 10);

  const { data: games } = await supabaseAdmin.from("games").select("*").order("sort_order");
  const { data: schedule } = await supabaseAdmin
    .from("schedule")
    .select("round,game_id,player_id,players(name,is_filler)")
    .eq("round", round);
  const { data: results } = await supabaseAdmin
    .from("results")
    .select("game_id,player_id,placement")
    .eq("round", round);
  const { data: scheduleExists } = await supabaseAdmin.from("schedule").select("round").limit(1);

  return NextResponse.json({
    games: games || [],
    schedule: schedule || [],
    results: results || [],
    hasSchedule: (scheduleExists || []).length > 0,
  });
}
