import { notFound } from "next/navigation";
import { supabaseAdmin } from "../../../lib/db";
import { EVENT_STATUS_LABEL, seatsLeft, isBookable } from "../../../lib/events";
import Nav from "../../Nav";
import SectionLabel from "../../SectionLabel";
import Reveal from "../../Reveal";
import EventForm from "../EventForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { data: e } = await supabaseAdmin
    .from("events")
    .select("name,tagline,poster_path")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!e) return { title: "Event · The Gauntlet" };
  return {
    title: `${e.name} · @ RUMBLE`,
    description: e.tagline || undefined,
    openGraph: e.poster_path ? { images: [{ url: e.poster_path }] } : undefined,
  };
}

export default async function EventPage({ params }) {
  const { data: event } = await supabaseAdmin
    .from("events")
    .select("*")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!event || ["canceled"].includes(event.status)) notFound();

  const { count } = await supabaseAdmin
    .from("event_registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id)
    .neq("status", "rejected");
  const taken = count || 0;
  const left = seatsLeft(event, taken);
  const open = isBookable(event, taken);

  return (
    <div className="wrap">
      <Nav />
      <Reveal as="section" className="panel">
        <SectionLabel>At @ RUMBLE</SectionLabel>
        <h2>{event.name}</h2>
        {event.tagline && <p className="hint">{event.tagline}</p>}

        <div className="ev-head">
          {event.poster_path && (
            <a className="ev-poster" href={event.poster_path} target="_blank" rel="noopener noreferrer">
              <img src={event.poster_path} alt={`${event.name} poster`} />
            </a>
          )}
          <dl className="ev-facts">
            {event.event_date && (
              <div>
                <dt>Date</dt>
                <dd>{event.event_date}</dd>
              </div>
            )}
            {event.time_label && (
              <div>
                <dt>Time</dt>
                <dd>{event.time_label}</dd>
              </div>
            )}
            <div>
              <dt>Entrance</dt>
              <dd className="big">{event.price}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{EVENT_STATUS_LABEL[event.status]}</dd>
            </div>
            {left !== null && (
              <div>
                <dt>Spots left</dt>
                <dd className="big">{left}</dd>
              </div>
            )}
          </dl>
        </div>

        {event.details && (
          <div className="ev-details">
            {event.details.split(/\n{2,}/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}

        {open ? (
          <EventForm event={{ id: event.id, name: event.name, price: event.price }} />
        ) : (
          <div className="book-soldout">
            <span className="soldout-stamp">
              {left === 0 ? "Sold Out" : EVENT_STATUS_LABEL[event.status]}
            </span>
            <p>
              Booking isn&apos;t open for this one. See <a href="/events">what else is on</a>.
            </p>
          </div>
        )}
      </Reveal>
    </div>
  );
}
