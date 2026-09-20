import { supabaseAdmin } from "../../lib/db";
import Nav from "../Nav";
import SectionLabel from "../SectionLabel";
import NowBoard from "./NowBoard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Now Playing · The Gauntlet",
  description: "Which game you're on this round, and who you're playing with.",
};

export default async function NowPage({ searchParams }) {
  // Whatever is being played: an in-progress week first, else the soonest
  // open one. The room is looking at this mid-event, not browsing history.
  const { data: weeks } = await supabaseAdmin
    .from("weeks")
    .select("id,label,status,event_date")
    .in("status", ["in_progress", "booking"])
    .order("event_date", { ascending: true });
  const week =
    (weeks || []).find((w) => w.status === "in_progress") || (weeks || [])[0] || null;

  if (!week) {
    return (
      <div className="wrap">
        <Nav />
        <div className="panel">
          <SectionLabel>Now playing</SectionLabel>
          <h2>Nothing running right now</h2>
          <p className="hint">
            No Gauntlet is in progress. See <a href="/weeks">Weeks</a> for what&apos;s next.
          </p>
        </div>
      </div>
    );
  }

  const { data: games } = await supabaseAdmin
    .from("games")
    .select("id,name,max_players,sort_order")
    .order("sort_order");
  const { data: schedule } = await supabaseAdmin
    .from("schedule")
    .select("round,game_id,player_id,players(name,image_url)")
    .eq("week_id", week.id);
  const { data: results } = await supabaseAdmin
    .from("results")
    .select("round,game_id,player_id")
    .eq("week_id", week.id);

  const rounds = [...new Set((schedule || []).map((r) => r.round))].sort((a, b) => a - b);

  // "Now" is the earliest round still being played, not the furthest one
  // seated — every round is often matched up in advance, and defaulting to the
  // last would send the whole room to the wrong table.
  const seatedPerRound = {};
  (schedule || []).forEach((r) => {
    seatedPerRound[r.round] = (seatedPerRound[r.round] || 0) + 1;
  });
  const donePerRound = {};
  (results || []).forEach((r) => {
    donePerRound[r.round] = (donePerRound[r.round] || 0) + 1;
  });
  const inPlay = rounds.find((r) => (donePerRound[r] || 0) < (seatedPerRound[r] || 0));
  const current = inPlay ?? (rounds.length ? rounds[rounds.length - 1] : 0);

  const asked = parseInt(searchParams?.round ?? "", 10);
  const round = Number.isInteger(asked) && rounds.includes(asked) ? asked : current;

  // Station number comes from sort_order so it matches the order the tables
  // are physically laid out in, and stays the same all day.
  const tables = (games || [])
    .map((g, i) => ({
      id: g.id,
      station: i + 1,
      name: g.name,
      seats: g.max_players ?? 4,
      players: (schedule || [])
        .filter((r) => r.round === round && r.game_id === g.id)
        .map((r) => r.players?.name)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
      done: (results || []).some((r) => r.round === round && r.game_id === g.id),
    }))
    // A benched game, or one nobody was seated at, isn't a table tonight.
    .filter((t) => t.seats > 0 && t.players.length > 0);

  // Who's here is derived from the week's own schedule, not the bookings
  // table — players are often added straight to the roster on the day, and
  // counting bookings showed an empty resting list all night.
  const seatedIds = new Set(
    (schedule || []).filter((r) => r.round === round).map((r) => r.player_id)
  );
  const attending = new Map();
  (schedule || []).forEach((r) => {
    if (r.players?.name) attending.set(r.player_id, r.players.name);
  });
  const resting = [...attending.entries()]
    .filter(([id]) => !seatedIds.has(id))
    .map(([, name]) => name)
    .sort((a, b) => a.localeCompare(b));

  return (
    <div className="wrap">
      <Nav />
      <NowBoard
        week={week}
        round={round}
        rounds={rounds}
        tables={tables}
        resting={resting}
      />
    </div>
  );
}
