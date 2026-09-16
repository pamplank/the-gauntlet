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
  const { id, name, description, isFavorite } = await req.json();
  if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });

  const update = {};
  if (name !== undefined) {
    if (!name.trim()) return NextResponse.json({ error: "Name can't be empty." }, { status: 400 });
    update.name = name.trim();
  }
  if (description !== undefined) update.description = description.trim() || null;
  if (isFavorite !== undefined) update.is_favorite = !!isFavorite;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("games").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
