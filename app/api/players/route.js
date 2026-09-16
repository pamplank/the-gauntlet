import { NextResponse } from "next/server";
import { supabaseAdmin, isAuthed } from "../../../lib/db";

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

  const { data: player, error } = await supabaseAdmin
    .from("players")
    .insert({ name: name.trim(), image_url: image || null, is_filler: false })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ player });
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
