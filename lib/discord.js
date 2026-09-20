// Posts to Discord when something happens that the community should hear about.
// Server-only. A webhook URL is bound to one channel, so seat news and results
// need separate URLs — announcements and leaderboards are different channels.
//
// Webhooks die with their channel: delete or recreate a channel in Discord and
// its URL starts returning 10015 "Unknown Webhook", silently. If posts stop
// appearing, check that before anything else.
//
// Every export here is best-effort: a missing env var, a deleted webhook or a
// Discord outage must never fail the admin action that triggered it. Opening a
// week is the real work; telling Discord about it is a courtesy.
import { supabaseAdmin } from "./db";
import { WEEK_CAPACITY } from "./booking";
import { woundsFor, tableSizes, tableKey, formatWounds } from "./scoring";

const ANNOUNCE_URL = process.env.DISCORD_ANNOUNCE_WEBHOOK_URL;
const LEADERBOARD_URL = process.env.DISCORD_GLORY_WEBHOOK_URL;
const SEAT_ALERTS_ROLE_ID = process.env.DISCORD_SEAT_ALERTS_ROLE_ID;
const SITE_URL = process.env.SITE_URL || "https://the-gauntlet-arena.vercel.app";

// Discord suppresses role pings from webhooks unless the payload names the role
// explicitly. Without this the message renders the mention as plain text and
// nobody gets notified — which is the entire point of @Seat Alerts.
function allowRolePing() {
  return SEAT_ALERTS_ROLE_ID
    ? { allowed_mentions: { parse: [], roles: [SEAT_ALERTS_ROLE_ID] } }
    : { allowed_mentions: { parse: [] } };
}

function seatAlertsMention() {
  return SEAT_ALERTS_ROLE_ID ? `<@&${SEAT_ALERTS_ROLE_ID}>\n\n` : "";
}

async function post(url, body) {
  if (!url) return { skipped: "no webhook url" };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      // Logged, not thrown. The caller has already done the real work.
      console.error(`Discord webhook returned ${res.status}: ${await res.text()}`);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error("Discord webhook failed:", err.message);
    return { ok: false };
  }
}

// A new week is created straight into `booking`, so creation *is* the moment
// seats open. This is the one message that pings, and the only one that should.
export async function announceWeekOpen(week) {
  if (!week) return;
  const date = week.event_date ? `\n**${week.event_date}**` : "";
  return post(ANNOUNCE_URL, {
    content:
      `${seatAlertsMention()}**${week.label.toUpperCase()} — BOOKING IS OPEN**${date}\n\n` +
      `${WEEK_CAPACITY} seats. Nine games, four to a table, up to nine rounds.\n\n` +
      `Claim one: ${SITE_URL}/book`,
    ...allowRolePing(),
  });
}

// Deliberately does not ping. The people who wanted a seat already got the
// message above; this one exists so everyone else sees that it filled.
export async function announceSoldOut(week) {
  if (!week) return;
  return post(ANNOUNCE_URL, {
    content:
      `**${week.label.toUpperCase()} IS FULL** — all ${WEEK_CAPACITY} seats taken.\n\n` +
      `Someone always drops. Say so in #general-chat if you want their spot.`,
    allowed_mentions: { parse: [] },
  });
}

// Mirrors the ranking on /weeks/[weekId] exactly, via the same lib/scoring
// helpers: 1st place earns a recovery point (-1), losing places scale to the
// table size, and people are ranked on wounds *per game played* rather than
// the total — a total silently rewards whoever played fewest.
//
// Importing the helpers rather than reimplementing them is deliberate: this
// post drifted out of step once already, when placements stopped meaning
// wounds, and reported a podium the site disagreed with.
export async function announceWeekResults(weekId) {
  if (!LEADERBOARD_URL || !weekId) return;

  const { data: week } = await supabaseAdmin
    .from("weeks")
    .select("label")
    .eq("id", weekId)
    .maybeSingle();
  if (!week) return;

  const { data: bookings } = await supabaseAdmin
    .from("bookings")
    .select("player_id,players(name)")
    .eq("week_id", weekId);
  const { data: results } = await supabaseAdmin
    .from("results")
    .select("player_id,placement")
    .eq("week_id", weekId);

  const stats = {};
  (bookings || []).forEach((b) => {
    if (!b.players) return;
    stats[b.player_id] = { name: b.players.name, wounds: 0, played: 0 };
  });
  const sizes = tableSizes(results || []);
  (results || []).forEach((r) => {
    if (!stats[r.player_id]) return;
    stats[r.player_id].wounds += woundsFor(r.placement, sizes[tableKey(r)]);
    stats[r.player_id].played += 1;
  });

  const ranked = Object.values(stats)
    .filter((p) => p.played > 0)
    .map((p) => ({ ...p, avg: p.wounds / p.played }))
    .sort((a, b) => a.avg - b.avg || b.played - a.played);

  // A week can be completed with no results entered — a cancelled-in-practice
  // night, or one the GM never tallied. Posting an empty podium is worse than
  // posting nothing.
  if (ranked.length === 0) return;

  const medals = ["🥇", "🥈", "🥉"];
  const podium = ranked
    .slice(0, 3)
    .map(
      (p, i) =>
        `${medals[i]} **${p.name}** — ${formatWounds(Number(p.avg.toFixed(2)))} wounds per game ` +
        `(${formatWounds(p.wounds)} over ${p.played})`
    )
    .join("\n");

  return post(LEADERBOARD_URL, {
    content:
      `**${week.label.toUpperCase()} — FINAL**\n\n${podium}\n\n` +
      `${ranked.length} combatants finished. Full table: ${SITE_URL}/weeks/${weekId}`,
    allowed_mentions: { parse: [] },
  });
}
