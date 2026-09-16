import { supabaseAdmin } from "../lib/db";
import Nav from "./Nav";
import LandingContent from "./LandingContent";
import AboutSection from "./AboutSection";
import SectionLabel from "./SectionLabel";
import Reveal from "./Reveal";
import GamesBrowser from "./games/GamesBrowser";
import WeeksList from "./weeks/WeeksList";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { data: weeks } = await supabaseAdmin
    .from("weeks")
    .select("*")
    .order("opened_at", { ascending: false });
  const activeWeek = (weeks || []).find((w) => w.status === "booking") || null;

  const { data: games } = await supabaseAdmin.from("games").select("*").order("sort_order");

  const { data: bookings } = await supabaseAdmin.from("bookings").select("week_id");
  const counts = {};
  (bookings || []).forEach((b) => {
    counts[b.week_id] = (counts[b.week_id] || 0) + 1;
  });

  // Same source as /book: anything not rejected is holding a seat, verified or
  // not. Counting the `bookings` table instead would show more seats free in
  // the hero than the booking page offers.
  let activeBooked = 0;
  if (activeWeek) {
    const { count } = await supabaseAdmin
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("week_id", activeWeek.id)
      .neq("status", "rejected");
    activeBooked = count || 0;
  }

  const gameNames = (games || []).map((g) => g.name).filter(Boolean);

  return (
    <div className="wrap">
      <Nav />

      <LandingContent activeWeek={activeWeek} booked={activeBooked} />

      {gameNames.length > 0 && (
        <div className="marquee">
          <div className="marquee-track">
            {[...gameNames, ...gameNames].map((name, i) => (
              <span className="marquee-item" key={i}>
                ⚔ {name}
              </span>
            ))}
          </div>
        </div>
      )}

      <Reveal as="section" className="panel" id="about">
        <SectionLabel>What to expect</SectionLabel>
        <h2>Your first Gauntlet</h2>
        <p className="hint">
          Never been to something like this? Here's exactly how the day runs, and the questions
          people ask before their first one.
        </p>
        <AboutSection />
      </Reveal>

      <Reveal as="section" className="panel" id="games">
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

      <Reveal as="section" className="panel" id="weeks">
        <SectionLabel>Weekly Gauntlet</SectionLabel>
        <h2>Weeks</h2>
        <p className="hint">
          Every Gauntlet event, one week at a time. Each has its own leaderboard and schedule;
          running totals live on the <a href="/players">Leaderboard</a>.
        </p>
        <WeeksList weeks={weeks || []} counts={counts} />
      </Reveal>
    </div>
  );
}
