import { NextResponse } from "next/server";
import { supabaseAdmin, isAuthed } from "../../../lib/db";
import { announceWeekOpen, announceWeekResults } from "../../../lib/discord";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data: weeks, error } = await supabaseAdmin
    .from("weeks")
    .select("*")
    .order("opened_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: bookings } = await supabaseAdmin.from("bookings").select("week_id");
  const counts = {};
  (bookings || []).forEach((b) => {
    counts[b.week_id] = (counts[b.week_id] || 0) + 1;
  });

  return NextResponse.json({
    weeks: (weeks || []).map((w) => ({ ...w, bookingCount: counts[w.id] || 0 })),
  });
}

export async function POST(req) {
  if (!isAuthed()) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { label, eventDate } = await req.json();
  if (!label || !label.trim()) return NextResponse.json({ error: "Label is required." }, { status: 400 });

  // Several weeks may take bookings at once — when the nearest sells out,
  // people book the one after it. Only one week may be *in progress*, which
  // the DB enforces and PATCH checks below.
  const { data: week, error } = await supabaseAdmin
    .from("weeks")
    .insert({ label: label.trim(), event_date: eventDate || null })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // A week is created straight into `booking`, so this is the moment seats
  // open. Awaited rather than fired-and-forgotten because serverless kills
  // the function once the response is returned.
  await announceWeekOpen(week);

  return NextResponse.json({ week });
}

const TRANSITIONS = {
  booking: ["in_progress", "canceled"],
  in_progress: ["completed", "canceled"],
};

export async function PATCH(req) {
  if (!isAuthed()) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { id, status, highlight, coverPhotoId } = await req.json();
  if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });

  const { data: week } = await supabaseAdmin.from("weeks").select("status").eq("id", id).maybeSingle();
  if (!week) return NextResponse.json({ error: "Week not found." }, { status: 404 });

  // The recap is editable at any point in a week's life and has nothing to do
  // with the status machine, so it saves on its own.
  if (status === undefined) {
    const patch = {};
    if (highlight !== undefined) patch.highlight = highlight?.trim() || null;
    if (coverPhotoId !== undefined) patch.cover_photo_id = coverPhotoId || null;
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }
    const { data: saved, error } = await supabaseAdmin
      .from("weeks")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ week: saved });
  }

  if (!TRANSITIONS[week.status]?.includes(status)) {
    return NextResponse.json({ error: `Can't move a week from "${week.status}" to "${status}".` }, { status: 400 });
  }

  // Many weeks can be booking, but only one can be running — otherwise
  // matchmaking, the tracker and results have no unambiguous "current week".
  if (status === "in_progress") {
    const { data: running } = await supabaseAdmin
      .from("weeks")
      .select("id,label")
      .eq("status", "in_progress")
      .neq("id", id)
      .maybeSingle();
    if (running) {
      return NextResponse.json(
        { error: `${running.label} is still in progress. Complete or cancel it before starting another.` },
        { status: 400 }
      );
    }
  }

  const update = { status };
  if (status === "in_progress") update.booking_closed_at = new Date().toISOString();
  if (status === "completed") update.completed_at = new Date().toISOString();

  const { data: updated, error } = await supabaseAdmin.from("weeks").update(update).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Completing a week is the only status change worth announcing — nobody
  // needs a post saying the night has started, they're already in the room.
  if (status === "completed") await announceWeekResults(id);

  return NextResponse.json({ week: updated });
}
