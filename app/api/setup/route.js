import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin, SESSION_COOKIE, SESSION_VALUE } from "../../../lib/db";

export async function POST(req) {
  const { password } = await req.json();
  if (!password || password.length < 4) {
    return NextResponse.json({ error: "Password too short." }, { status: 400 });
  }
  const { data: existing } = await supabaseAdmin.from("admin_auth").select("id").eq("id", 1).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "Admin account already exists." }, { status: 400 });
  }
  const hash = bcrypt.hashSync(password, 10);
  const { error } = await supabaseAdmin.from("admin_auth").insert({ id: 1, password_hash: hash });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
