import { supabaseAdmin } from "../lib/db";
import Nav from "./Nav";

export const dynamic = "force-dynamic";

function Avatar({ image, name }) {
  if (image) return <img className="avatar" src={image} alt={name} />;
  const initial = (name || "?").trim()[0]?.toUpperCase() || "?";
  return <div className="avatar placeholder">{initial}</div>;
}

export default async function LeaderboardPage() {
  const { data: players } = await supabaseAdmin
    .from("players")
    .select("id,name,image_url")
    .eq("is_filler", false);
  const { data: results } = await supabaseAdmin.from("results").select("player_id,placement");
  const { data: games } = await supabaseAdmin.from("games").select("id");

  const stats = {};
  (players || []).forEach((p) => {
    stats[p.id] = { id: p.id, name: p.name, image: p.image_url, wounds: 0, played: 0 };
  });
  (results || []).forEach((r) => {
    if (!stats[r.player_id]) return;
    stats[r.player_id].wounds += r.placement;
    stats[r.player_id].played += 1;
  });
  const ranked = Object.values(stats).sort((a, b) => a.wounds - b.wounds || b.played - a.played);
  const totalGames = (games || []).length;

  return (
    <div className="wrap">
      <Nav />
      <div className="panel">
        <h2>Leaderboard</h2>
        <p className="hint">
          Ranked by fewest wounds. 1st place = 1 wound, 2nd = 2, 3rd = 3, 4th = 4. Ties broken by
          games played.
        </p>
        {ranked.length === 0 ? (
          <div className="empty">No combatants yet.</div>
        ) : (
          <table className="lb">
            <thead>
              <tr>
                <th></th>
                <th>Combatant</th>
                <th>Wounds</th>
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
                      <span>{s.name}</span>
                    </div>
                  </td>
                  <td className="wounds">{s.wounds}</td>
                  <td>
                    {s.played} / {totalGames}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
