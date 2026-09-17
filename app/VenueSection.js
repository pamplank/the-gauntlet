import { VENUE } from "../lib/site";

// People paying to go somewhere they've never been want to see it first.
// Photos come from the same pool as the ribbon — a few shots of the room.
export default function VenueSection({ photos = [] }) {
  const shots = photos.slice(0, 4);

  return (
    <div className="venue">
      <div className="venue-copy">
        <h3>{VENUE.name}</h3>
        <p className="venue-addr">{VENUE.addressLines.join(", ")}</p>
        <p className="venue-blurb">
          A 24/7 community space in Quezon City — board games, food, drinks and a room that
          doesn&apos;t empty out when the last round finishes. The Gauntlet takes over the whole
          floor for the day, with nine stations set up before anyone arrives.
        </p>
        <ul className="venue-facts">
          <li>Nine stations, one per game</li>
          <li>Meal, unlimited popcorn, special drink and water with your ticket</li>
          <li>More food and drinks available all day</li>
          <li>Open 24/7 — stay after the last game</li>
        </ul>
        {VENUE.mapsUrl && (
          <a className="btn ghost pill" href={VENUE.mapsUrl} target="_blank" rel="noopener noreferrer">
            Open in Maps <span aria-hidden="true">→</span>
          </a>
        )}
      </div>

      {shots.length > 0 && (
        <div className={"venue-shots n" + shots.length}>
          {shots.map((p) => (
            <figure key={p.id}>
              <img src={p.url} alt="" loading="lazy" decoding="async" aria-hidden="true" />
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
