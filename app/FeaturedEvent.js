// The homepage poster slot. Shows the soonest open event when there is one,
// so a new party promotes itself the moment it's created in the admin — no
// code change, no image swap. With nothing on, it falls back to The Gauntlet's
// own poster, which is what this block was before events existed.
export default function FeaturedEvent({ event }) {
  if (!event) {
    return (
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
    );
  }

  const when = [event.event_date, event.time_label].filter(Boolean).join(" · ");

  return (
    <section className="poster-block" aria-label={`${event.name} poster`}>
      {event.poster_path ? (
        <a
          className="poster-shot"
          href={`/events/${event.slug}`}
          title={`More about ${event.name}`}
        >
          <img src={event.poster_path} alt={`${event.name} poster`} />
        </a>
      ) : null}
      <div className="poster-copy">
        <p className="section-label">Also on at @ RUMBLE</p>
        <h2>{event.name}</h2>
        {event.tagline && <p>{event.tagline}</p>}
        <p className="poster-when">
          {when}
          {when ? " · " : ""}
          {event.price}
        </p>
        <a className="btn gold pill big" href={`/events/${event.slug}`}>
          Get a Ticket <span aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  );
}
