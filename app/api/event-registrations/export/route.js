import { NextResponse } from "next/server";
import { supabaseAdmin, isAuthed } from "../../../../lib/db";

export const dynamic = "force-dynamic";

const COLUMNS = [
  ["created_at", "Submitted"],
  ["status", "Status"],
  ["full_name", "Full Name"],
  ["contact_number", "Contact Number"],
  ["email", "Email"],
  ["payment_method", "Payment Method"],
  ["reference_number", "Reference Number"],
  ["notes", "Admin Notes"],
];

// Excel reads a leading =, +, - or @ as a formula, so prefix those with a
// quote. Everything else is standard RFC-4180 quoting.
function cell(value) {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req) {
  if (!isAuthed()) return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  const eventId = new URL(req.url).searchParams.get("eventId");

  let q = supabaseAdmin.from("event_registrations").select("*").order("created_at", { ascending: false });
  if (eventId) q = q.eq("event_id", eventId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let label = "all-events";
  if (eventId) {
    const { data: ev } = await supabaseAdmin.from("events").select("slug").eq("id", eventId).maybeSingle();
    if (ev?.slug) label = ev.slug;
  }

  const header = COLUMNS.map(([, title]) => cell(title)).join(",");
  const rows = (data || []).map((r) => COLUMNS.map(([key]) => cell(r[key])).join(","));
  // BOM so Excel opens UTF-8 names correctly.
  const csv = "\uFEFF" + [header, ...rows].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${label}-registrations.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
