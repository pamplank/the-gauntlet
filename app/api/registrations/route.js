import { NextResponse } from "next/server";
import { supabaseAdmin, isAuthed } from "../../../lib/db";
import { WEEK_CAPACITY } from "../../../lib/booking";
import {
  AGE_RANGES,
  GENDERS,
  JOINING_OPTIONS,
  HEARD_FROM_OPTIONS,
  PAYMENT_METHODS,
  PROOF_BUCKET,
  MAX_PROOF_BYTES,
} from "../../../lib/registration";

export const dynamic = "force-dynamic";

const REQUIRED_TEXT = ["fullName", "nickname", "contactNumber", "referenceNumber"];

export async function POST(req) {
  let form;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Could not read the submitted form." }, { status: 400 });
  }

  const get = (k) => (form.get(k) || "").toString().trim();
  const weekId = get("weekId");
  if (!weekId) return NextResponse.json({ error: "No week selected." }, { status: 400 });

  // The week has to actually be open, and not already full.
  const { data: week } = await supabaseAdmin
    .from("weeks")
    .select("id,label,status")
    .eq("id", weekId)
    .maybeSingle();
  if (!week) return NextResponse.json({ error: "That week no longer exists." }, { status: 404 });
  if (week.status !== "booking") {
    return NextResponse.json({ error: "Registration has closed for this week." }, { status: 400 });
  }

  const { count: taken } = await supabaseAdmin
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("week_id", weekId)
    .neq("status", "rejected");
  if ((taken || 0) >= WEEK_CAPACITY) {
    return NextResponse.json({ error: "This week is fully booked." }, { status: 400 });
  }

  for (const field of REQUIRED_TEXT) {
    if (!get(field)) {
      return NextResponse.json({ error: "Please fill in every required field." }, { status: 400 });
    }
  }

  const ageRange = get("ageRange");
  const gender = get("gender");
  if (!AGE_RANGES.includes(ageRange) || !GENDERS.includes(gender)) {
    return NextResponse.json({ error: "Please choose an age range and gender." }, { status: 400 });
  }

  const joiningAs = get("joiningAs");
  if (joiningAs && !JOINING_OPTIONS.includes(joiningAs)) {
    return NextResponse.json({ error: "Invalid selection." }, { status: 400 });
  }
  const heardFrom = get("heardFrom");
  if (heardFrom && !HEARD_FROM_OPTIONS.includes(heardFrom)) {
    return NextResponse.json({ error: "Invalid selection." }, { status: 400 });
  }

  const paymentMethod = get("paymentMethod");
  if (!PAYMENT_METHODS.some((m) => m.id === paymentMethod)) {
    return NextResponse.json({ error: "Please choose how you paid." }, { status: 400 });
  }

  // Every consent is mandatory — these are the legal ones.
  if (get("agreedCancellation") !== "true" || get("agreedSafety") !== "true" || get("agreedPrivacy") !== "true") {
    return NextResponse.json(
      { error: "You must accept the cancellation policy, safety waiver and privacy notice." },
      { status: 400 }
    );
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
  const objectPath = `${weekId}/${crypto.randomUUID()}.${ext}`;
  const bytes = Buffer.from(await proof.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from(PROOF_BUCKET)
    .upload(objectPath, bytes, { contentType: proof.type, upsert: false });
  if (uploadError) {
    return NextResponse.json(
      { error: `Could not save your proof of payment: ${uploadError.message}` },
      { status: 500 }
    );
  }

  const { error } = await supabaseAdmin.from("registrations").insert({
    week_id: weekId,
    full_name: get("fullName"),
    nickname: get("nickname"),
    age_range: ageRange,
    gender,
    contact_number: get("contactNumber"),
    facebook: get("facebook") || null,
    instagram: get("instagram") || null,
    familiarity: parseInt(get("familiarity"), 10) || null,
    joining_as: joiningAs || null,
    heard_from: heardFrom === "Other" ? get("heardFromOther") || "Other" : heardFrom || null,
    payment_method: paymentMethod,
    reference_number: get("referenceNumber"),
    proof_path: objectPath,
    agreed_cancellation: true,
    agreed_safety: true,
    agreed_privacy: true,
  });

  if (error) {
    // Don't leave an orphaned upload behind if the row failed to write.
    await supabaseAdmin.storage.from(PROOF_BUCKET).remove([objectPath]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, week: week.label });
}

export async function GET(req) {
  if (!isAuthed()) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const weekId = searchParams.get("weekId");

  let q = supabaseAdmin.from("registrations").select("*").order("created_at", { ascending: false });
  if (weekId) q = q.eq("week_id", weekId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ registrations: data || [] });
}

export async function PATCH(req) {
  if (!isAuthed()) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
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

  const { data: reg, error } = await supabaseAdmin
    .from("registrations")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Confirming is what actually puts someone on the roster; rejecting has to
  // take them back off it, or a mistaken confirm can never be undone.
  if (update.status === "confirmed") {
    let playerId = reg.player_id;

    if (!playerId) {
      const name = reg.nickname || reg.full_name;
      const escaped = name.replace(/[%_\\]/g, (c) => `\\${c}`);
      const { data: existing } = await supabaseAdmin
        .from("players")
        .select("id")
        .ilike("name", escaped)
        .eq("is_filler", false)
        .maybeSingle();

      playerId = existing?.id;
      if (!playerId) {
        const { data: created, error: createErr } = await supabaseAdmin
          .from("players")
          .insert({ name, image_url: null, is_filler: false })
          .select()
          .single();
        if (createErr) {
          return NextResponse.json(
            { error: `Confirmed, but adding them to Combatants failed: ${createErr.message}` },
            { status: 500 }
          );
        }
        playerId = created.id;
      }
      await supabaseAdmin.from("registrations").update({ player_id: playerId }).eq("id", id);
    }

    // Runs on every confirm, not just the first — so re-confirming after a
    // reject puts them back on the roster. 23505 means they're already on it.
    const { error: bookErr } = await supabaseAdmin
      .from("bookings")
      .insert({ week_id: reg.week_id, player_id: playerId });
    if (bookErr && bookErr.code !== "23505") {
      return NextResponse.json(
        { error: `Confirmed, but adding them to the week failed: ${bookErr.message}` },
        { status: 500 }
      );
    }
  }

  if (update.status === "rejected" && reg.player_id) {
    const { error: unbookErr } = await supabaseAdmin
      .from("bookings")
      .delete()
      .eq("week_id", reg.week_id)
      .eq("player_id", reg.player_id);
    if (unbookErr) {
      return NextResponse.json(
        { error: `Rejected, but removing them from the week failed: ${unbookErr.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}
