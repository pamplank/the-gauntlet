import { supabaseAdmin } from "../../lib/db";
import { woundsFor, tableSizes, tableKey, formatWounds } from "../../lib/scoring";
import Nav from "../Nav";
import SectionLabel from "../SectionLabel";
import Reveal from "../Reveal";

export const dynamic = "force-dynamic";

function Avatar({ image, name }) {
  if (image) return <img className="avatar" src={image} alt={name} />;
  const initial = (name || "?").trim()[0]?.toUpperCase() || "?";
  return <div className="avatar placeholder">{initial}</div>;
}

export default async function CareerLeaderboardPage() {
  const { data: results } = await supabaseAdmin
    .from("results")
    .select("player_id,placement,week_id,round,game_id")
    .not("week_id", "is", null);
  const playerIds = [...new Set((results || []).map((r) => r.player_id))];

  let players = [];
  if (playerIds.length > 0) {
    const { data } = await supabaseAdmin.from("players").select("id,name,image_url").in("id", playerIds);
    players = data || [];
  }

  const stats = {};
  players.forEach((p) => {
    stats[p.id] = {
      id: p.id,
      name: p.name,
      image: p.image_url,
      wounds: 0,
      played: 0,
      places: { 1: 0, 2: 0, 3: 0, 4: 0 },
    };
  });
  // Table sizes vary now, so a placement only means something relative to how
  // many sat at that table. woundsFor normalises every result onto 1-4.
  const sizes = tableSizes(results || []);
  (results || []).forEach((r) => {
    if (!stats[r.player_id]) return;
    stats[r.player_id].wounds += woundsFor(r.placement, sizes[tableKey(r)]);
    stats[r.player_id].played += 1;
    if (stats[r.player_id].places[r.placement] !== undefined) stats[r.player_id].places[r.placement] += 1;
  });
  // Same reasoning as the weekly board: career totals span different numbers
  // of games per person, so rank on the average.
  Object.values(stats).forEach((s) => {
    s.avg = s.played ? s.wounds / s.played : null;
  });
  const ranked = Object.values(stats).sort(
    (a, b) => a.avg - b.avg || b.played - a.played
  );

  return (
    <div className="wrap">
      <Nav />
      <Reveal as="div" className="panel">
        <SectionLabel>The Gauntlet</SectionLabel>
        <h2>Leaderboard</h2>
        <p className="hint">
          Totals across every week. Ranked by fewest wounds per game — 1st place costs one wound, last
          costs you four. Click a name for their full week-by-week history.
        </p>
        {ranked.length === 0 ? (
          <div className="empty">No weekly results recorded yet.</div>
        ) : (
          <table className="lb">
            <thead>
              <tr>
                <th></th>
                <th>Combatant</th>
                <th title="Average wounds per game — what the ranking uses">Per game</th>
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
                  <td className={"rank" + (i < 3 ? " top3" : "")}>{i + 1}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar image={s.image} name={s.name} />
                      <a href={`/players/${s.id}`}>{s.name}</a>
                    </div>
                  </td>
                  <td className="wounds">{s.avg === null ? "—" : s.avg.toFixed(2)}</td>
                  <td className="wounds dim">{formatWounds(s.wounds)}</td>
                  <td className="placecount">{s.places[1]}</td>
                  <td className="placecount">{s.places[2]}</td>
                  <td className="placecount">{s.places[3]}</td>
                  <td className="placecount">{s.places[4]}</td>
                  <td>{s.played}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Reveal>
    </div>
  );
}
