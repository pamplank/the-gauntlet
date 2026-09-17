import { supabaseAdmin } from "../lib/db";
import Nav from "./Nav";
import LandingContent from "./LandingContent";
import AboutSection from "./AboutSection";
import SectionLabel from "./SectionLabel";
import Reveal from "./Reveal";
import GamesBrowser from "./games/GamesBrowser";
import VenueSection from "./VenueSection";
import PhotoRibbon from "./PhotoRibbon";
import { photoUrl, RIBBON_LIMIT } from "../lib/photos";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { data: weeks } = await supabaseAdmin
    .from("weeks")
    .select("*")
    .order("opened_at", { ascending: false });
  const activeWeek = (weeks || []).find((w) => w.status === "booking") || null;

  const { data: games } = await supabaseAdmin.from("games").select("*").order("sort_order");

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

  const { data: shots } = await supabaseAdmin
    .from("photos")
    .select("*")
    .order("sort_order")
    .limit(RIBBON_LIMIT);
  const ribbonPhotos = (shots || []).map((p) => ({
    ...p,
    url: photoUrl(supabaseAdmin, p.path),
  }));

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

      <section className="poster-block" aria-label="The Gauntlet poster">
        <a
          className="poster-shot"
          href="/poster.webp"
          target="_blank"
          rel="noopener noreferrer"
          title="Open the full poster"
        >
          <img
            src="/poster.webp"
            width="1080"
            height="1350"
            alt="Bored to Death? Enter The Gauntlet — all-day board game socials at @ RUMBLE."
          />
        </a>
        <div className="poster-copy">
          <p className="section-label">Every weekend</p>
          <h2>A whole-day social board game marathon</h2>
          <p>
            One full day, every weekend — a Saturday or a Sunday, depending on the week. Turn up on
            your own or drag everyone you know. Nine games, four to a table, new people every
            round, and a room that doesn&apos;t empty out when the last game finishes.
          </p>
          <a className="btn gold pill big" href="/book">
            Book a Spot <span aria-hidden="true">→</span>
          </a>
        </div>
      </section>

      <PhotoRibbon photos={ribbonPhotos} />

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

      <Reveal as="section" className="panel" id="venue">
        <SectionLabel>The venue</SectionLabel>
        <h2>Where it happens</h2>
        <p className="hint">
          Nine stations, one room, and somewhere you can stay long after the last game finishes.
        </p>
        <VenueSection />
      </Reveal>
    </div>
  );
}
