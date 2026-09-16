import { supabaseAdmin } from "../../lib/db";
import { BOOKING_PRICE, BOOKING_PRICE_ORIGINAL, WEEK_CAPACITY } from "../../lib/booking";
import Nav from "../Nav";
import SectionLabel from "../SectionLabel";
import Reveal from "../Reveal";
import RegistrationForm from "./RegistrationForm";

export const dynamic = "force-dynamic";

export default async function BookPage() {
  const { data: weeks } = await supabaseAdmin
    .from("weeks")
    .select("*")
    .eq("status", "booking")
    .order("opened_at", { ascending: false })
    .limit(1);
  const week = (weeks || [])[0] || null;

  // Anything not rejected is holding a slot, whether or not it's verified yet.
  let booked = 0;
  if (week) {
    const { count } = await supabaseAdmin
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("week_id", week.id)
      .neq("status", "rejected");
    booked = count || 0;
  }
  const left = Math.max(0, WEEK_CAPACITY - booked);
  const full = week && left === 0;

  return (
    <div className="wrap">
      <Nav />
      <Reveal as="div" className="panel">
        <SectionLabel>Weekly Gauntlet</SectionLabel>
        <h2>Book a Spot</h2>

        {!week ? (
          <>
            <p className="hint">
              No week is open for booking at the moment. Keep an eye on{" "}
              <a href="/weeks">Weeks</a> — the next one goes up as soon as it's scheduled.
            </p>
            <div className="empty">Booking is currently closed.</div>
          </>
        ) : (
          <>
            <p className="hint">
              Nine games, four combatants at a table, one winner per round. Take the fewest wounds
              across the night and the leaderboard is yours.
            </p>

            <div className="book-status">
              <div className="book-week">
                <span className="book-label">Now booking</span>
                <strong>{week.label}</strong>
                {week.event_date && <span className="book-date">{week.event_date}</span>}
              </div>
              <div className="book-price">
                <span className="book-label">Entry</span>
                <span className="book-price-row">
                  {BOOKING_PRICE_ORIGINAL ? (
                    <s aria-label={`was ${BOOKING_PRICE_ORIGINAL}`}>{BOOKING_PRICE_ORIGINAL}</s>
                  ) : null}
                  <strong>{BOOKING_PRICE}</strong>
                </span>
              </div>
              <div className="book-count">
                <span className="book-number">{full ? "0" : left}</span>
                <span className="book-label">{full ? "Spots left" : left === 1 ? "Spot left" : "Spots left"}</span>
                <span className="book-of">of {WEEK_CAPACITY}</span>
              </div>
            </div>

            {full ? (
              <div className="msg err" style={{ marginTop: 4 }}>
                This week is fully booked — all {WEEK_CAPACITY} spots are taken. Check{" "}
                <a href="/weeks">Weeks</a> for the next one.
              </div>
            ) : (
              <RegistrationForm
                week={week}
                price={BOOKING_PRICE}
                priceOriginal={BOOKING_PRICE_ORIGINAL}
              />
            )}
          </>
        )}
      </Reveal>
    </div>
  );
}
