import { NextResponse } from "next/server";
import { supabaseAdmin, isAuthed } from "../../../../lib/db";
import { PROOF_BUCKET } from "../../../../lib/registration";

export const dynamic = "force-dynamic";

// Proofs live in a private bucket — they're financial records. Admins get a
// short-lived signed URL rather than the file being publicly addressable.
export async function GET(req) {
  if (!isAuthed()) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });

  const { data: reg } = await supabaseAdmin
    .from("registrations")
    .select("proof_path")
    .eq("id", id)
    .maybeSingle();
  if (!reg?.proof_path) {
    return NextResponse.json({ error: "No proof on file for that registration." }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin.storage
    .from(PROOF_BUCKET)
    .createSignedUrl(reg.proof_path, 300); // 5 minutes
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ url: data.signedUrl });
}
