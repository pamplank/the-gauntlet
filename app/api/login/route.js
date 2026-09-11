import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin, SESSION_COOKIE, SESSION_VALUE } from "../../../lib/db";

export async function POST(req) {
  const { password } = await req.json();
  const { data: row } = await supabaseAdmin.from("admin_auth").select("password_hash").eq("id", 1).maybeSingle();
  if (!row) return NextResponse.json({ error: "No admin account set up yet." }, { status: 400 });

  const ok = bcrypt.compareSync(password || "", row.password_hash);
  if (!ok) return NextResponse.json({ error: "Incorrect password." }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, SESSION_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
