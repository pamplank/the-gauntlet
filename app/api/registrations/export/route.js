import { NextResponse } from "next/server";
import { supabaseAdmin, isAuthed } from "../../../../lib/db";

export const dynamic = "force-dynamic";

const COLUMNS = [
  ["created_at", "Submitted"],
  ["status", "Status"],
  ["full_name", "Full Name"],
  ["nickname", "Nickname"],
  ["age_range", "Age Range"],
  ["gender", "Gender"],
  ["contact_number", "Contact Number"],
  ["email", "Email"],
  ["facebook", "Facebook"],
  ["instagram", "Instagram"],
  ["familiarity", "Board Game Familiarity"],
  ["joining_as", "Joining As"],
  ["heard_from", "Heard About Us From"],
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
  if (!isAuthed()) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const weekId = searchParams.get("weekId");

  let q = supabaseAdmin.from("registrations").select("*").order("created_at", { ascending: false });
  if (weekId) q = q.eq("week_id", weekId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let label = "all-weeks";
  if (weekId) {
    const { data: week } = await supabaseAdmin.from("weeks").select("label").eq("id", weekId).maybeSingle();
    if (week?.label) label = week.label.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  }

  const header = COLUMNS.map(([, title]) => cell(title)).join(",");
  const rows = (data || []).map((r) => COLUMNS.map(([key]) => cell(r[key])).join(","));
  // BOM so Excel opens UTF-8 names correctly.
  const csv = "﻿" + [header, ...rows].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gauntlet-registrations-${label}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
