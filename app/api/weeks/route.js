import { NextResponse } from "next/server";
import { supabaseAdmin, isAuthed } from "../../../lib/db";

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

  const { data: active } = await supabaseAdmin
    .from("weeks")
    .select("id")
    .in("status", ["booking", "in_progress"])
    .maybeSingle();
  if (active) {
    return NextResponse.json({ error: "A week is already open or in progress. Complete or cancel it first." }, { status: 400 });
  }

  const { data: week, error } = await supabaseAdmin
    .from("weeks")
    .insert({ label: label.trim(), event_date: eventDate || null })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ week });
}

const TRANSITIONS = {
  booking: ["in_progress", "canceled"],
  in_progress: ["completed", "canceled"],
};

export async function PATCH(req) {
  if (!isAuthed()) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { id, status } = await req.json();
  if (!id || !status) return NextResponse.json({ error: "id and status required." }, { status: 400 });

  const { data: week } = await supabaseAdmin.from("weeks").select("status").eq("id", id).maybeSingle();
  if (!week) return NextResponse.json({ error: "Week not found." }, { status: 404 });
  if (!TRANSITIONS[week.status]?.includes(status)) {
    return NextResponse.json({ error: `Can't move a week from "${week.status}" to "${status}".` }, { status: 400 });
  }

  const update = { status };
  if (status === "in_progress") update.booking_closed_at = new Date().toISOString();
  if (status === "completed") update.completed_at = new Date().toISOString();

  const { data: updated, error } = await supabaseAdmin.from("weeks").update(update).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ week: updated });
}
