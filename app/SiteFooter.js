import { BOOKING_PRICE, BOOKING_PRICE_ORIGINAL } from "../lib/booking";
import { ORGANISER, VENUE, liveSocials } from "../lib/site";

export default function SiteFooter() {
  const socials = liveSocials();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="foot-grid">
        <div className="foot-where">
          <p className="section-label">Where</p>
          <h4>{VENUE.name}</h4>
          {VENUE.addressLines.map((line) => (
            <p className="foot-addr" key={line}>
              {line}
            </p>
          ))}
          {VENUE.note && <p className="foot-note">{VENUE.note}</p>}
          {VENUE.mapsUrl && (
            <a className="foot-map" href={VENUE.mapsUrl} target="_blank" rel="noopener noreferrer">
              Open in Maps <span aria-hidden="true">→</span>
            </a>
          )}
        </div>

        <div className="foot-links">
          <div>
            <h4>Explore</h4>
            <a href="/#about">About</a>
            <a href="/#games">Games</a>
            <a href="/#weeks">Weeks</a>
            <a href="/players">Leaderboard</a>
          </div>

          {/* Omitted entirely until there are real URLs — an empty column
              reads as broken, and a "#" link reads as worse. */}
          {socials.length > 0 && (
            <div>
              <h4>Follow</h4>
              {socials.map((s) => (
                <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.label}
                </a>
              ))}
            </div>
          )}

          <div>
            <h4>Policies</h4>
            <a href="/policies#privacy">Data Privacy</a>
            <a href="/policies#cancellation">Cancellation</a>
            <a href="/policies#safety">Safety &amp; Venue</a>
          </div>
        </div>

        <div className="foot-cta">
          <p className="foot-price">
            {BOOKING_PRICE_ORIGINAL ? <s>{BOOKING_PRICE_ORIGINAL}</s> : null}
            <strong>{BOOKING_PRICE}</strong>
          </p>
          <a className="btn gold pill" href="/book">
            Book a Spot <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>

      <p className="foot-bar">
        © {year} The Gauntlet · a {ORGANISER} event
      </p>
    </footer>
  );
}
