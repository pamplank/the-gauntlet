import { NextResponse } from "next/server";
import { supabaseAdmin, isAuthed } from "../../../lib/db";
import { getSettings, SETTING_FIELDS } from "../../../lib/settings";

export const dynamic = "force-dynamic";

const ALLOWED = Object.fromEntries(SETTING_FIELDS.map((f) => [f.key, f]));

export async function GET() {
  if (!isAuthed()) return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  return NextResponse.json({ settings: await getSettings(supabaseAdmin) });
}

export async function PATCH(req) {
  if (!isAuthed()) return NextResponse.json({ error: "Not authorised." }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Could not read the request." }, { status: 400 });
  }

  const rows = [];
  for (const [key, raw] of Object.entries(body || {})) {
    // Only keys the panel knows about — this endpoint shouldn't be able to
    // write arbitrary rows into settings.
    const field = ALLOWED[key];
    if (!field) continue;

    const value = String(raw ?? "").trim();
    if (!value && !field.allowBlank) {
      return NextResponse.json({ error: `${field.label} can't be empty.` }, { status: 400 });
    }
    if (field.numeric && value) {
      const n = parseInt(value, 10);
      if (!Number.isInteger(n) || n < 1) {
        return NextResponse.json({ error: `${field.label} must be a whole number above zero.` }, { status: 400 });
      }
    }
    rows.push({ key, value, updated_at: new Date().toISOString() });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("settings").upsert(rows, { onConflict: "key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, settings: await getSettings(supabaseAdmin) });
}
