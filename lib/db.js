import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Server-only. Never imported from a "use client" file.
// Required env vars — set these in Vercel Project Settings -> Environment
// Variables, and in a local .env.local for Claude Code / next dev.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set as environment variables.");
}

export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export const SESSION_COOKIE = "gauntlet_admin_session";
export const SESSION_VALUE = "gm-authenticated-v1";

export function isAuthed() {
  const store = cookies();
  return store.get(SESSION_COOKIE)?.value === SESSION_VALUE;
}

export const PLACE_WOUNDS = { 1: 1, 2: 2, 3: 3, 4: 4 };
