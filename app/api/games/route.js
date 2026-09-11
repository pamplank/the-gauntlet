import { NextResponse } from "next/server";
import { supabaseAdmin, isAuthed } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await supabaseAdmin.from("games").select("*").order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ games: data });
}

export async function PATCH(req) {
  if (!isAuthed()) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { id, name } = await req.json();
  if (!id || !name || !name.trim()) return NextResponse.json({ error: "id and name required." }, { status: 400 });
  const { error } = await supabaseAdmin.from("games").update({ name: name.trim() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
