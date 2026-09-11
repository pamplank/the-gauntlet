import { supabaseAdmin } from "../../lib/db";
import Nav from "../Nav";

export const dynamic = "force-dynamic";

export default async function SchedulePage({ searchParams }) {
  const activeRound = parseInt(searchParams?.round || "0", 10);

  const { data: games } = await supabaseAdmin.from("games").select("*").order("sort_order");
  const { data: schedule } = await supabaseAdmin
    .from("schedule")
    .select("round,game_id,player_id,players(name,is_filler)")
    .eq("round", activeRound);
  const { data: results } = await supabaseAdmin
    .from("results")
    .select("game_id,player_id,placement")
    .eq("round", activeRound);

  const byGame = {};
  (schedule || []).forEach((row) => {
    byGame[row.game_id] = byGame[row.game_id] || [];
    byGame[row.game_id].push(row);
  });
  const resultLookup = {};
  (results || []).forEach((r) => {
    resultLookup[r.game_id] = resultLookup[r.game_id] || {};
    resultLookup[r.game_id][r.player_id] = r.placement;
  });

  const totalRounds = (games || []).length;

  return (
    <div className="wrap">
      <Nav />
      <div className="panel">
        <h2>Games & Schedule</h2>
        {!games || games.length === 0 ? (
          <div className="empty">No games configured yet.</div>
        ) : !schedule || Object.keys(byGame).length === 0 ? (
          <>
            <div className="round-selector">
              {Array.from({ length: totalRounds }).map((_, r) => (
                <a key={r} href={`/schedule?round=${r}`} className={activeRound === r ? "active" : ""}>
                  Round {r + 1}
                </a>
              ))}
            </div>
            <div className="empty">
              Schedule hasn't been generated yet. An admin needs to generate it in the Admin tab.
            </div>
          </>
        ) : (
          <>
            <div className="round-selector">
              {Array.from({ length: totalRounds }).map((_, r) => (
                <a key={r} href={`/schedule?round=${r}`} className={activeRound === r ? "active" : ""}>
                  Round {r + 1}
                </a>
              ))}
            </div>
            <div className="games-grid">
              {games.map((g) => {
                const group = byGame[g.id] || [];
                const done = resultLookup[g.id] ? " · recorded" : "";
                return (
                  <div className="game-card" key={g.id}>
                    <h3>
                      {g.name}
                      {done}
                    </h3>
                    {group.length === 0 ? (
                      <div className="slot">— empty this round —</div>
                    ) : (
                      group.map((row) => {
                        const placement = resultLookup[g.id]?.[row.player_id];
                        return (
                          <div className="slot" key={row.player_id}>
                            <span className={row.players?.is_filler ? "filler" : ""}>
                              {row.players?.name || "Empty seat"}
                            </span>
                            <span>{placement ? "#" + placement : ""}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
