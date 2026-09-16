"use client";
import { BOOKING_PRICE, BOOKING_PRICE_ORIGINAL, WEEK_CAPACITY } from "../lib/booking";

export default function LandingContent({ activeWeek, booked = 0 }) {
  const left = Math.max(0, WEEK_CAPACITY - booked);
  const full = activeWeek && left === 0;
  const pct = activeWeek ? Math.round((booked / WEEK_CAPACITY) * 100) : 0;

  return (
    <div className="panel hero" id="home">
      <div className="hero-grid" aria-hidden="true" />

      <div className="hero-type">
        <span className="hero-badge">
          <span className="badge-tag">{activeWeek ? "Open" : "Live"}</span>
          {activeWeek ? "Booking Open" : "The Recurring Gauntlet"}
        </span>

        <h2 className="hero-headline">
          <span className="line">
            <span>
              <span className="word">Bored to</span> <span className="word accent">Death?</span>
            </span>
          </span>
        </h2>
        <p className="hero-sub">
          Play all day. Meet new people. Come back to life. Nine board games, four players to a
          table, and a room full of strangers who won't be strangers by the end of it.
        </p>
        <a className="hero-link" href="/players">
          See the leaderboard <span aria-hidden="true">→</span>
        </a>
      </div>

      <aside className="hero-panel">
        <p className="hero-panel-label">{activeWeek ? activeWeek.label : "No week open"}</p>
        <p className="hero-panel-date">
          {activeWeek?.event_date || (activeWeek ? "Date to be announced" : "Check back soon")}
        </p>

        <p className="hero-price">
          {BOOKING_PRICE_ORIGINAL ? (
            <>
              <s aria-label={`was ${BOOKING_PRICE_ORIGINAL}`}>{BOOKING_PRICE_ORIGINAL}</s>{" "}
            </>
          ) : null}
          <strong>{BOOKING_PRICE}</strong>
          <em>per person</em>
        </p>

        {activeWeek ? (
          <>
            {/* At zero the bar would read as broken rather than empty, so the
                copy carries the message instead of a 0%-wide sliver. */}
            <div className="hero-bar" aria-hidden="true">
              <span style={{ width: `${pct}%` }} />
            </div>
            <p className="hero-panel-meta">
              {booked === 0
                ? `Just opened — all ${WEEK_CAPACITY} seats available`
                : full
                  ? `Fully booked — all ${WEEK_CAPACITY} seats taken`
                  : `${booked} of ${WEEK_CAPACITY} seats taken — ${left} left`}
            </p>
          </>
        ) : null}

        {activeWeek && !full ? (
          <a className="btn gold pill big hero-cta" href="/book">
            Book Now <span aria-hidden="true">→</span>
          </a>
        ) : (
          <button className="btn ghost pill big hero-cta" disabled>
            {full ? "Fully Booked" : "No Week Open Right Now"}
          </button>
        )}

        <p className="hero-panel-fine">
          GCash or GoTyme · your spot is confirmed once we verify your payment
        </p>
      </aside>
    </div>
  );
}
