# The Gauntlet

9 games, 4 combatants each, up to 9 rounds. Fewer wounds, higher glory.

Next.js (App Router) + Supabase. Public leaderboard, schedule, weekly booking,
and career history; single shared admin account for all game masters.

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
npm run dev
```

## Env vars

Set these in Vercel (Project Settings -> Environment Variables) AND in a local
`.env.local` (already gitignored, never commit it):

- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — the `service_role` key from Supabase Project
  Settings -> API. Server-only, never sent to the browser. `lib/db.js` throws
  at startup if either var is missing — there is no fallback baked in.

Optional, for the Discord posts (`lib/discord.js`). Any of these left unset
just skips that notification; nothing else changes:

- `DISCORD_ANNOUNCE_WEBHOOK_URL` — webhook for the announcements channel.
  Fires when a week is created (seats open) and when one sells out.
- `DISCORD_GLORY_WEBHOOK_URL` — webhook for the leaderboards channel. Fires
  when a week is marked `completed`, posting the podium.
- `DISCORD_SEAT_ALERTS_ROLE_ID` — the `@Seat Alerts` role. Only the
  booking-open post pings it; ping anything else and people mute the server.
- `SITE_URL` — used to build links in those posts.

A webhook URL is bound to one channel and **dies with it** — if a channel is
deleted and recreated, the old URL returns 404 and posts vanish silently. Make
each one under Edit Channel -> Integrations -> Webhooks.

## Structure

- `app/page.js` / `app/schedule/page.js` — the **Legacy Event**: the original,
  permanently-archived tournament that predates the weekly system. Always
  scoped to `week_id IS NULL`.
- `app/weeks/page.js`, `app/weeks/[weekId]/page.js`,
  `app/weeks/[weekId]/schedule/page.js` — the recurring weekly events: a list
  of weeks, a weekly leaderboard, and a weekly schedule browser.
- `app/book/page.js` — public booking page. Lets someone reserve a spot for
  whichever week currently has `status = 'booking'`, by name (no accounts) —
  matches an existing combatant by name or creates a new persistent one.
- `app/players/page.js`, `app/players/[playerId]/page.js` — career leaderboard
  and per-combatant profile, aggregated across every week (Legacy Event
  results are shown separately, not merged in).
- `app/admin/page.js` — admin dashboard (client component): roster, games,
  opening/closing weeks, matchmaking, tracker, match result entry. A
  "Manage: Legacy Event / Manage: Week N" toggle decides which event's data
  the Matchmaking/Tracker/Results panels operate on.
- `app/api/*` — API routes; writes require the `gauntlet_admin_session`
  cookie, except `POST /api/bookings` (the public booking action itself).
- `lib/matchmaking.js` — `randomizeAssignments()`, the bulk-assign heuristic
  used by the admin Randomizer (greedy clustering into the fullest eligible
  game, 50 random-order attempts).
- `lib/db.js` — Supabase client + auth helper (server-only).

## Data model

- `players` — persistent, global roster shared by the Legacy Event and every
  week. No cap on roster size.
- `games` — the 9 fixed stations, shared by every event.
- `weeks` — one row per recurring event: `status` moves
  `booking -> in_progress -> completed` (or `canceled`). Only one week may be
  `booking` or `in_progress` at a time.
- `bookings` — a public RSVP: `(week_id, player_id)`, unique per week.
- `schedule` / `results` — round assignments and match placements, each with
  a nullable `week_id`. `NULL` means the Legacy Event; a real id scopes a row
  to that week. "Already played this game" and "already assigned this round"
  are enforced per `(week_id)` — history resets each new week.

## Deploying

Deployed on Vercel. If this repo is connected to a Vercel project via Git
integration, pushing to the production branch auto-deploys. Otherwise deploy
manually with the Vercel CLI or dashboard. Schema changes are run by hand in
the Supabase SQL editor — there are no migration files in this repo.
