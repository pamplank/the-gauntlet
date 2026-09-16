import { NextResponse } from "next/server";
import { supabaseAdmin, isAuthed } from "../../../lib/db";
import {
  PHOTO_BUCKET,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS_PER_UPLOAD,
  ALLOWED_PHOTO_TYPES,
  photoUrl,
} from "../../../lib/photos";

export const dynamic = "force-dynamic";

function withUrls(rows) {
  return (rows || []).map((r) => ({ ...r, url: photoUrl(supabaseAdmin, r.path) }));
}

// Public. Pages query the table directly; this exists so the admin panel can
// refresh after an upload without a reload.
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("photos")
    .select("*")
    .order("sort_order")
    .order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ photos: withUrls(data) });
}

export async function POST(req) {
  if (!isAuthed()) return NextResponse.json({ error: "Not authorised." }, { status: 401 });

  let form;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Could not read the upload." }, { status: 400 });
  }

  const files = form.getAll("photos").filter((f) => f && typeof f !== "string" && f.size > 0);
  if (files.length === 0) {
    return NextResponse.json({ error: "Choose at least one photo." }, { status: 400 });
  }
  if (files.length > MAX_PHOTOS_PER_UPLOAD) {
    return NextResponse.json(
      { error: `Up to ${MAX_PHOTOS_PER_UPLOAD} photos at a time.` },
      { status: 400 }
    );
  }

  // Validate everything before writing anything, so one bad file in a batch
  // doesn't leave half of it uploaded.
  for (const f of files) {
    if (!ALLOWED_PHOTO_TYPES.includes(f.type)) {
      return NextResponse.json(
        { error: `"${f.name}" is not a JPEG, PNG, WebP or AVIF.` },
        { status: 400 }
      );
    }
    if (f.size > MAX_PHOTO_BYTES) {
      return NextResponse.json(
        { error: `"${f.name}" is over ${MAX_PHOTO_BYTES / 1024 / 1024} MB.` },
        { status: 400 }
      );
    }
  }

  // New photos go after whatever is already there.
  const { data: last } = await supabaseAdmin
    .from("photos")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  let next = (last?.sort_order ?? -1) + 1;

  const uploaded = [];
  for (const f of files) {
    const ext = (f.name || "").split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const objectPath = `${crypto.randomUUID()}.${ext}`;
    const bytes = Buffer.from(await f.arrayBuffer());

    const { error: upErr } = await supabaseAdmin.storage
      .from(PHOTO_BUCKET)
      .upload(objectPath, bytes, { contentType: f.type, upsert: false });
    if (upErr) {
      // Roll back the ones already written so a failed batch leaves nothing.
      if (uploaded.length) {
        await supabaseAdmin.storage.from(PHOTO_BUCKET).remove(uploaded.map((u) => u.path));
      }
      return NextResponse.json({ error: `Upload failed: ${upErr.message}` }, { status: 500 });
    }
    uploaded.push({ path: objectPath, sort_order: next++ });
  }

  const { data: rows, error } = await supabaseAdmin.from("photos").insert(uploaded).select();
  if (error) {
    await supabaseAdmin.storage.from(PHOTO_BUCKET).remove(uploaded.map((u) => u.path));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, added: rows.length, photos: withUrls(rows) });
}

export async function DELETE(req) {
  if (!isAuthed()) return NextResponse.json({ error: "Not authorised." }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const { data: row } = await supabaseAdmin
    .from("photos")
    .select("id,path")
    .eq("id", id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "That photo is already gone." }, { status: 404 });

  // Row first: a stored file with no row is invisible, but a row pointing at
  // a deleted file renders as a broken image on the public site.
  const { error } = await supabaseAdmin.from("photos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.storage.from(PHOTO_BUCKET).remove([row.path]);
  return NextResponse.json({ ok: true });
}
