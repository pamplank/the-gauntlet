import { NextResponse } from "next/server";
import { supabaseAdmin, isAuthed } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function POST(req) {
  if (!isAuthed()) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { round, playerIdA, playerIdB } = await req.json();
  if (round === undefined || !playerIdA || !playerIdB) {
    return NextResponse.json({ error: "round, playerIdA, playerIdB required." }, { status: 400 });
  }
  if (playerIdA === playerIdB) {
    return NextResponse.json({ error: "Pick two different players." }, { status: 400 });
  }

  const { data: rows, error: rowsErr } = await supabaseAdmin
    .from("schedule")
    .select("round,game_id,player_id")
    .eq("round", round)
    .in("player_id", [playerIdA, playerIdB]);
  if (rowsErr) return NextResponse.json({ error: rowsErr.message }, { status: 500 });

  const rowA = (rows || []).find((r) => r.player_id === playerIdA);
  const rowB = (rows || []).find((r) => r.player_id === playerIdB);
  if (!rowA || !rowB) {
    return NextResponse.json({ error: "Both players must be scheduled in this round." }, { status: 400 });
  }
  if (rowA.game_id === rowB.game_id) {
    return NextResponse.json({ error: "Those two are already in the same game." }, { status: 400 });
  }

  const { data: resultRows, error: resErr } = await supabaseAdmin
    .from("results")
    .select("game_id")
    .eq("round", round)
    .in("game_id", [rowA.game_id, rowB.game_id]);
  if (resErr) return NextResponse.json({ error: resErr.message }, { status: 500 });
  if ((resultRows || []).length > 0) {
    return NextResponse.json(
      { error: "One of those matches already has a recorded result — can't reassign it." },
      { status: 400 }
    );
  }

  const { error: updAErr } = await supabaseAdmin
    .from("schedule")
    .update({ player_id: playerIdB })
    .eq("round", round)
    .eq("game_id", rowA.game_id)
    .eq("player_id", playerIdA);
  if (updAErr) return NextResponse.json({ error: updAErr.message }, { status: 500 });

  const { error: updBErr } = await supabaseAdmin
    .from("schedule")
    .update({ player_id: playerIdA })
    .eq("round", round)
    .eq("game_id", rowB.game_id)
    .eq("player_id", playerIdB);
  if (updBErr) return NextResponse.json({ error: updBErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
