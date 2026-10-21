import { NextResponse } from "next/server";
import { supabaseAdmin, isAuthed } from "../../../lib/db";
import { PAYMENT_METHODS } from "../../../lib/registration";
import { EVENT_PROOF_BUCKET, MAX_PROOF_BYTES, EMAIL_RE, seatsLeft } from "../../../lib/events";

export const dynamic = "force-dynamic";

export async function POST(req) {
  let form;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Could not read the submitted form." }, { status: 400 });
  }
  const get = (k) => (form.get(k) || "").toString().trim();

  const eventId = get("eventId");
  if (!eventId) return NextResponse.json({ error: "No event selected." }, { status: 400 });

  const { data: event } = await supabaseAdmin
    .from("events")
    .select("id,name,status,capacity")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return NextResponse.json({ error: "That event no longer exists." }, { status: 404 });
  if (event.status !== "open") {
    return NextResponse.json({ error: "Booking has closed for this one." }, { status: 400 });
  }

  // Only worth counting when there's a limit to hit.
  if (event.capacity) {
    const { count } = await supabaseAdmin
      .from("event_registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .neq("status", "rejected");
    if (seatsLeft(event, count || 0) === 0) {
      return NextResponse.json({ error: "This one is fully booked." }, { status: 400 });
    }
  }

  for (const f of ["fullName", "contactNumber", "email", "referenceNumber"]) {
    if (!get(f)) return NextResponse.json({ error: "Please fill in every required field." }, { status: 400 });
  }
  if (!EMAIL_RE.test(get("email"))) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  const paymentMethod = get("paymentMethod");
  if (!PAYMENT_METHODS.some((m) => m.id === paymentMethod)) {
    return NextResponse.json({ error: "Please choose how you paid." }, { status: 400 });
  }
  if (get("agreedPrivacy") !== "true") {
    return NextResponse.json({ error: "Please accept the privacy notice." }, { status: 400 });
  }

  const proof = form.get("proof");
  if (!proof || typeof proof === "string" || proof.size === 0) {
    return NextResponse.json({ error: "Please attach your proof of payment." }, { status: 400 });
  }
  if (proof.size > MAX_PROOF_BYTES) {
    return NextResponse.json({ error: "That image is over 10 MB. Please upload a smaller one." }, { status: 400 });
  }
  if (!/^image\//.test(proof.type || "")) {
    return NextResponse.json({ error: "Proof of payment must be an image." }, { status: 400 });
  }

  const ext = (proof.name || "").split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const objectPath = `events/${eventId}/${crypto.randomUUID()}.${ext}`;
  const bytes = Buffer.from(await proof.arrayBuffer());

  const { error: upErr } = await supabaseAdmin.storage
    .from(EVENT_PROOF_BUCKET)
    .upload(objectPath, bytes, { contentType: proof.type, upsert: false });
  if (upErr) {
    return NextResponse.json({ error: `Could not save your proof of payment: ${upErr.message}` }, { status: 500 });
  }

  const { error } = await supabaseAdmin.from("event_registrations").insert({
    event_id: eventId,
    full_name: get("fullName"),
    contact_number: get("contactNumber"),
    email: get("email").toLowerCase(),
    payment_method: paymentMethod,
    reference_number: get("referenceNumber"),
    proof_path: objectPath,
    agreed_privacy: true,
  });
  if (error) {
    // Never leave an orphaned upload behind when the row fails to write.
    await supabaseAdmin.storage.from(EVENT_PROOF_BUCKET).remove([objectPath]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, event: event.name });
}

export async function GET(req) {
  if (!isAuthed()) return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  const eventId = new URL(req.url).searchParams.get("eventId");
  let q = supabaseAdmin.from("event_registrations").select("*").order("created_at", { ascending: false });
  if (eventId) q = q.eq("event_id", eventId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ registrations: data || [] });
}

export async function PATCH(req) {
  if (!isAuthed()) return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  const { id, status, notes } = await req.json();
  if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });

  const update = {};
  if (status !== undefined) {
    if (!["pending", "confirmed", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    update.status = status;
  }
  if (notes !== undefined) update.notes = notes.trim() || null;
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("event_registrations").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
