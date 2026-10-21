import { supabaseAdmin } from "../../lib/db";
import { EVENT_STATUS_LABEL, seatsLeft } from "../../lib/events";
import Nav from "../Nav";
import SectionLabel from "../SectionLabel";
import Reveal from "../Reveal";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Events · The Gauntlet",
  description: "One-off nights at @ RUMBLE — parties, socials and everything that isn't The Gauntlet.",
};

export default async function EventsPage() {
  const { data: events } = await supabaseAdmin
    .from("events")
    .select("*")
    .in("status", ["open", "closed"])
    .order("sort_order")
    .order("event_date");

  const { data: regs } = await supabaseAdmin
    .from("event_registrations")
    .select("event_id")
    .neq("status", "rejected");
  const taken = {};
  (regs || []).forEach((r) => {
    taken[r.event_id] = (taken[r.event_id] || 0) + 1;
  });

  return (
    <div className="wrap">
      <Nav />
      <Reveal as="section" className="panel">
        <SectionLabel>At @ RUMBLE</SectionLabel>
        <h2>Events</h2>
        <p className="hint">
          One-off nights at the venue. Looking for the weekly board game marathon? That&apos;s{" "}
          <a href="/book">The Gauntlet</a>.
        </p>

        {!events || events.length === 0 ? (
          <div className="empty">Nothing scheduled right now — check back soon.</div>
        ) : (
          <div className="ev-list">
            {events.map((e) => {
              const left = seatsLeft(e, taken[e.id]);
              return (
                <a className="ev-card" href={`/events/${e.slug}`} key={e.id}>
                  {e.poster_path ? (
                    <div className="ev-shot">
                      <img src={e.poster_path} alt="" loading="lazy" aria-hidden="true" />
                    </div>
                  ) : null}
                  <div className="ev-body">
                    <h3>
                      {e.name} <span className="status-pill">{EVENT_STATUS_LABEL[e.status]}</span>
                    </h3>
                    {e.tagline && <p className="ev-tag">{e.tagline}</p>}
                    <p className="ev-meta">
                      {[e.event_date, e.time_label].filter(Boolean).join(" · ")}
                    </p>
                    <p className="ev-price">
                      {e.price}
                      {left !== null && <span> · {left} left</span>}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </Reveal>
    </div>
  );
}
