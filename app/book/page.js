import { supabaseAdmin } from "../../lib/db";
import { getSettings, bookingFromSettings } from "../../lib/settings";
import { getOpenWeeks } from "../../lib/weeks";
import Nav from "../Nav";
import SectionLabel from "../SectionLabel";
import Reveal from "../Reveal";
import RegistrationForm from "./RegistrationForm";

export const dynamic = "force-dynamic";

export default async function BookPage() {
  const booking = bookingFromSettings(await getSettings(supabaseAdmin));
  const openWeeks = await getOpenWeeks(supabaseAdmin, booking.capacity);
  const bookable = openWeeks.filter((w) => !w.full);
  const soldOut = openWeeks.filter((w) => w.full);

  return (
    <div className="wrap">
      <Nav />
      <Reveal as="div" className="panel">
        <SectionLabel>Weekly Gauntlet</SectionLabel>
        <h2>Book a Spot</h2>

        {openWeeks.length === 0 ? (
          <>
            <p className="hint">
              No week is open for booking at the moment. Keep an eye on{" "}
              <a href="/weeks">Weeks</a> — the next one goes up as soon as it&apos;s scheduled.
            </p>
            <div className="empty">Booking is currently closed.</div>
          </>
        ) : (
          <>
            <p className="hint">
              Nine games, four combatants at a table, one winner per round. Take the fewest wounds
              across the day and the leaderboard is yours.
            </p>

            <div className="book-status">
              <div className="book-week">
                <span className="book-label">
                  {bookable.length > 1 ? "Weeks open" : "Now booking"}
                </span>
                <strong>
                  {bookable.length > 0
                    ? bookable.map((w) => w.label).join(" · ")
                    : "All weeks full"}
                </strong>
              </div>
              <div className="book-price">
                <span className="book-label">Entry</span>
                <span className="book-price-row">
                  {booking.priceOriginal ? (
                    <s aria-label={`was ${booking.priceOriginal}`}>{booking.priceOriginal}</s>
                  ) : null}
                  <strong>{booking.price}</strong>
                </span>
              </div>
              <div className="book-count">
                <span className="book-number">
                  {bookable.reduce((n, w) => n + w.seatsLeft, 0)}
                </span>
                <span className="book-label">Spots left</span>
                <span className="book-of">
                  across {bookable.length || openWeeks.length} week
                  {(bookable.length || openWeeks.length) === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            {soldOut.length > 0 && (
              <p className="book-soldnote">
                {soldOut.map((w) => w.label).join(" and ")}{" "}
                {soldOut.length === 1 ? "is" : "are"} sold out.
              </p>
            )}

            {bookable.length === 0 ? (
              <div className="book-soldout">
                <span className="soldout-stamp">Sold Out</span>
                <p>
                  Every open week is full — all {booking.capacity} spots each. Check{" "}
                  <a href="/weeks">Weeks</a> for the next one; they open a few days ahead.
                </p>
              </div>
            ) : (
              <RegistrationForm
                weeks={bookable}
                price={booking.price}
                priceOriginal={booking.priceOriginal}
              />
            )}
          </>
        )}
      </Reveal>
    </div>
  );
}
