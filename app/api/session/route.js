import { NextResponse } from "next/server";
import { supabaseAdmin, isAuthed } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data: row } = await supabaseAdmin.from("admin_auth").select("id").eq("id", 1).maybeSingle();
  return NextResponse.json({ needsSetup: !row, loggedIn: isAuthed() });
}
