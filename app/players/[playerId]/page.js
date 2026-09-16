import { supabaseAdmin } from "../../../lib/db";
import Nav from "../../Nav";
import Reveal from "../../Reveal";

export const dynamic = "force-dynamic";

export default async function PlayerProfilePage({ params }) {
  const playerId = params.playerId;
  const { data: player } = await supabaseAdmin.from("players").select("*").eq("id", playerId).maybeSingle();

  if (!player) {
    return (
      <div className="wrap">
        <Nav />
        <div className="panel"><div className="empty">Combatant not found.</div></div>
      </div>
    );
  }

  const { data: bookings } = await supabaseAdmin
    .from("bookings")
    .select("week_id,weeks(id,label,status,event_date)")
    .eq("player_id", playerId);
  const { data: weekResults } = await supabaseAdmin
    .from("results")
    .select("week_id,placement")
    .eq("player_id", playerId)
    .not("week_id", "is", null);
  const byWeek = {};
  (bookings || []).forEach((b) => {
    if (!b.weeks) return;
    byWeek[b.week_id] = { week: b.weeks, wounds: 0, played: 0 };
  });
  (weekResults || []).forEach((r) => {
    if (!byWeek[r.week_id]) return;
    byWeek[r.week_id].wounds += r.placement;
    byWeek[r.week_id].played += 1;
  });
  const weekRows = Object.values(byWeek).sort((a, b) => {
    const ad = a.week.event_date || "";
    const bd = b.week.event_date || "";
    return ad < bd ? 1 : ad > bd ? -1 : 0;
  });

  const careerWounds = weekRows.reduce((sum, w) => sum + w.wounds, 0);
  const careerPlayed = weekRows.reduce((sum, w) => sum + w.played, 0);

  return (
    <div className="wrap">
      <Nav />
      <Reveal as="div" className="panel">
        <h2 style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {player.image_url ? (
            <img className="avatar" src={player.image_url} alt={player.name} />
          ) : (
            <div className="avatar placeholder">{(player.name || "?")[0]?.toUpperCase()}</div>
          )}
          {player.name}
        </h2>
        <p className="hint">Career totals across every week of the recurring Gauntlet.</p>
        <table className="lb" style={{ marginBottom: 20 }}>
          <thead>
            <tr>
              <th>Weeks Attended</th>
              <th>Wounds</th>
              <th>Games Played</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{weekRows.length}</td>
              <td className="wounds">{careerWounds}</td>
              <td>{careerPlayed}</td>
            </tr>
          </tbody>
        </table>

        {weekRows.length === 0 ? (
          <div className="empty">Hasn't booked a week yet.</div>
        ) : (
          <table className="lb">
            <thead>
              <tr>
                <th>Week</th>
                <th>Status</th>
                <th>Wounds</th>
                <th>Games Played</th>
              </tr>
            </thead>
            <tbody>
              {weekRows.map((w) => (
                <tr key={w.week.id}>
                  <td><a href={`/weeks/${w.week.id}`}>{w.week.label}</a></td>
                  <td>{w.week.status.replace("_", " ")}</td>
                  <td className="wounds">{w.wounds}</td>
                  <td>{w.played}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      </Reveal>
    </div>
  );
}
