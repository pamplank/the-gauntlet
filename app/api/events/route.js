import { NextResponse } from "next/server";
import { supabaseAdmin, isAuthed } from "../../../lib/db";
import { slugify } from "../../../lib/events";

export const dynamic = "force-dynamic";

async function withCounts(events) {
  if (!events?.length) return [];
  const { data: regs } = await supabaseAdmin
    .from("event_registrations")
    .select("event_id")
    .in("event_id", events.map((e) => e.id))
    .neq("status", "rejected");
  const taken = {};
  (regs || []).forEach((r) => {
    taken[r.event_id] = (taken[r.event_id] || 0) + 1;
  });
  return events.map((e) => ({ ...e, taken: taken[e.id] || 0 }));
}

// Public. Admins see every event; everyone else only what's worth showing.
export async function GET(req) {
  const all = new URL(req.url).searchParams.get("all") === "1" && isAuthed();
  let q = supabaseAdmin.from("events").select("*").order("sort_order").order("event_date");
  if (!all) q = q.in("status", ["open", "closed"]);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: await withCounts(data) });
}

export async function POST(req) {
  if (!isAuthed()) return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  const body = await req.json();
  const name = (body.name || "").trim();
  const price = (body.price || "").trim();
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!price) return NextResponse.json({ error: "Price is required." }, { status: 400 });

  // Slugs are the public URL, so a clash has to be caught rather than
  // silently overwriting someone else's event.
  const slug = slugify(body.slug || name);
  if (!slug) return NextResponse.json({ error: "Name needs at least one letter or number." }, { status: 400 });
  const { data: clash } = await supabaseAdmin.from("events").select("id").eq("slug", slug).maybeSingle();
  if (clash) return NextResponse.json({ error: `"${slug}" is already taken — give it a different name.` }, { status: 400 });

  const cap = body.capacity === "" || body.capacity === null || body.capacity === undefined
    ? null
    : parseInt(body.capacity, 10);
  if (cap !== null && (!Number.isInteger(cap) || cap < 1)) {
    return NextResponse.json({ error: "Capacity must be a whole number, or blank for no limit." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("events")
    .insert({
      slug,
      name,
      price,
      capacity: cap,
      tagline: (body.tagline || "").trim() || null,
      event_date: body.eventDate || null,
      time_label: (body.timeLabel || "").trim() || null,
      poster_path: (body.posterPath || "").trim() || null,
      details: (body.details || "").trim() || null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data });
}

const FIELDS = {
  name: (v) => v.trim() || null,
  tagline: (v) => v.trim() || null,
  price: (v) => v.trim() || null,
  timeLabel: (v) => v.trim() || null,
  posterPath: (v) => v.trim() || null,
  details: (v) => v.trim() || null,
};
const COLUMN = { timeLabel: "time_label", posterPath: "poster_path", eventDate: "event_date" };

export async function PATCH(req) {
  if (!isAuthed()) return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "id required." }, { status: 400 });

  const update = {};
  for (const [key, clean] of Object.entries(FIELDS)) {
    if (body[key] !== undefined) update[COLUMN[key] || key] = clean(String(body[key]));
  }
  if (body.eventDate !== undefined) update.event_date = body.eventDate || null;
  if (body.capacity !== undefined) {
    const cap = body.capacity === "" || body.capacity === null ? null : parseInt(body.capacity, 10);
    if (cap !== null && (!Number.isInteger(cap) || cap < 1)) {
      return NextResponse.json({ error: "Capacity must be a whole number, or blank for no limit." }, { status: 400 });
    }
    update.capacity = cap;
  }
  if (body.status !== undefined) {
    if (!["open", "closed", "completed", "canceled"].includes(body.status)) {
      return NextResponse.json({ error: "Unknown status." }, { status: 400 });
    }
    update.status = body.status;
  }
  if (update.name === null) return NextResponse.json({ error: "Name can't be empty." }, { status: 400 });
  if (update.price === null) return NextResponse.json({ error: "Price can't be empty." }, { status: 400 });
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from("events").update(update).eq("id", body.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data });
}
