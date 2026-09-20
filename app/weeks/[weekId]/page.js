import { supabaseAdmin } from "../../../lib/db";
import { woundsFor, tableSizes, tableKey, formatWounds } from "../../../lib/scoring";
import Nav from "../../Nav";
import SectionLabel from "../../SectionLabel";
import Reveal from "../../Reveal";

export const dynamic = "force-dynamic";

function Avatar({ image, name }) {
  if (image) return <img className="avatar" src={image} alt={name} />;
  const initial = (name || "?").trim()[0]?.toUpperCase() || "?";
  return <div className="avatar placeholder">{initial}</div>;
}

export default async function WeekLeaderboardPage({ params }) {
  const weekId = params.weekId;
  const { data: week } = await supabaseAdmin.from("weeks").select("*").eq("id", weekId).maybeSingle();

  if (!week) {
    return (
      <div className="wrap">
        <Nav />
        <div className="panel"><div className="empty">Week not found.</div></div>
      </div>
    );
  }

  const { data: bookings } = await supabaseAdmin
    .from("bookings")
    .select("player_id,players(id,name,image_url)")
    .eq("week_id", weekId);
  const { data: results } = await supabaseAdmin
    .from("results")
    .select("player_id,placement,week_id,round,game_id")
    .eq("week_id", weekId);
  const { data: games } = await supabaseAdmin.from("games").select("id");

  const stats = {};
  (bookings || []).forEach((b) => {
    if (!b.players) return;
    stats[b.player_id] = {
      id: b.player_id,
      name: b.players.name,
      image: b.players.image_url,
      wounds: 0,
      played: 0,
      places: { 1: 0, 2: 0, 3: 0, 4: 0 },
    };
  });
  const sizes = tableSizes(results || []);
  (results || []).forEach((r) => {
    if (!stats[r.player_id]) return;
    stats[r.player_id].wounds += woundsFor(r.placement, sizes[tableKey(r)]);
    stats[r.player_id].played += 1;
    if (stats[r.player_id].places[r.placement] !== undefined) stats[r.player_id].places[r.placement] += 1;
  });
  const ranked = Object.values(stats).sort((a, b) => {
    if (a.played === 0 && b.played === 0) return 0;
    if (a.played === 0) return 1;
    if (b.played === 0) return -1;
    return a.wounds - b.wounds || b.played - a.played;
  });
  const totalGames = (games || []).length;

  return (
    <div className="wrap">
      <Nav />
      <Reveal as="div" className="panel">
        <SectionLabel>Weekly Gauntlet</SectionLabel>
        <h2>
          {week.label} <span className="status-pill">{week.status.replace("_", " ")}</span>
        </h2>
        <p className="hint">
          Ranked by fewest wounds. 1st place = 1 wound, 2nd = 2, 3rd = 3, 4th = 4.{" "}
          <a href={`/weeks/${week.id}/schedule`}>View this week's schedule</a>.
        </p>
        {ranked.length === 0 ? (
          <div className="empty">No one's booked for this week yet.</div>
        ) : (
          <table className="lb">
            <thead>
              <tr>
                <th></th>
                <th>Combatant</th>
                <th>Wounds</th>
                <th title="1st place finishes">1st</th>
                <th title="2nd place finishes">2nd</th>
                <th title="3rd place finishes">3rd</th>
                <th title="4th place finishes">4th</th>
                <th>Games Played</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((s, i) => (
                <tr key={s.id}>
                  <td className={"rank" + (i < 3 && s.played > 0 ? " top3" : "")}>{i + 1}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar image={s.image} name={s.name} />
                      <a href={`/players/${s.id}`}>{s.name}</a>
                    </div>
                  </td>
                  <td className="wounds">{formatWounds(s.wounds)}</td>
                  <td className="placecount">{s.places[1]}</td>
                  <td className="placecount">{s.places[2]}</td>
                  <td className="placecount">{s.places[3]}</td>
                  <td className="placecount">{s.places[4]}</td>
                  <td>
                    {s.played} / {totalGames}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Reveal>
    </div>
  );
}
