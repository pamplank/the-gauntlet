import { VENUE } from "../lib/site";

// Shots of the stations, set up before anyone arrives. Static in /public
// rather than the uploadable photo pool — the room doesn't change weekly, and
// mixing them into that pool would put them in the homepage ribbon too.
const SHOTS = [
  { src: "/venue/venue-01.webp", alt: "A Magical Athlete station laid out on a lit grid table." },
  { src: "/venue/venue-02.webp", alt: "A long table set for a card game under a low lamp." },
  { src: "/venue/venue-03.webp", alt: "The Colt Express station with its train assembled down the middle of the table." },
  { src: "/venue/venue-04.webp", alt: "A Cash and Guns table with foam guns and a hat, ready to play." },
];

export default function VenueSection() {
  return (
    <div className="venue">
      <div className="venue-copy">
        <h3>{VENUE.name}</h3>
        <p className="venue-addr">{VENUE.addressLines.join(", ")}</p>
        <p className="venue-blurb">
          A 24/7 community space in Loyola Heights — board games, food, drinks and a room that
          doesn&apos;t empty out when the last round finishes. The Gauntlet takes over the whole
          floor, with all nine stations built and lit before the first person walks in.
        </p>
        <ul className="venue-facts">
          <li>Nine themed stations, one per game</li>
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

      <div className="venue-shots">
        {SHOTS.map((s) => (
          <figure key={s.src}>
            <img src={s.src} alt={s.alt} loading="lazy" decoding="async" width="1400" height="933" />
          </figure>
        ))}
      </div>
    </div>
  );
}
