# The Gauntlet

9 games, 4 combatants each, 9 rounds. Fewer wounds, higher glory.

Next.js (App Router) + Supabase. Public leaderboard and schedule, single shared
admin account for all game masters.

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in SUPABASE_SERVICE_ROLE_KEY
npm run dev
```

## Env vars

Set these in Vercel (Project Settings -> Environment Variables) AND in a local
`.env.local` (already gitignored, never commit it):

- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — the `service_role` key from Supabase Project
  Settings -> API. Server-only, never sent to the browser.

`lib/db.js` currently has fallback values baked in from the first deploy so the
app still runs even without env vars set. Once env vars are set in Vercel and
locally, it's safe to delete those fallback strings from `lib/db.js` and rotate
the Supabase service role key (Project Settings -> API -> regenerate), since
the old one has been visible in this chat.

## Structure

- `app/page.js` — public leaderboard (server component)
- `app/schedule/page.js` — public schedule browser
- `app/admin/page.js` — admin dashboard (client component): roster, games,
  schedule generation, match result entry
- `app/api/*` — API routes; writes require the `gauntlet_admin_session` cookie
- `lib/schedule.js` — the scheduling algorithm (heuristic social-golfer solver)
- `lib/db.js` — Supabase client + auth helper (server-only)

## Scheduling algorithm

Each of up to 36 players must play each of the 9 games exactly once, one game
per round, across 9 simultaneous rounds. `generateSchedule()` in
`lib/schedule.js` fills each round greedily, sampling candidate foursomes and
picking the one with the fewest prior pairings among that pool. It retries a
round up to 300 times if it paints itself into a corner. Zero-repeat pairings
aren't guaranteed at 36 players / 9 rounds (this is the "social golfer
problem"), so a small number of repeats is expected and fine.

If there are fewer than 36 real players, invisible filler players pad out the
roster so the math still works; fillers never show up in stats or the
leaderboard.

## Deploying

Deployed on Vercel. If this repo is connected to a Vercel project via Git
integration, pushing to the production branch auto-deploys. Otherwise deploy
manually with the Vercel CLI or dashboard.
