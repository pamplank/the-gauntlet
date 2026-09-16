import { supabaseAdmin } from "../../lib/db";
import Nav from "../Nav";
import SectionLabel from "../SectionLabel";
import Reveal from "../Reveal";
import GamesBrowser from "./GamesBrowser";

export const dynamic = "force-dynamic";

export default async function GamesPage() {
  const { data: games } = await supabaseAdmin.from("games").select("*").order("sort_order");

  return (
    <div className="wrap">
      <Nav />
      <Reveal as="div" className="panel">
        <SectionLabel>The Arena</SectionLabel>
        <h2>The Nine Games</h2>
        <p className="hint">
          Every combatant faces all nine. One game per round, four players at a time — finish
          first and take a single wound, finish last and take four.
        </p>

        {!games || games.length === 0 ? (
          <div className="empty">No games configured yet.</div>
        ) : (
          <GamesBrowser games={games} />
        )}
      </Reveal>
    </div>
  );
}
