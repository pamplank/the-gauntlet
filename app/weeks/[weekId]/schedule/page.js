import { supabaseAdmin } from "../../../../lib/db";
import Nav from "../../../Nav";
import SectionLabel from "../../../SectionLabel";
import Reveal from "../../../Reveal";

export const dynamic = "force-dynamic";

export default async function WeekSchedulePage({ params, searchParams }) {
  const weekId = params.weekId;
  const activeRound = parseInt(searchParams?.round || "0", 10);

  const { data: week } = await supabaseAdmin.from("weeks").select("*").eq("id", weekId).maybeSingle();
  if (!week) {
    return (
      <div className="wrap">
        <Nav />
        <div className="panel"><div className="empty">Week not found.</div></div>
      </div>
    );
  }

  const { data: games } = await supabaseAdmin.from("games").select("*").order("sort_order");
  const { data: schedule } = await supabaseAdmin
    .from("schedule")
    .select("round,game_id,player_id,players(name,is_filler)")
    .eq("round", activeRound)
    .eq("week_id", weekId);
  const { data: results } = await supabaseAdmin
    .from("results")
    .select("game_id,player_id,placement")
    .eq("round", activeRound)
    .eq("week_id", weekId);

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
      <Reveal as="div" className="panel">
        <SectionLabel>Weekly Gauntlet</SectionLabel>
        <h2>{week.label} — Games &amp; Schedule</h2>
        {!games || games.length === 0 ? (
          <div className="empty">No games configured yet.</div>
        ) : (
          <>
            <div className="round-selector">
              {Array.from({ length: totalRounds }).map((_, r) => (
                <a
                  key={r}
                  href={`/weeks/${weekId}/schedule?round=${r}`}
                  className={activeRound === r ? "active" : ""}
                >
                  Round {r + 1}
                </a>
              ))}
            </div>
            {Object.keys(byGame).length === 0 ? (
              <div className="empty">No one's been placed into a game for this round yet.</div>
            ) : (
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
            )}
          </>
        )}
      </Reveal>
    </div>
  );
}
