# Task: finish setting up and deploying "The Gauntlet"

You're picking up a Next.js + Supabase app called "The Gauntlet" (a tournament
tracker: 9 games, 4 players each, 9 rounds, wound-based leaderboard). The code
in this folder was scaffolded by Claude in a chat session and needs to be
pushed to GitHub, wired up to Vercel with proper env vars, and verified. Work
through the steps below in order, checking the result of each before moving
to the next. Ask me before anything destructive (force pushes, deleting
resources) but otherwise drive this yourself using git/gh/vercel CLIs.

## Current state
- Local folder: this project (Next.js App Router, plain JS, no TypeScript).
- Backend: Supabase project, ref `bbtpfmwuprjzrerszxnh`, URL
  `https://bbtpfmwuprjzrerszxnh.supabase.co`. Schema already applied
  (tables: games, players, schedule, results, admin_auth). Uses the
  `service_role` key server-side only, via `lib/db.js` — currently that file
  reads `process.env.SUPABASE_URL` and `process.env.SUPABASE_SERVICE_ROLE_KEY`
  with NO fallback, so the app will throw until those are set.
- Deployed once already via manual file upload to a Vercel project named
  `the-gauntlet-arena` under team `pamplanks-projects`, live at
  `https://the-gauntlet-arena-pamplanks-projects.vercel.app`. That deployment
  currently has the OLD service role key hardcoded in its build (baked in
  before this cleanup) — it still works today but must be replaced.
- GitHub repo `pamplank/the-gauntlet` was just created (empty, public).
- IMPORTANT: the old Supabase service role key was posted in a chat
  transcript earlier and must be treated as compromised.

## Steps

1. **Push this code to GitHub.**
   Init git in this folder if not already, commit everything, and push to
   `https://github.com/pamplank/the-gauntlet.git` on `main`. Check
   `.gitignore` already excludes `node_modules/`, `.next/`, `.env*.local`,
   `.vercel` before committing — verify none of those got staged.

2. **Rotate the Supabase service role key.**
   Check whether the Supabase CLI or Management API can regenerate a
   project's `service_role` key non-interactively. If you find a reliable
   way, use it. If not, stop and ask me to do it manually in the Supabase
   dashboard (Project Settings → API → regenerate service_role key), then
   have me paste you the new key — don't guess or fabricate a key.

3. **Set env vars in Vercel.**
   Use the Vercel CLI (`vercel link` to connect this folder to the existing
   `the-gauntlet-arena` project under the `pamplanks-projects` team if not
   already linked, then `vercel env add`) to set, for Production (and
   Preview if useful):
   - `SUPABASE_URL` = `https://bbtpfmwuprjzrerszxnh.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = the NEW rotated key from step 2
   Confirm both are set with `vercel env ls` before moving on.

4. **Connect the GitHub repo to the Vercel project.**
   Try `vercel git connect` (run inside this linked project folder) to link
   `pamplank/the-gauntlet` as the project's Git source. If that command
   isn't available in the installed CLI version, tell me and I'll connect it
   manually via Settings → Git in the Vercel dashboard instead.

5. **Trigger a fresh deploy and verify.**
   Once env vars are set and the repo is connected, push a commit (or run
   `vercel --prod` directly) to force a new production deployment that no
   longer has any key baked into the bundle. Check the deployment build logs
   for errors. Then hit the live URL and confirm:
   - `/` (leaderboard) loads without a server error
   - `/schedule` loads
   - `/admin` shows the "Set Up Admin Account" screen (since admin_auth is
     presumably still empty, or the existing login screen if it isn't)

6. **Set up local dev.**
   Copy `.env.example` to `.env.local` and fill in the same two vars from
   step 2/3 (ask me for the values if you don't already have them from step
   3). Run `npm install` and `npm run dev`, confirm it boots without the
   "must be set as environment variables" error, and hit `/` locally to
   sanity check.

7. **Report back** with: the GitHub repo URL, confirmation the Vercel
   project is Git-connected, confirmation env vars are set, and the final
   production URL, plus anything you had to stop and ask me for.

## Guardrails
- Never commit `.env.local` or any real secret to git. Never put a Supabase
  key back into `lib/db.js` or any other source file, even temporarily.
- Don't delete or overwrite the existing Vercel project unless I ask —
  reuse `the-gauntlet-arena`.
- If any CLI isn't authenticated (`gh auth status`, `vercel whoami`), walk
  me through logging in interactively rather than skipping the step.
